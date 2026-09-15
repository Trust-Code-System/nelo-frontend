/**
 * Account boundary.
 *
 * Everything below this segment is customer data — orders, addresses, measurements,
 * appointments. The backend context requires it to stay private and uncached across users,
 * and never to appear in static rendering output.
 *
 * `force-dynamic` states that guarantee explicitly rather than leaving it to the incidental
 * dynamism of a route parameter: a future page with no dynamic segment would otherwise be
 * prerendered at build time and served to everyone.
 */
export const dynamic = 'force-dynamic';
export const fetchCache = 'only-no-store';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
