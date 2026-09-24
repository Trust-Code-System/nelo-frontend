'use server';

import { revalidatePath } from 'next/cache';
import { assertMarket } from '@/lib/vendure/channels';
import { presentableMessage, vendureErrorCode } from '@/lib/vendure/errors';
import {
  CancelAppointmentDocument,
  RequestAppointmentDocument,
  type AppointmentLocationMode,
  type AppointmentPurpose,
  type CommissionContext,
} from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';
import type { FormState } from '@/features/account/state';

/**
 * Appointment requests and cancellation - the real Atelier Shop API.
 *
 * Booking is a request, not a reservation: the customer sends one preferred time and the
 * atelier confirms or reschedules it. There is no availability query and nothing is held.
 *
 * `RequestAppointmentInput` has no `measurements` or `projectId` field - both were dropped
 * from the frontend's original proposal. A second preference, or anything about the piece a
 * customer arrived to discuss, has nowhere else to go, so it is folded into `notes`.
 */

const NOTES_MAX = 2000;
const PURPOSES: readonly AppointmentPurpose[] = ['consultation', 'fitting'];
const CONTEXTS: readonly CommissionContext[] = ['bespoke', 'bridal', 'readyToWear'];
const LOCATION_MODES: readonly AppointmentLocationMode[] = ['inStore', 'customerLocation', 'virtual'];

function readEnum<T extends string>(form: FormData, field: string, allowed: readonly T[]): T | null {
  const raw = form.get(field);
  return typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

function readText(form: FormData, field: string, max: number): string {
  const value = form.get(field);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** Africa/Lagos has no daylight-saving transition, so the +01:00 offset is constant. */
const LAGOS_OFFSET = '+01:00';

/** Composes the customer's own request text - offset time is validated by the backend. */
function buildNotes(form: FormData): string {
  const occasion = readText(form, 'occasion', 120);
  const neededBy = readText(form, 'neededBy', 10);
  const piece = readText(form, 'piece', 120);
  const colour = readText(form, 'colour', 60);
  const size = readText(form, 'size', 40);
  const freeNotes = readText(form, 'notes', NOTES_MAX);

  const lines = [
    piece ? `Selected from the shop: ${[piece, colour, size ? `size ${size}` : ''].filter(Boolean).join(' - ')}` : '',
    occasion ? `Occasion: ${occasion}` : '',
    neededBy ? `Needed by: ${neededBy}` : '',
    freeNotes,
  ].filter(Boolean);

  return lines.join('\n').slice(0, NOTES_MAX);
}

export async function requestAppointment(_previous: FormState, form: FormData): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const purpose = readEnum(form, 'purpose', PURPOSES);
    const context = readEnum(form, 'context', CONTEXTS);
    const locationMode = readEnum(form, 'locationMode', LOCATION_MODES);
    const date = readText(form, 'preferredDate', 10);
    const time = readText(form, 'preferredTime', 5);

    if (!purpose) return { status: 'error', message: 'Choose consultation or fitting.' };
    if (!context) return { status: 'error', message: 'Choose what you are commissioning.' };
    if (!locationMode) return { status: 'error', message: 'Choose where.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return {
        status: 'error',
        message: 'Choose a preferred date and time.',
        fieldErrors: { preferredAt: 'Choose a preferred date and time.' },
      };
    }

    const preferredAt = `${date}T${time}:00${LAGOS_OFFSET}`;
    const notes = buildNotes(form) || null;

    const { data } = await vendureQuery(
      RequestAppointmentDocument,
      { input: { purpose, context, locationMode, preferredAt, notes } },
      { market },
    );
    const result = data.requestAppointment;

    if (result.__typename === 'AtelierAppointment') {
      revalidatePath(`/${market}/account/appointments`);
      return {
        status: 'success',
        message:
          'Request sent. We reply within two working days with a confirmed time and location - requesting does not reserve a slot.',
      };
    }
    // AppointmentRequestLimitError
    return {
      status: 'error',
      message: `You already have ${result.openRequestLimit} requests awaiting confirmation. Wait for one to be confirmed or cancel one before requesting another.`,
    };
  } catch (error) {
    if (vendureErrorCode(error) === 'FORBIDDEN') {
      return { status: 'error', message: 'Sign in to request a consultation.' };
    }
    return { status: 'error', message: presentableMessage(error) };
  }
}

export async function cancelAppointment(_previous: FormState, form: FormData): Promise<FormState> {
  const market = assertMarket(form.get('market'));
  try {
    const id = form.get('id');
    if (typeof id !== 'string' || id.trim() === '') {
      return { status: 'error', message: 'That appointment could not be identified.' };
    }

    await vendureQuery(CancelAppointmentDocument, { id }, { market });
    revalidatePath(`/${market}/account/appointments`);
    return { status: 'success', message: 'Appointment cancelled.' };
  } catch (error) {
    const code = vendureErrorCode(error);
    // Both a foreign/missing record and a state that changed underneath the request (a
    // second cancel, or the atelier acting first) mean the list is stale - refetch either way.
    if (code === 'FORBIDDEN' || code === 'ILLEGAL_OPERATION') {
      revalidatePath(`/${market}/account/appointments`);
    }
    if (code === 'FORBIDDEN') {
      return { status: 'error', message: 'That appointment could not be found.' };
    }
    return { status: 'error', message: presentableMessage(error) };
  }
}
