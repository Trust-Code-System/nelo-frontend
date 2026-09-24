'use server';

import { revalidatePath } from 'next/cache';
import { assertMarket } from '@/lib/vendure/channels';
import { presentableMessage, vendureErrorCode } from '@/lib/vendure/errors';
import {
  DeleteMeasurementProfileDocument,
  UpsertMeasurementProfileDocument,
} from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';
import { MEASUREMENT_CODES } from '@/lib/atelier/measurements';
import type { FormState } from '@/features/account/state';

/**
 * Measurement profile mutations.
 *
 * `upsertMeasurementProfile` returns a union: a range or format error is a value to correct,
 * shown next to the field it names, never clamped or silently accepted. Nothing here is ever
 * written to a URL, browser storage, analytics or a shared cache - the values pass straight
 * from the form to Vendure and back.
 */

const NAME_MAX = 80;

function readUnit(form: FormData): 'inch' | 'centimetre' | null {
  const raw = form.get('preferredDisplayUnit');
  return raw === 'inch' || raw === 'centimetre' ? raw : null;
}

export async function saveMeasurementProfile(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const id = form.get('id');
    const name = String(form.get('name') ?? '').trim().slice(0, NAME_MAX);
    const preferredDisplayUnit = readUnit(form);
    const makeDefault = form.get('makeDefault') === 'on';

    if (name.length === 0) {
      return { status: 'error', message: 'Name this profile.', fieldErrors: { name: 'Name this profile.' } };
    }
    if (!preferredDisplayUnit) {
      return { status: 'error', message: 'Choose a unit.' };
    }

    const values = MEASUREMENT_CODES.map((code) => ({
      code,
      value: String(form.get(code) ?? '').trim(),
    })).filter((entry) => entry.value.length > 0);

    if (values.length === 0) {
      return { status: 'error', message: 'Enter at least one measurement.' };
    }

    const { data } = await vendureQuery(
      UpsertMeasurementProfileDocument,
      {
        input: {
          ...(typeof id === 'string' && id.trim() ? { id } : {}),
          name,
          preferredDisplayUnit,
          values,
          makeDefault,
        },
      },
      { market },
    );
    const result = data.upsertMeasurementProfile;

    if (result.__typename === 'MeasurementProfile') {
      revalidatePath(`/${market}/account/measurements`);
      return { status: 'success', message: 'Profile saved.' };
    }
    if (result.__typename === 'MeasurementRangeError') {
      return {
        status: 'error',
        message: result.message,
        fieldErrors: {
          [result.code]: `${result.message} (${result.plausibleMinMillimetres}-${result.plausibleMaxMillimetres} mm)`,
        },
      };
    }
    // MeasurementFormatError
    return {
      status: 'error',
      message: result.message,
      fieldErrors: { [result.code]: result.message },
    };
  } catch (error) {
    if (vendureErrorCode(error) === 'FORBIDDEN') {
      return {
        status: 'error',
        message: 'Sign in to save your measurements, or that profile could not be found.',
      };
    }
    return { status: 'error', message: presentableMessage(error) };
  }
}

export async function deleteMeasurementProfile(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const market = assertMarket(form.get('market'));
    const id = form.get('id');
    if (typeof id !== 'string' || id.trim() === '') {
      return { status: 'error', message: 'That profile could not be identified.' };
    }

    await vendureQuery(DeleteMeasurementProfileDocument, { id }, { market });
    revalidatePath(`/${market}/account/measurements`);
    return { status: 'success', message: 'Profile removed.' };
  } catch (error) {
    if (vendureErrorCode(error) === 'FORBIDDEN') {
      return { status: 'error', message: 'That profile could not be found.' };
    }
    return { status: 'error', message: presentableMessage(error) };
  }
}
