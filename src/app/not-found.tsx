import Link from 'next/link';
import { DEFAULT_MARKET } from '@/lib/vendure/channels';

export default function NotFound() {
  return (
    <main className="shell" style={{ paddingBlock: 'var(--s9)' }}>
      <span className="lab">404</span>
      <h1 style={{ fontSize: 'var(--t-xl)', fontWeight: 600 }}>We could not find that page</h1>
      <p style={{ color: 'var(--smoke)', maxWidth: '46ch' }}>
        The link may be wrong, or the region in the address may not be one we ship to.
      </p>
      <Link className="btn-q" href={`/${DEFAULT_MARKET}`}>
        Back to the store
      </Link>
    </main>
  );
}
