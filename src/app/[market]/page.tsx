import { notFound } from 'next/navigation';
import { isMarket } from '@/lib/vendure/channels';

/**
 * Home. A server-rendered shell.
 *
 * Deliberately not wired to Vendure yet: the Shop API is a verified pre-migration
 * foundation, so there is no seeded catalogue to read. The visual design for this page
 * is in design/mockups/home.html and lands here in phase 2.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  // Route components signal an unknown market with notFound(), never by throwing —
  // a thrown error races the layout's notFound() and surfaces as a 500.
  const { market } = await params;
  if (!isMarket(market)) notFound();

  return (
    <main className="shell">
      <section style={{ paddingBlock: 'var(--s9)' }}>
        <span className="lab">Phase 1 — foundation</span>
        <h1 style={{ fontSize: 'var(--t-2xl)', fontWeight: 600, letterSpacing: '-.022em' }}>
          Nelo Storefront
        </h1>
        <p style={{ color: 'var(--smoke)', maxWidth: '52ch' }}>
          The design system, transport and session layers are in place. Catalogue rendering
          waits on a reachable Shop API with seeded fixtures.
        </p>
        <dl className="mlist" style={{ marginTop: 'var(--s6)', maxWidth: '38rem' }}>
          <div className="spec">
            <dt>Market</dt>
            <span className="led" />
            <dd>{market}</dd>
          </div>
          <div className="spec">
            <dt>Catalogue</dt>
            <span className="led" />
            <dd>Awaiting schema</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
