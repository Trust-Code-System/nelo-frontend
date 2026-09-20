import Link from 'next/link';
import { BrandMark } from './BrandMark';
import { DirectLinkMark } from './DirectLinkMark';
import type { Market } from '@/lib/vendure/channels';
import { STORE_CONTACT } from '@/lib/contact';

/**
 * The footer column headings are h2, not h4.
 *
 * They were h4 while every page heading around them was h1, which skips two levels and
 * leaves a screen reader's outline with holes in it. These sections are siblings of the
 * page's own content sections, so h2 is what they actually are.
 */
export function SiteFooter({ market }: { market: Market }) {
  return (
    // Outside <main>, so this is a real `contentinfo` landmark. A <footer> nested inside
    // <main> is not one - the role only applies at the top level - and contentinfo is one of
    // the landmarks screen-reader users navigate by most. It carries its own shell because it
    // is no longer inside the page's.
    <footer className="sitefoot">
      <div className="shell">
        <div className="footer-top">
          <div className="footer-lead">
            <BrandMark href={`/${market}`} footer />
            <p>Clothing with presence, cut in Lagos and made to remember you.</p>
            <Link className="footer-lead__cta" href={`/${market}/collections`}>
              Enter the collection <DirectLinkMark />
            </Link>
          </div>

          <section className="footer-newsletter" aria-labelledby="footer-newsletter-title">
            <div>
              <span className="lab">Notes from the house</span>
              <h2 id="footer-newsletter-title" data-motion-words>New collections, fittings and stories from Lagos.</h2>
            </div>
            <form action={`/${market}/contact`} method="get">
              <input type="hidden" name="subject" value="Newsletter" />
              <label className="sr" htmlFor="newsletter-email">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                name="email"
                placeholder="Email address"
                autoComplete="email"
                required
              />
              <button type="submit">Join the list <DirectLinkMark /></button>
            </form>
            <p>Occasional notes only. No noise, and you can leave at any time.</p>
          </section>
        </div>

        <div className="footer-directory">
          <section className="footer-contact" aria-labelledby="footer-contact-title">
            <div>
              <span className="lab">Lagos store</span>
              <h2 id="footer-contact-title">Visit the house</h2>
            </div>
            <address>
              {STORE_CONTACT.streetAddress}<br />
              {STORE_CONTACT.area}, {STORE_CONTACT.city}, {STORE_CONTACT.country}
            </address>
            <div className="footer-contact__links">
              <a href={`tel:${STORE_CONTACT.phoneHref}`}>{STORE_CONTACT.phoneDisplay}</a>
              <a href={`mailto:${STORE_CONTACT.email}`}>{STORE_CONTACT.email}</a>
            </div>
            <a
              className="footer-contact__social"
              href={STORE_CONTACT.instagram}
              rel="noreferrer"
              target="_blank"
            >
              Instagram <DirectLinkMark />
            </a>
          </section>

          <div className="fgrid">
            <div>
              <h2>Atelier</h2>
              <ul>
                <li><Link href={`/${market}/atelier`}>Bespoke</Link></li>
                <li><Link href={`/${market}/atelier`}>Bridal</Link></li>
                <li><Link href={`/${market}/atelier`}>Book a fitting</Link></li>
              </ul>
            </div>
            <div>
              <h2>Client care</h2>
              <ul>
                <li><Link href={`/${market}/size-guide`}>Size guide</Link></li>
                <li><Link href={`/${market}/shipping`}>Shipping</Link></li>
                <li><Link href={`/${market}/returns`}>Returns</Link></li>
                <li><Link href={`/${market}/order-tracking`}>Track an order</Link></li>
              </ul>
            </div>
            <div>
              <h2>House</h2>
              <ul>
                <li><Link href={`/${market}/about`}>About NELO</Link></li>
                <li><Link href={`/${market}/contact`}>Contact</Link></li>
                <li><a href={STORE_CONTACT.instagram} rel="noreferrer" target="_blank">Instagram <DirectLinkMark /></a></li>
              </ul>
            </div>
            <div>
              <h2>Region</h2>
              <ul>
                <li><Link href="/ng">Nigeria · Naira</Link></li>
                <li><Link href="/international">Worldwide · US dollar</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-base">
          <p>© 2026 NELO Woman · Lagos</p>
          <p>Statement femininity · Sizes 6 to 30 · Worldwide delivery</p>
        </div>
      </div>
    </footer>
  );
}
