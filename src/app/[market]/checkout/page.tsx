import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { ActionForm } from '@/features/account/ActionForm';
import { addressFields } from '@/features/account/address-fields';
import {
  applyCoupon,
  setCheckoutCustomer,
  setCheckoutShippingAddress,
} from '@/features/checkout/actions';
import {
  devPaymentEnabled,
  internationalCheckoutEnabled,
  isPaystackMethod,
} from '@/features/checkout/config';
import { PlaceOrder } from '@/features/checkout/PlaceOrder';
import { ShippingChoice } from '@/features/checkout/ShippingChoice';
import { resolveStep, STEP_LABELS, STEPS, stepState } from '@/features/checkout/states';
import { formatMoney, isMarket, type Market } from '@/lib/vendure/channels';
import {
  ActiveCustomerAddressesDocument,
  ActiveOrderForCheckoutDocument,
  AvailableCountriesDocument,
  EligiblePaymentMethodsDocument,
  EligibleShippingMethodsDocument,
  type CustomerAddressFragment,
  type CustomerIdentityFragment,
  type OrderDetailFragment,
} from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

// Checkout is the most personal surface on the site. Nothing about it may be cached or
// prerendered, and the declaration is explicit rather than incidental to a dynamic param.
export const dynamic = 'force-dynamic';
export const fetchCache = 'only-no-store';

/**
 * Checkout.
 *
 * Server-first and stepped, with the step derived from the order rather than held in the
 * browser. Each step posts to a Server Action, the action re-reads the order, and the page
 * re-renders from what Vendure now says. There is no client-side model of the checkout to
 * disagree with the store.
 *
 * The order of operations is Vendure's: customer → shipping address → eligible shipping
 * methods → shipping method → ArrangingPayment → eligible payment methods → payment.
 *
 * Payment is the one part that is not finished, and the reason is external: the Paystack
 * initialise-payment operation does not exist on the backend yet. Everything up to it is
 * real. Against the local harness the development handler completes the flow end to end;
 * in any other deployment the review step says plainly that payment is not connected.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ market: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  const raw = await searchParams;
  const requestedStep = Array.isArray(raw.step) ? raw.step[0] : raw.step;

  // The gate is checked before anything is read: an order that cannot be paid for should not
  // start collecting an address.
  if (market === 'international' && !internationalCheckoutEnabled()) {
    return <Gated market={market} />;
  }

  let order: OrderDetailFragment | null = null;
  let customer: CustomerIdentityFragment | null = null;
  let addresses: CustomerAddressFragment[] = [];
  let countries: { code: string; name: string }[] = [];
  let reachable = true;

  try {
    const [orderResult, customerResult, countryResult] = await Promise.all([
      vendureQuery(ActiveOrderForCheckoutDocument, {}, { market }),
      vendureQuery(ActiveCustomerAddressesDocument, {}, { market }),
      vendureQuery(AvailableCountriesDocument, {}, { market }),
    ]);
    order = orderResult.data.activeOrder;
    customer = customerResult.data.activeCustomer ?? null;
    addresses = customerResult.data.activeCustomer?.addresses ?? [];
    countries = countryResult.data.availableCountries.map((country) => ({
      code: country.code,
      name: country.name,
    }));
  } catch {
    reachable = false;
  }

  if (!reachable) {
    return (
      <Frame market={market}>
        <div className="empty">
          <span className="lab">Temporarily unavailable</span>
          <h2>We cannot reach the store right now</h2>
          <p>Nothing has been charged and your bag is unchanged. Try again in a moment.</p>
          <Link className="btn-q" href={`/${market}/cart`}>
            Back to your bag
          </Link>
        </div>
      </Frame>
    );
  }

  if (!order || order.lines.length === 0) {
    return (
      <Frame market={market}>
        <div className="empty">
          <span className="lab">Your bag</span>
          <h2>There is nothing to check out</h2>
          <p>Add a piece to your bag and it will wait here for you.</p>
          <Link className="btn-q" href={`/${market}`}>
            View the collection
          </Link>
        </div>
      </Frame>
    );
  }

  const signedIn = Boolean(customer);
  const state = stepState(order, signedIn);
  const step = resolveStep(requestedStep, state);

  // Shipping options are only read when they are about to be shown: the query is meaningless
  // before there is an address, and asking for it earlier would return an empty list that
  // reads like "we do not deliver to you".
  let shippingMethods: { id: string; name: string; description: string; price: string }[] = [];
  if (step === 'shipping' || step === 'review') {
    try {
      const { data } = await vendureQuery(EligibleShippingMethodsDocument, {}, { market });
      shippingMethods = data.eligibleShippingMethods.map((method) => ({
        id: method.id,
        name: method.name,
        description: method.description,
        price: method.priceWithTax === 0 ? 'Included' : formatMoney(method.priceWithTax, market),
      }));
    } catch {
      shippingMethods = [];
    }
  }

  // What Vendure will actually accept as payment for THIS order. Read only on review, and
  // read rather than assumed — an eligibility checker can rule a method out per order.
  let paymentMethods: { code: string; name: string; isEligible: boolean; message: string | null }[] =
    [];
  if (step === 'review') {
    try {
      const { data } = await vendureQuery(EligiblePaymentMethodsDocument, {}, { market });
      paymentMethods = data.eligiblePaymentMethods.map((method) => ({
        code: method.code,
        name: method.name,
        isEligible: method.isEligible,
        message: method.eligibilityMessage ?? null,
      }));
    } catch {
      paymentMethods = [];
    }
  }

  const devPath = devPaymentEnabled();
  const selectedShippingId = order.shippingLines[0]?.shippingMethod.id;
  const defaultAddress =
    addresses.find((address) => address.defaultShippingAddress) ?? addresses[0];

  return (
    <Frame market={market}>
      <nav className="costeps" aria-label="Checkout steps">
        <ol>
          {STEPS.map((candidate, index) => {
            const reached = STEPS.indexOf(candidate) <= STEPS.indexOf(state.furthest);
            const done = state.completed.has(candidate);
            return (
              <li
                key={candidate}
                className={candidate === step ? 'now' : done ? 'done' : undefined}
                aria-current={candidate === step ? 'step' : undefined}
              >
                <span className="n">{String(index + 1).padStart(2, '0')}</span>
                {reached && candidate !== step ? (
                  <Link className="t" href={`/${market}/checkout?step=${candidate}`}>
                    {STEP_LABELS[candidate]}
                  </Link>
                ) : (
                  <span className="t">{STEP_LABELS[candidate]}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="colayout">
        <div className="costep">
          {step === 'details' ? (
            <>
              <h2 className="ordsub">Your details</h2>
              <p className="lead">
                We need an email address to send your receipt to. You do not need an account —{' '}
                <Link href={`/${market}/account/login?next=${encodeURIComponent(`/${market}/checkout`)}`}>
                  sign in
                </Link>{' '}
                if you have one and your saved addresses will be here.
              </p>
              <ActionForm
                action={setCheckoutCustomer}
                hidden={{ market }}
                fields={[
                  {
                    name: 'firstName',
                    label: 'First name',
                    autoComplete: 'given-name',
                    required: true,
                    half: true,
                  },
                  {
                    name: 'lastName',
                    label: 'Last name',
                    autoComplete: 'family-name',
                    required: true,
                    half: true,
                  },
                  {
                    name: 'emailAddress',
                    label: 'Email',
                    type: 'email',
                    inputMode: 'email',
                    autoComplete: 'email',
                    required: true,
                  },
                  {
                    name: 'phoneNumber',
                    label: 'Phone (optional)',
                    type: 'tel',
                    inputMode: 'tel',
                    autoComplete: 'tel',
                    help: 'Used only if the courier needs to reach you.',
                  },
                ]}
                submitLabel="Continue to delivery"
                pendingLabel="Saving…"
              />
            </>
          ) : null}

          {step === 'address' ? (
            <>
              <h2 className="ordsub">Delivery address</h2>
              {defaultAddress ? (
                <p className="lead">
                  Your saved address is filled in below. Changing it here changes this order
                  only — your address book is edited from{' '}
                  <Link href={`/${market}/account/addresses`}>your account</Link>.
                </p>
              ) : null}
              <ActionForm
                action={setCheckoutShippingAddress}
                hidden={{ market }}
                fields={addressFields({
                  market,
                  countries,
                  includeDefaults: false,
                  ...(defaultAddress
                    ? {
                        values: {
                          fullName:
                            defaultAddress.fullName ??
                            (customer ? `${customer.firstName} ${customer.lastName}` : null),
                          streetLine1: defaultAddress.streetLine1,
                          streetLine2: defaultAddress.streetLine2,
                          city: defaultAddress.city,
                          province: defaultAddress.province,
                          postalCode: defaultAddress.postalCode,
                          phoneNumber: defaultAddress.phoneNumber,
                          countryCode: defaultAddress.country.code,
                        },
                      }
                    : {}),
                })}
                submitLabel="Continue to delivery method"
                pendingLabel="Saving…"
              />
            </>
          ) : null}

          {step === 'shipping' ? (
            <>
              <h2 className="ordsub">Delivery method</h2>
              <p className="lead">
                These are the methods that cover the address you gave. The price is the
                store&rsquo;s, calculated for this bag.
              </p>
              <ShippingChoice
                market={market}
                methods={shippingMethods}
                selectedId={selectedShippingId}
              />
            </>
          ) : null}

          {step === 'review' ? (
            <ReviewStep
              market={market}
              order={order}
              devPath={devPath}
              paymentMethods={paymentMethods}
            />
          ) : null}
        </div>

        {/* A div rather than an <aside>: a complementary landmark nested inside <main>
            is flagged, and an order summary is part of the checkout rather than an aside
            to it. */}
        <div className="cosum">
          <h2 className="ordsub">Your order</h2>
          <ul className="cosum-lines">
            {order.lines.map((line) => (
              <li key={line.id}>
                <span>
                  {line.productVariant.name}
                  <span className="lab"> × {line.quantity}</span>
                </span>
                <span className="num">
                  {formatMoney(line.discountedLinePriceWithTax, market)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="cart-totals" style={{ marginLeft: 0, maxWidth: 'none' }}>
            <div className="spec">
              <dt>Subtotal</dt>
              <dd>{formatMoney(order.subTotalWithTax, market)}</dd>
            </div>
            {order.discounts.map((discount) => (
              <div className="spec" key={discount.description}>
                <dt>{discount.description}</dt>
                <dd>{formatMoney(discount.amountWithTax, market)}</dd>
              </div>
            ))}
            <div className="spec">
              <dt>Shipping</dt>
              <dd>
                {order.shippingLines.length === 0
                  ? 'Not chosen yet'
                  : formatMoney(order.shippingWithTax, market)}
              </dd>
            </div>
            <div className="spec total">
              <dt>Total</dt>
              <dd>{formatMoney(order.totalWithTax, market)}</dd>
            </div>
          </dl>

          <p className="mnote">
            Every figure here is calculated by the store. Your browser never sends a total,
            and it could not — the payment call has no amount field.
          </p>

          <Link className="btn-q" href={`/${market}/cart`} style={{ marginTop: 'var(--s4)' }}>
            Edit your bag
          </Link>
        </div>
      </div>
    </Frame>
  );
}

function ReviewStep({
  market,
  order,
  devPath,
  paymentMethods,
}: {
  market: Market;
  order: OrderDetailFragment;
  devPath: boolean;
  paymentMethods: readonly {
    code: string;
    name: string;
    isEligible: boolean;
    message: string | null;
  }[];
}) {
  const address = order.shippingAddress;
  const paystack = paymentMethods.find((method) => isPaystackMethod(method.code));
  const devMethod = paymentMethods.find(
    (method) => !isPaystackMethod(method.code) && method.isEligible,
  );

  return (
    <>
      <h2 className="ordsub">Review</h2>

      <dl className="ordmeta">
        <div className="spec">
          <dt>Email</dt>
          <dd>{order.customer?.emailAddress ?? '—'}</dd>
        </div>
        <div className="spec">
          <dt>Deliver to</dt>
          <dd>
            {[address?.streetLine1, address?.city, address?.country].filter(Boolean).join(', ') ||
              '—'}
          </dd>
        </div>
        <div className="spec">
          <dt>Method</dt>
          <dd>{order.shippingLines[0]?.shippingMethod.name ?? '—'}</dd>
        </div>
      </dl>

      <div className="acts-row">
        <Link className="cart-remove lab" href={`/${market}/checkout?step=address`}>
          Change address
        </Link>
        <Link className="cart-remove lab" href={`/${market}/checkout?step=shipping`}>
          Change delivery method
        </Link>
      </div>

      <details className="section-gap">
        <summary>Have a code?</summary>
        <div className="body">
          <ActionForm
            action={applyCoupon}
            hidden={{ market }}
            fields={[{ name: 'couponCode', label: 'Promotion code' }]}
            submitLabel="Apply code"
            pendingLabel="Checking…"
            submitClassName="btn-q"
          />
          {order.couponCodes.length > 0 ? (
            <p className="mnote">Applied: {order.couponCodes.join(', ')}</p>
          ) : null}
        </div>
      </details>

      <div className="section-gap">
        {devPath && devMethod ? (
          <PlaceOrder
            market={market}
            payable={formatMoney(order.totalWithTax, market)}
            devPath
          />
        ) : (
          <div className="empty" style={{ textAlign: 'left', alignItems: 'flex-start' }}>
            <span className="lab">Payment not connected</span>
            <h2>We cannot take payment yet</h2>
            <p>
              Everything up to this point is real and saved against your order. What is
              missing is the payment step itself:{' '}
              {paystack
                ? `Paystack is configured on the store as "${paystack.name}", but the operation that starts a Paystack transaction does not exist on the Shop API yet.`
                : 'no payment method the store will accept for this order is connected to a working payment flow yet.'}{' '}
              We will not show you a receipt for money that has not moved.
            </p>
            <div className="acts-row">
              <Link className="btn-q" href={`/${market}/contact`}>
                Order by message instead
              </Link>
            </div>
          </div>
        )}
      </div>

      <p className="mnote">
        Placing an order authorises the total above and nothing else. Cut-to-measure pieces
        are returnable for alteration rather than refund.
      </p>
    </>
  );
}

function Frame({ market, children }: { market: Market; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader market={market} announcement="Checkout — every total is calculated by the store" />
      <main className="shell">
        <div className="proj-head">
          <div>
            <span className="lab">Checkout</span>
            <h1>Complete your order</h1>
          </div>
        </div>
        <section className="section-gap">{children}</section>
      </main>

      <SiteFooter market={market} />
    </>
  );
}

/**
 * International checkout, gated.
 *
 * Not an error and not a 404: the market exists, the catalogue is real and the prices are
 * the Channel's. What is unproven is that the payment account can settle US dollars, and
 * quietly charging the naira amount instead would be the worst possible resolution of that.
 */
function Gated({ market }: { market: Market }) {
  return (
    <Frame market={market}>
      <div className="empty" style={{ textAlign: 'left', alignItems: 'flex-start' }}>
        <span className="lab">Not open yet</span>
        <h2>International checkout is not open</h2>
        <p>
          You can browse and price everything in US dollars, and the atelier takes
          international commissions today. What we have not yet confirmed is that our payment
          provider can settle in dollars — so rather than charge you in naira without saying
          so, we have left this closed.
        </p>
        <div className="acts-row">
          <Link className="btn" href={`/${market}/contact`}>
            Order by message
          </Link>
          <Link className="btn-q" href="/ng/cart">
            Switch to the Nigeria store
          </Link>
        </div>
      </div>
    </Frame>
  );
}
