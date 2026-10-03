'use server';

import { revalidatePath } from 'next/cache';
import type { FormState } from '@/features/account/state';
import { assertMarket } from '@/lib/vendure/channels';
import { getActiveCustomer } from '@/lib/vendure/customer';
import { presentableMessage } from '@/lib/vendure/errors';
import { CancelAppointmentDocument, DeleteMeasurementProfileDocument, RequestAppointmentDocument, UpsertMeasurementProfileDocument } from '@/lib/vendure/generated/graphql';
import { writeSessionToken } from '@/lib/vendure/session';
import { vendureQuery } from '@/lib/vendure/transport';
import { appointmentInput, measurementInput, text } from './validation';

async function customerMarket(form: FormData) {
  const market = assertMarket(form.get('market'));
  const identity = await getActiveCustomer(market);
  if (!identity.reachable) throw new Error('Account unavailable');
  return { market, signedIn: Boolean(identity.customer) };
}
const signedOut: FormState = { status: 'error', message: 'Your session has ended. Sign in before submitting again.' };

export async function requestAppointment(_previous: FormState, form: FormData): Promise<FormState> {
  let market;
  try {
    const identity = await customerMarket(form);
    if (!identity.signedIn) return signedOut;
    market = identity.market;
  } catch {
    return { status: 'error', message: 'We cannot check your account right now. Please try again shortly.' };
  }
  const parsed = appointmentInput(form);
  if (parsed.errors) return { status: 'error', message: 'Check the appointment details.', fieldErrors: parsed.errors };
  try {
    const { data, authToken } = await vendureQuery(RequestAppointmentDocument, { input: parsed.input }, { market });
    const result = data.requestAppointment;
    if (result.__typename === 'AppointmentRequestLimitError') return { status: 'error', message: result.message };
    if (result.__typename !== 'AtelierAppointment') throw new Error('Unexpected appointment response');
    // A cookie refresh cannot undo an appointment already saved by Vendure.
    if (authToken) { try { await writeSessionToken(authToken); } catch { /* retain the existing session */ } }
  } catch {
    return { status: 'error', retryBlocked: true, message: 'We could not confirm your request. Check Account → Atelier before trying again, or contact client care.' };
  }
  // Revalidation failure must not turn a saved booking into an invitation to retry.
  try { revalidatePath(`/${market}/account/atelier`); } catch { /* account reads fresh data on the next visit */ }
  return { status: 'success', message: 'Your request has reached the atelier. Your preferred time is awaiting confirmation. View it in Account → Atelier.' };
}

export async function saveMeasurementProfile(_previous: FormState, form: FormData): Promise<FormState> {
  try {
    const { market, signedIn } = await customerMarket(form);
    if (!signedIn) return signedOut;
    const parsed = measurementInput(form);
    if (parsed.errors) return { status: 'error', message: 'Check your measurements.', fieldErrors: parsed.errors };
    const { data, authToken } = await vendureQuery(UpsertMeasurementProfileDocument, { input: parsed.input }, { market });
    if (authToken) await writeSessionToken(authToken);
    const result = data.upsertMeasurementProfile;
    switch (result.__typename) {
      case 'MeasurementFormatError':
      case 'MeasurementRangeError':
        return { status: 'error', message: result.message, fieldErrors: { [result.code]: result.message } };
      case 'MeasurementProfile':
        revalidatePath(`/${market}/account/measurements`);
        return { status: 'success', message: 'Your measurement profile is saved. Existing commissions keep their confirmed measurements.' };
    }
  } catch (error) {
    return { status: 'error', message: presentableMessage(error) };
  }
}

export async function cancelAppointment(_previous: FormState, form: FormData): Promise<FormState> {
  try {
    const { market, signedIn } = await customerMarket(form);
    if (!signedIn) return signedOut;
    const id = text(form, 'id');
    if (!id || id.length > 100) return { status: 'error', message: 'Choose an appointment to cancel.' };
    const { data, authToken } = await vendureQuery(CancelAppointmentDocument, { id }, { market });
    if (authToken) await writeSessionToken(authToken);
    if (data.cancelAppointment.status !== 'cancelled') return { status: 'error', message: 'The appointment was not cancelled. Contact the atelier.' };
    revalidatePath(`/${market}/account/atelier`, 'layout');
    return { status: 'success', message: 'Appointment cancelled.' };
  } catch {
    return { status: 'error', message: 'We could not confirm the cancellation. Refresh your appointments to check their latest status.' };
  }
}

export async function deleteMeasurementProfile(_previous: FormState, form: FormData): Promise<FormState> {
  try {
    const { market, signedIn } = await customerMarket(form);
    if (!signedIn) return signedOut;
    const id = text(form, 'id');
    if (!id || id.length > 100) return { status: 'error', message: 'Choose a profile to delete.' };
    const { data, authToken } = await vendureQuery(DeleteMeasurementProfileDocument, { id }, { market });
    if (authToken) await writeSessionToken(authToken);
    if (!data.deleteMeasurementProfile) return { status: 'error', message: 'This profile was not deleted. Refresh to check your profiles.' };
    revalidatePath(`/${market}/account/measurements`);
    return { status: 'success', message: 'Profile deleted. Confirmed commission measurements are retained.' };
  } catch (error) { return { status: 'error', message: presentableMessage(error) }; }
}
