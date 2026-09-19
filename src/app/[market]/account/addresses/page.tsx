import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  AccountShell,
  AccountUnavailable,
  SignInRequired,
} from '@/features/account/AccountShell';
import { ActionForm } from '@/features/account/ActionForm';
import { addressFields } from '@/features/account/address-fields';
import { createAddress, deleteAddress, updateAddress } from '@/features/account/address-actions';
import { DeleteAddressButton } from '@/features/account/DeleteAddressButton';
import { isMarket, type Market } from '@/lib/vendure/channels';
import {
  ActiveCustomerAddressesDocument,
  AvailableCountriesDocument,
  type CustomerAddressFragment,
} from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export const metadata: Metadata = { title: 'Your addresses' };

/**
 * Address book.
 *
 * Every control here is a real form posting to a Server Action, and the list is
 * server-rendered from Vendure after each one. There is no client-side copy of the address
 * list to drift out of date, and an address saved here is the same record checkout reads —
 * which is the actual acceptance criterion, not that the form submits.
 */
export default async function AddressesPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  let addresses: CustomerAddressFragment[] | null = null;
  let countries: { code: string; name: string }[] = [];
  let signedIn = false;
  let reachable = true;

  try {
    // Both reads need the session, so neither can be cached. They are independent of each
    // other, so they go together.
    const [customerResult, countryResult] = await Promise.all([
      vendureQuery(ActiveCustomerAddressesDocument, {}, { market }),
      vendureQuery(AvailableCountriesDocument, {}, { market }),
    ]);
    const customer = customerResult.data.activeCustomer;
    signedIn = Boolean(customer);
    addresses = customer?.addresses ?? [];
    countries = countryResult.data.availableCountries.map((country) => ({
      code: country.code,
      name: country.name,
    }));
  } catch {
    reachable = false;
  }

  if (!reachable) {
    return (
      <AccountShell market={market} title="Your addresses" showNav={false}>
        <AccountUnavailable market={market} />
      </AccountShell>
    );
  }

  if (!signedIn) {
    return (
      <AccountShell market={market} title="Your addresses" showNav={false}>
        <SignInRequired
          market={market}
          returnTo={`/${market}/account/addresses`}
          reason="Sign in to manage your delivery addresses."
        />
      </AccountShell>
    );
  }

  const list = addresses ?? [];

  return (
    <AccountShell
      market={market}
      title="Your addresses"
      current="/addresses"
      meta={
        <span>
          {list.length} {list.length === 1 ? 'address' : 'addresses'}
        </span>
      }
    >
      {list.length === 0 ? (
        <p className="lead">
          No addresses saved yet. Adding one here means you will not have to type it at
          checkout.
        </p>
      ) : (
        <ul className="addr-list">
          {list.map((address) => (
            <li key={address.id}>
              <div className="addr-head">
                <h2>{address.fullName ?? 'Address'}</h2>
                <div className="addr-flags">
                  {address.defaultShippingAddress ? (
                    <span className="chip">Default delivery</span>
                  ) : null}
                  {address.defaultBillingAddress ? (
                    <span className="chip">Default billing</span>
                  ) : null}
                </div>
              </div>

              <address>
                {[
                  address.streetLine1,
                  address.streetLine2,
                  address.city,
                  address.province,
                  address.postalCode,
                  address.country.name,
                ]
                  .filter(Boolean)
                  .join(', ')}
                {address.phoneNumber ? <span className="num"> · {address.phoneNumber}</span> : null}
              </address>

              <div className="addr-acts">
                {/* A disclosure rather than a modal: the edit form is the same markup as
                    the add form and needs no client state to reveal. */}
                <details>
                  <summary>Edit</summary>
                  <div className="body">
                    <ActionForm
                      action={updateAddress}
                      hidden={{ market, id: address.id }}
                      fields={addressFieldsFor(market, countries, address)}
                      submitLabel="Save changes"
                      pendingLabel="Saving…"
                      submitClassName="btn-q"
                    />
                  </div>
                </details>
                <DeleteAddressButton market={market} id={address.id} action={deleteAddress} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <details className="addr-add" open={list.length === 0}>
        <summary>Add an address</summary>
        <div className="body">
          <div className="authwrap">
            <ActionForm
              action={createAddress}
              hidden={{ market }}
              fields={addressFieldsFor(market, countries)}
              submitLabel="Save address"
              pendingLabel="Saving…"
            />
          </div>
        </div>
      </details>
    </AccountShell>
  );
}

function addressFieldsFor(
  market: Market,
  countries: readonly { code: string; name: string }[],
  address?: CustomerAddressFragment,
) {
  return addressFields({
    market,
    countries,
    ...(address
      ? {
          values: {
            fullName: address.fullName,
            streetLine1: address.streetLine1,
            streetLine2: address.streetLine2,
            city: address.city,
            province: address.province,
            postalCode: address.postalCode,
            phoneNumber: address.phoneNumber,
            countryCode: address.country.code,
            defaultShippingAddress: address.defaultShippingAddress,
            defaultBillingAddress: address.defaultBillingAddress,
          },
        }
      : {}),
  });
}
