import Image from 'next/image';
import Link from 'next/link';
import { DirectLinkMark } from '@/components/DirectLinkMark';
import { BRIDAL_STAGES, CAMPAIGN, FEATURED_LOOKS, GARMENT_STAGES, TICKER } from './campaign';
import type { Market } from '@/lib/vendure/channels';

/**
 * Full-bleed readout rail.
 *
 * Inverted, mono only, facts only. It carries the collection's specification
 * where a conventional storefront would put a marketing banner - which is the
 * whole argument of this direction: the chrome is a spec sheet.
 */
export function ReadoutRail() {
  return (
    <section className="house-motion" aria-label="Nelo Woman house statement">
      <div className="shell house-motion__inner">
        <div className="house-motion__meta">
          <span className="lab">House note / 01</span>
          <span className="num">Lagos · Linear Summer 26</span>
        </div>

        <p className="sr">
          Made for movement. Cut for presence. Measured to you. Remembered in motion.
        </p>
        <div className="house-motion__window" aria-hidden="true">
          <div className="house-motion__rail">
            <span>Made for <em>movement.</em></span>
            <span>Cut for <em>presence.</em></span>
            <span>Measured <em>to you.</em></span>
            <span>Remembered <em>in motion.</em></span>
            <span>Made for <em>movement.</em></span>
          </div>
        </div>

        <div className="house-motion__measure" aria-hidden="true">
          <span className="house-motion__needle" />
        </div>
        <div className="house-motion__foot" aria-hidden="true">
          <span>00</span>
          <span>Pattern / Body / Motion</span>
          <span>100</span>
        </div>
      </div>
    </section>
  );
}

/**
 * Fig. 01 - the recorded measurement points.
 *
 * Every path carries pathLength="1" so the draw-on animation in globals.css can
 * normalise across paths of very different real lengths with a single dash
 * value. The dimension lines are grouped so they can be delayed until the block
 * outline has finished drawing.
 *
 * aria-label carries the whole meaning; the individual labels are presentation.
 */
function Fig01() {
  return (
    <svg
      className="fig-draw"
      viewBox="0 0 340 258"
      role="img"
      aria-label="Front-view garment block showing where each of the seven recorded measurements is taken: shoulder, bust, waist, hip, sleeve, inseam and height."
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <path
          pathLength="1"
          d="M148 22c0-8 6-13 14-13s14 5 14 13c0 7-2 11-2 15l30 10c9 3 13 8 14 17l5 38-19 4-3-21-4 133h-70l-4-133-3 21-19-4 5-38c1-9 5-14 14-17l30-10c0-4-2-8-2-15z"
        />
        <path pathLength="1" d="M205 62l14 46" />
        <path pathLength="1" d="M162 152v66" />
        <g className="dims">
          <g strokeDasharray="3 3">
            <path pathLength="1" d="M118 52h118" />
            <path pathLength="1" d="M110 80h126" />
            <path pathLength="1" d="M114 108h122" />
            <path pathLength="1" d="M110 136h126" />
          </g>
          <path pathLength="1" d="M40 16v226" />
          <path pathLength="1" d="M35 16h10" />
          <path pathLength="1" d="M35 242h10" />
        </g>
      </g>
      <g
        fill="currentColor"
        fontFamily="var(--mono)"
        fontSize="7.5"
        letterSpacing="1.1"
        aria-hidden="true"
      >
        <text x="244" y="55">SHOULDER</text>
        <text x="244" y="83">BUST</text>
        <text x="244" y="111">WAIST</text>
        <text x="244" y="139">HIP</text>
        <text x="228" y="97">SLEEVE</text>
        <text x="172" y="200">INSEAM</text>
        <text x="10" y="132" transform="rotate(-90 22 132)" textAnchor="middle">
          HEIGHT
        </text>
      </g>
    </svg>
  );
}

/**
 * The thesis band - why this house measures.
 *
 * The one place on the home page that argues rather than sells. Sits on bone so
 * it reads as a different register from the catalogue above and below it.
 */
export function Thesis({ market }: { market: Market }) {
  return (
    <section className="thesis" aria-labelledby="thesis-title" data-motion-reveal>
      <div className="shell thesis-in">
        <div className="thesis-copy">
          <span className="lab lock-on">The NELO measure</span>
          <h2 id="thesis-title">
            <span className="unmask">Seven points.</span>
            <span className="unmask">One exact fit.</span>
          </h2>
          <p className="thesis-lede">
            A dress size is only a starting point. We record the body beneath it, keep the
            measurements securely on your account, and cut with the woman in mind.
          </p>
          <div className="thesis-proof" aria-label="Measurement profile facts">
            <div>
              <strong className="num">07</strong>
              <span>Recorded points</span>
            </div>
            <div>
              <strong className="num">0.01</strong>
              <span>Millimetre precision</span>
            </div>
            <div>
              <strong className="num">6–30</strong>
              <span>UK size range</span>
            </div>
          </div>
          <p className="thesis-note">
            Ready-to-wear, bespoke and bridal all begin with the same profile. Measure once,
            refine whenever you need, and use it across the house.
          </p>
          <div className="acts">
            <Link className="btn-q" href={`/${market}/account/measurements`}>
              Create your profile <DirectLinkMark />
            </Link>
          </div>
        </div>

        <div className="fig rise">
          <div className="fig-head">
            <span className="lab">Measurement map / 01</span>
            <span className="fig-ref">NL · BODY PROFILE</span>
          </div>
          <Fig01 />
          <dl className="mlist">
            <div className="spec">
              <dt>Profile</dt>
              <dd className="num">7 points</dd>
            </div>
            <div className="spec">
              <dt>Units</dt>
              <dd className="num">in / cm</dd>
            </div>
            <div className="spec">
              <dt>Stored</dt>
              <dd className="num">Your account</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

/**
 * The lookbook - a pinned frame whose track is scrubbed sideways by the page's
 * own vertical scroll, on phone and desktop.
 *
 * HomeExperience owns the pin once JavaScript is in. Without it, or under
 * reduced motion, the CSS either keeps a native scroll-driven scrub or
 * collapses the tall spacer into an ordinary horizontal scroller. The frames
 * are real figures rather than background images so the looks stay reachable
 * either way.
 */
export function Filmstrip() {
  return (
    <section className="film" aria-label="Lookbook">
      <div className="film-sticky">
        <div className="film-head">
          <span className="lab">Lookbook - Linear Summer 26</span>
          <span className="n">{CAMPAIGN.film.length} frames</span>
        </div>
        <div className="film-track">
          {CAMPAIGN.film.map((frame, i) => (
            <figure key={frame.src}>
              <div className="ph">
                <Image
                  src={frame.src}
                  alt={frame.alt}
                  width={900}
                  height={1125}
                  sizes="(max-width: 980px) 88vw, 38vw"
                  // The pin holds one viewport while every frame is scrubbed
                  // through, so waiting to lazy-load leaves empty ink.
                  loading={i < 4 ? 'eager' : 'lazy'}
                />
              </div>
              <figcaption>
                {String(i + 1).padStart(2, '0')} - {frame.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Kinetic readout strip.
 *
 * Duplicated once so a -50% translate loops seamlessly. The whole strip is
 * aria-hidden: every phrase in it is already stated as real content elsewhere
 * on the page, and a screen reader should not hear the size range twice because
 * the marquee needs a copy of itself.
 */
export function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-in">
        {[0, 1].map((copy) =>
          TICKER.map((phrase) => <span key={`${copy}-${phrase}`}>{phrase}</span>),
        )}
      </div>
    </div>
  );
}

/**
 * Authored campaign preview used while the connected Vendure instance still contains its
 * sample technology catalogue. These are collection photographs, not invented products,
 * so the captions stay at look level and the only commerce action goes to the real
 * collection route. Once Nelo products are imported the page swaps this for ProductGrid.
 */
export function CollectionPreview({ market }: { market: Market }) {
  return (
    <div className="campaign-grid" aria-label="Linear Summer 26 campaign preview">
      {FEATURED_LOOKS.map((frame, index) => (
        <figure key={frame.src}>
          <div className="ph framed">
            <Image
              src={frame.src}
              alt={frame.alt}
              width={900}
              height={1125}
              sizes="(max-width: 760px) 88vw, (max-width: 1100px) 45vw, 34vw"
              loading={index < 2 ? 'eager' : 'lazy'}
            />
          </div>
          <figcaption>
            <span className="num">L{String(index + 1).padStart(2, '0')}</span>
            <span>{frame.caption}</span>
          </figcaption>
        </figure>
      ))}
      <div className="campaign-grid__note">
        <span className="lab">The release</span>
        <p>Four signatures from the live Nelo collection, photographed by the house.</p>
        <Link className="btn-q" data-magnetic href={`/${market}/shop`}>
          Enter the collection
        </Link>
      </div>
    </div>
  );
}

/**
 * Commission split - bespoke and bridal.
 *
 * No price, no quantity, no add-to-cart on either panel. That is a hard rule of
 * this project: bespoke is an enquiry, never a cart line. The live Shopify site
 * models it as a zero-price cart item, which is the defect this replaces.
 */
export function CommissionSplit({ market }: { market: Market }) {
  return (
    <section className="split" aria-label="Commissions" data-motion-reveal>
      <article>
        <span className="lab">Commission</span>
        <h3>Bespoke</h3>
        <p>A garment designed with you and cut from nothing. Begins with a consultation, not a cart.</p>
        <ol className="stagelist">
          {GARMENT_STAGES.map((stage, i) => (
            <li key={stage}>
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <span className="t">{stage}</span>
            </li>
          ))}
        </ol>
        <div className="acts">
          <Link className="btn-q" data-magnetic href={`/${market}/atelier`}>
            Request a consultation
          </Link>
        </div>
      </article>

      <article>
        <span className="lab">Commission</span>
        <h3>Bridal</h3>
        <p>
          Four to nine months, three fittings, one dress. Track every stage from your account.
        </p>
        <ol className="stagelist">
          {BRIDAL_STAGES.map((stage, i) => (
            <li key={stage}>
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <span className="t">{stage}</span>
            </li>
          ))}
        </ol>
        <div className="acts">
          <Link className="btn-q" data-magnetic href={`/${market}/atelier`}>
            Enquire about bridal
          </Link>
        </div>
      </article>
    </section>
  );
}
