import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import type { Market } from '@/lib/vendure/channels';

/**
 * The chrome every account screen shares: header, section nav, heading, footer.
 *
 * A Server Component. The nav is links, so none of it reaches the browser as state.
 */

const SECTIONS = [
  { href: '', label: 'Overview' },
  { href: '/orders', label: 'Orders' },
  { href: '/addresses', label: 'Addresses' },
  { href: '/measurements', label: 'Measurements' },
  { href: '/password', label: 'Password' },
] as const;

export function AccountShell({
  market,
  title,
  eyebrow = 'Account',
  meta,
  /** Omitted on the signed-out screens, where a section nav would offer dead ends. */
  showNav = true,
  current,
  children,
}: {
  market: Market;
  title: string;
  eyebrow?: string;
  meta?: React.ReactNode;
  showNav?: boolean;
  current?: (typeof SECTIONS)[number]['href'];
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader market={market} announcement="Your account, your measurements, your orders" />

      <main className="shell">
        <div className="proj-head">
          <div>
            <span className="lab">{eyebrow}</span>
            <h1>{title}</h1>
          </div>
          {meta ? <div className="proj-meta">{meta}</div> : null}
        </div>

        {showNav ? (
          <nav className="acct-nav" aria-label="Account sections">
            {SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={`/${market}/account${section.href}`}
                aria-current={section.href === current ? 'page' : undefined}
              >
                {section.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <section className="section-gap">{children}</section>

      </main>

      <SiteFooter market={market} />
    </>
  );
}

/**
 * Two columns: the form, and why anyone would fill it in.
 *
 * A five-field form alone in a 1440px page reads as an afterthought, and the aside is not
 * filler — "you never need an account to buy" is the single most useful thing to say next to
 * a sign-in form on a store that supports guest checkout.
 */
export function AuthLayout({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="authgrid">
      <div className="authwrap">{children}</div>
      {/* A div, not an <aside>. A complementary landmark nested inside <main> is worse
          than no landmark: axe flags it, and it adds a navigation stop for a panel of
          supporting notes that nobody wants to jump to. */}
      {aside ? <div className="aside">{aside}</div> : null}
    </div>
  );
}

/**
 * The signed-out state.
 *
 * Deliberately not a redirect to the sign-in page and never a silent re-authentication: a
 * session that expired mid-visit should say so, keep the customer where they are, and offer
 * a way back that returns them to the page they asked for.
 */
export function SignInRequired({
  market,
  returnTo,
  reason = 'You need to be signed in to see this.',
}: {
  market: Market;
  returnTo: string;
  reason?: string;
}) {
  const next = encodeURIComponent(returnTo);
  return (
    <div className="empty">
      <span className="lab">Signed out</span>
      <h2>{reason}</h2>
      <p>Your bag is not affected — anything in it stays where it is.</p>
      <div className="acts-row">
        <Link className="btn" href={`/${market}/account/login?next=${next}`}>
          Sign in
        </Link>
        <Link className="btn-q" href={`/${market}/account/register?next=${next}`}>
          Create an account
        </Link>
      </div>
    </div>
  );
}

/** Vendure could not be reached. Distinct from being signed out, and says so. */
export function AccountUnavailable({ market }: { market: Market }) {
  return (
    <div className="empty">
      <span className="lab">Temporarily unavailable</span>
      <h2>We cannot reach your account right now</h2>
      <p>
        This is our side, not yours, and you have not been signed out. Try again in a moment.
      </p>
      <Link className="btn-q" href={`/${market}`}>
        Continue shopping
      </Link>
    </div>
  );
}
