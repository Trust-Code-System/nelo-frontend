import type { FieldSpec } from './ActionForm';
import type { Market } from '@/lib/vendure/channels';

/**
 * The address form, shaped for Nigeria first.
 *
 * This is not cosmetic. A form built around "Address line 2 / ZIP code" makes a Lagos
 * delivery harder than it needs to be: the landmark is how a courier actually finds a
 * street in Ikoyi, and a Nigerian postcode is frequently not known and never needed. So in
 * the `ng` market the landmark is a first-class field and the postcode is optional; in
 * `international` the labels revert to the generic ones and the postcode carries more weight.
 *
 * The country list comes from Vendure's `availableCountries` for the Channel. Nothing here
 * hardcodes which countries exist, and the selected country is validated again server-side.
 */

export type AddressValues = {
  fullName?: string | null;
  streetLine1?: string | null;
  streetLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  phoneNumber?: string | null;
  countryCode?: string | null;
  defaultShippingAddress?: boolean | null;
  defaultBillingAddress?: boolean | null;
};

export type CountryOption = { code: string; name: string };

/** Nigeria's own market defaults to Nigeria; the international market makes no guess. */
export function defaultCountryCode(market: Market): string {
  return market === 'ng' ? 'NG' : '';
}

export function addressFields({
  market,
  countries,
  values,
  /** Checkout collects a shipping address for one order and has no "default address"
   *  concept, so those two checkboxes belong to the address book only. */
  includeDefaults = true,
}: {
  market: Market;
  countries: readonly CountryOption[];
  values?: AddressValues;
  includeDefaults?: boolean;
}): FieldSpec[] {
  const isNigeria = market === 'ng';
  const options = [
    ...(defaultCountryCode(market) ? [] : [{ value: '', label: 'Choose a country' }]),
    ...countries.map((country) => ({ value: country.code, label: country.name })),
  ];

  const fields: FieldSpec[] = [
    {
      name: 'fullName',
      label: 'Full name',
      autoComplete: 'name',
      defaultValue: values?.fullName ?? '',
      help: 'Whoever will receive the parcel.',
    },
    {
      name: 'streetLine1',
      label: 'Street address',
      autoComplete: 'address-line1',
      required: true,
      defaultValue: values?.streetLine1 ?? '',
    },
    {
      name: 'streetLine2',
      label: isNigeria ? 'Landmark, apartment or estate' : 'Apartment, suite or unit',
      autoComplete: 'address-line2',
      defaultValue: values?.streetLine2 ?? '',
      ...(isNigeria
        ? { help: 'The nearest landmark is often what actually gets a courier to the door.' }
        : {}),
    },
    {
      name: 'city',
      label: isNigeria ? 'City or town' : 'City',
      autoComplete: 'address-level2',
      required: true,
      half: true,
      defaultValue: values?.city ?? '',
    },
    {
      name: 'province',
      label: isNigeria ? 'State' : 'State, province or region',
      autoComplete: 'address-level1',
      half: true,
      defaultValue: values?.province ?? '',
    },
    {
      name: 'postalCode',
      label: isNigeria ? 'Postcode (optional)' : 'Postal code',
      autoComplete: 'postal-code',
      half: true,
      defaultValue: values?.postalCode ?? '',
    },
    {
      name: 'phoneNumber',
      label: 'Phone',
      type: 'tel',
      inputMode: 'tel',
      autoComplete: 'tel',
      half: true,
      defaultValue: values?.phoneNumber ?? '',
      help: 'For delivery only.',
    },
    {
      name: 'countryCode',
      label: 'Country',
      type: 'select',
      autoComplete: 'country',
      options,
      defaultValue: values?.countryCode ?? defaultCountryCode(market),
    },
  ];

  if (includeDefaults) {
    fields.push(
      {
        name: 'defaultShippingAddress',
        label: 'Use this as my default delivery address',
        type: 'checkbox',
        ...(values?.defaultShippingAddress ? { defaultValue: 'on' } : {}),
      },
      {
        name: 'defaultBillingAddress',
        label: 'Use this as my default billing address',
        type: 'checkbox',
        ...(values?.defaultBillingAddress ? { defaultValue: 'on' } : {}),
      },
    );
  }

  return fields;
}
