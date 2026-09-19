import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { CartLines } from '@/features/cart/CartLines';
import { formatMoney, isMarket } from '@/lib/vendure/channels';
import { ActiveOrderDocument } from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export const metadata: Metadata = { title: 'Your bag' };

/**
 * Cart.
 *
 * Read with the session attached and never cached — a cart is the most personal thing on
 * the site and must never be shared between visitors.
 */
export const dynamic = 'force-dynamic';
export const fetchCache = 'only-no-store';

export default async function CartPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  let cart = null;
  let unreachable = false;
  try {
    const { data } = await vendureQuery(ActiveOrderDocument, {}, { market });
    cart = data.activeOrder;
  } catch {
    unreachable = true;
  }

  // Formatting stays on the server so the client island never needs currency rules.
  const prices: Record<string, string> = {};
  if (cart) {
    for (const line of cart.lines) {
      prices[line.id] = formatMoney(line.linePriceWithTax, market);
    }
    prices.__subTotal = formatMoney(cart.subTotalWithTax, market);
    prices.__shipping =
      cart.shippingWithTax > 0 ? formatMoney(cart.shippingWithTax, market) : 'At checkout';
    prices.__total = formatMoney(cart.totalWithTax, market);
  }

  return (
    <>
      <SiteHeader market={market} announcement="Complimentary shipping within Nigeria over ₦150,000" />

      <main className="shell">
        <div className="proj-head">
          <div>
            <span className="lab">Bag</span>
            <h1>Your bag</h1>
          </div>
          {cart ? (
            <div className="proj-meta">
              <span>
                {cart.totalQuantity} {cart.totalQuantity === 1 ? 'item' : 'items'}
              </span>
            </div>
          ) : null}
        </div>

        <section style={{ paddingBlock: 'var(--s7)' }}>
          {unreachable ? (
            <div className="empty">
              <span className="lab">Temporarily unavailable</span>
              <h2>We cannot reach your bag right now</h2>
              <p>Nothing has been lost. Try again in a moment.</p>
              <Link className="btn-q" href={`/${market}`}>
                Continue shopping
              </Link>
            </div>
          ) : cart ? (
            <>
              <CartLines cart={cart} market={market} prices={prices} />
              <div className="acts-row">
                <Link className="btn" href={`/${market}/checkout`}>
                  Checkout
                </Link>
                <Link className="btn-q" href={`/${market}`}>
                  Continue shopping
                </Link>
              </div>
            </>
          ) : (
            <div className="empty">
              <span className="lab">Your bag</span>
              <h2>Nothing in your bag yet</h2>
              <p>Pieces you add will wait here while you keep looking.</p>
              <Link className="btn-q" href={`/${market}`}>
                Continue shopping
              </Link>
            </div>
          )}
        </section>

        <SiteFooter market={market} />
      </main>
    </>
  );
}
