import { ActiveOrderDocument } from '@/lib/vendure/generated/graphql';
import type { Market } from '@/lib/vendure/channels';
import { vendureQuery } from '@/lib/vendure/transport';

/**
 * The bag count in the header.
 *
 * An async Server Component rather than a client island, so no cart data reaches the browser
 * as state and there is nothing to keep in sync. It is rendered inside a `<Suspense>`
 * boundary in the header: the page does not wait on this read, and a slow or unreachable
 * Vendure costs the header a number rather than costing the visitor the whole page.
 *
 * Note the cost this accepts: reading the session makes the surrounding route dynamic. The
 * catalogue fetch itself is still cached through `catalogueQuery`, so what is given up is
 * the cached HTML, not the cached data — and a storefront that shows every visitor the same
 * cached bag count would be worse than one that renders per request.
 *
 * No count is shown for an empty bag. A "0" is noise.
 */
export async function CartCount({ market }: { market: Market }) {
  // The read is wrapped, the render is not: JSX built inside a `catch`-guarded block hides
  // render-time failures from the error boundary above it, which is what the lint rule is
  // for. An unreachable store is not an empty bag, but the header is not the place to say
  // so — the bag page itself distinguishes the two.
  const quantity = await readQuantity(market);
  if (quantity === 0) return null;

  return (
    <span className="bagcount num" aria-label={`${quantity} in your bag`}>
      {quantity}
    </span>
  );
}

async function readQuantity(market: Market): Promise<number> {
  try {
    const { data } = await vendureQuery(ActiveOrderDocument, {}, { market });
    return data.activeOrder?.totalQuantity ?? 0;
  } catch {
    return 0;
  }
}
