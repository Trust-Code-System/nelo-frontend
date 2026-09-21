import Link from 'next/link';
import { DirectLinkMark } from './DirectLinkMark';
import type { Market } from '@/lib/vendure/channels';

/**
 * House notes and the mailing list.
 *
 * This used to sit in the site footer, which made every page close on a campaign pitch.
 * Collections is the place that pitch belongs: after the archive, before the footer.
 */
export function HouseNotes({ market }: { market: Market }) {
  return (
    <section className="house-notes" aria-labelledby="house-notes-title">
      <div className="house-notes__lead">
        <p>Clothing with presence, cut in Lagos and made to remember you.</p>
        <Link className="house-notes__cta" href={`/${market}/shop`}>
          Enter the collection <DirectLinkMark />
        </Link>
      </div>
      <div className="house-notes__signup">
        <span className="lab">Notes from the house</span>
        <h2 id="house-notes-title">New collections, fittings and stories from Lagos.</h2>
        <form action={`/${market}/contact`} method="get">
          <input type="hidden" name="subject" value="Newsletter" />
          <label className="sr" htmlFor="house-notes-email">Email address</label>
          <input
            id="house-notes-email"
            type="email"
            name="email"
            placeholder="Email address"
            autoComplete="email"
            required
          />
          <button type="submit">Join the list <DirectLinkMark /></button>
        </form>
        <p>Occasional notes only. No noise, and you can leave at any time.</p>
      </div>
    </section>
  );
}
