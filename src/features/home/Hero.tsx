import Link from 'next/link';
import { CAMPAIGN } from './campaign';
import { CampaignRotator } from './CampaignRotator';
import { priceLabel, type SearchItem } from '@/features/catalogue/price';
import type { Market } from '@/lib/vendure/channels';

/** How many looks the hero index names before it defers to the collection. */
const INDEXED_LOOKS = 4;

/**
 * Editorial hero for the market home.
 *
 * Server component. The lead image and wording are authored (see campaign.ts);
 * the look index is live catalogue, so the prices a visitor reads on the front
 * page are the prices they pay. If the catalogue is unreachable the index is
 * omitted and the hero still stands - the campaign is not dependent on Vendure
 * being up.
 *
 * `hero-seq` drives the entrance choreography in globals.css. It is a class, not
 * a client component: the sequence is four CSS delays and needs no JavaScript.
 */
export function Hero({ market, items }: { market: Market; items: readonly SearchItem[] }) {
  const looks = items.slice(0, INDEXED_LOOKS);
  const remaining = Math.max(0, items.length - looks.length);

  return (
    <section className="hero hero--banner hero-seq" aria-labelledby="campaign-title">
      <div className="hero-media hero-banner">
        <CampaignRotator />

        <div className="hero-panel">
          <span className="lab">{CAMPAIGN.eyebrow}</span>
          <h1 id="campaign-title">
            <span className="unmask">{CAMPAIGN.titleLines[0]}</span>
            <span className="unmask">
              {CAMPAIGN.titleLines[1]}
              {CAMPAIGN.titleAccent ? <em> {CAMPAIGN.titleAccent}</em> : null}
            </span>
          </h1>
          <p className="blurb">{CAMPAIGN.standfirst}</p>
          <div className="hero-foot acts">
            <Link className="btn" data-magnetic href={`/${market}/shop`}>
              Shop the collection
            </Link>
            <Link className="btn-q" data-magnetic href={`/${market}/atelier`}>
              Book a fitting
            </Link>
          </div>
        </div>

        <div className="hero-scan" aria-hidden="true">
          <span className="hero-scan__meta hero-scan__meta--top">NL / SS26</span>
          <span className="hero-scan__meta hero-scan__meta--bottom">CUT / LAGOS / 0.01 MM</span>
        </div>
      </div>

      {looks.length > 0 ? (
          <ol className="index hero-lookbar" aria-label="Featured looks">
            {looks.map((item, i) => (
              <li key={item.productId}>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <Link href={`/${market}/products/${item.slug}`}>{item.productName}</Link>
                <span className="num">{priceLabel(item.priceWithTax, market)}</span>
              </li>
            ))}
            {remaining > 0 ? (
              <li className="more">
                <span className="num">
                  {String(looks.length + 1).padStart(2, '0')}-
                  {String(items.length).padStart(2, '0')}
                </span>
                <Link href={`/${market}/shop`}>
                  {remaining === 1 ? 'One further look' : `${remaining} further looks`}
                </Link>
                {/* Decorative: the link text already says where this goes. */}
                <span className="num" aria-hidden="true">
                  →
                </span>
              </li>
            ) : null}
          </ol>
        ) : null}
    </section>
  );
}
