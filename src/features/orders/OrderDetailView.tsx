import Image from 'next/image';
import Link from 'next/link';
import { dateZoneLabel, formatOrderDate, orderState } from './presentation';
import { assetPreview } from '@/lib/vendure/assets';
import { formatMoney, type Market } from '@/lib/vendure/channels';
import type { OrderDetailFragment } from '@/lib/vendure/generated/graphql';

/**
 * One order, rendered from Vendure's own record.
 *
 * Shared by the account history and the post-checkout confirmation, because they should show
 * the same thing — a confirmation that renders a different, friendlier version of the order
 * is how a customer ends up believing something was paid that was not.
 *
 * Every figure comes from the Order. Nothing is summed here: not the line totals, not the
 * shipping, not the tax. A frontend that can add up a cart can also disagree with the store,
 * and the store is right.
 */
export function OrderDetailView({
  order,
  market,
}: {
  order: OrderDetailFragment;
  market: Market;
}) {
  const state = orderState(order.state);
  const address = order.shippingAddress;

  return (
    <>
      <dl className="ordmeta">
        <div className="spec">
          <dt>Order</dt>
          <dd>{order.code}</dd>
        </div>
        <div className="spec">
          <dt>Placed</dt>
          <dd>{formatOrderDate(order.orderPlacedAt ?? order.createdAt, market)}</dd>
        </div>
        <div className="spec">
          <dt>State</dt>
          <dd>{state.label}</dd>
        </div>
      </dl>
      {state.note ? <p className="mnote">{state.note}</p> : null}

      <ul className="cart-lines section-gap">
        {order.lines.map((line) => (
          <li key={line.id}>
            <div className="ph framed">
              {line.featuredAsset ? (
                <Image
                  src={assetPreview(line.featuredAsset.preview, { width: 200, height: 260 })}
                  alt={line.productVariant.name}
                  width={200}
                  height={260}
                  sizes="120px"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
            </div>
            <div className="cart-detail">
              <Link href={`/${market}/products/${line.productVariant.product.slug}`}>
                <h2>{line.productVariant.name}</h2>
              </Link>
              <p className="lab">{line.productVariant.sku}</p>
              {line.productVariant.options.length > 0 ? (
                <p className="lab">
                  {line.productVariant.options.map((option) => option.name).join(' · ')}
                </p>
              ) : null}
            </div>
            <div className="cart-qty">
              <span className="num">× {line.quantity}</span>
            </div>
            <div className="cart-price num">
              {formatMoney(line.discountedLinePriceWithTax, market)}
            </div>
          </li>
        ))}
      </ul>

      <div className="ordcols">
        <div>
          <h2 className="ordsub">Delivery</h2>
          {address?.streetLine1 ? (
            <address>
              {address.fullName ? (
                <>
                  {address.fullName}
                  <br />
                </>
              ) : null}
              {[
                address.streetLine1,
                address.streetLine2,
                address.city,
                address.province,
                address.postalCode,
                address.country,
              ]
                .filter(Boolean)
                .join(', ')}
              {address.phoneNumber ? (
                <>
                  <br />
                  <span className="num">{address.phoneNumber}</span>
                </>
              ) : null}
            </address>
          ) : (
            <p className="mnote">No delivery address on this order.</p>
          )}

          {order.shippingLines.length > 0 ? (
            <p className="mnote">
              {order.shippingLines
                .map((line) => line.shippingMethod.name)
                .join(' · ')}
            </p>
          ) : null}
        </div>

        <div>
          <h2 className="ordsub">Payment</h2>
          {order.payments && order.payments.length > 0 ? (
            <dl className="ordmeta">
              {order.payments.map((payment) => (
                <div className="spec" key={payment.id}>
                  <dt>{payment.method}</dt>
                  <dd>
                    {payment.state} · {formatMoney(payment.amount, market)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mnote">No payment has been recorded against this order yet.</p>
          )}
          <p className="mnote">
            Payment state is the store&rsquo;s record, not a message from your browser.
          </p>
        </div>
      </div>

      <dl className="cart-totals">
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
          <dd>{formatMoney(order.shippingWithTax, market)}</dd>
        </div>
        <div className="spec total">
          <dt>Total</dt>
          <dd>{formatMoney(order.totalWithTax, market)}</dd>
        </div>
      </dl>

      <p className="mnote">{dateZoneLabel(market)}</p>
    </>
  );
}
