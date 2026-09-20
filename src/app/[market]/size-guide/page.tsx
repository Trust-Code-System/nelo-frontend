import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPage } from '@/features/content/ContentPage';
import { contentMetadata } from '@/features/content/metadata';
import { MeasurementDiagram } from '@/features/content/MeasurementDiagram';
import { cmToInches, SIZE_CHART } from '@/features/content/size-chart';
import { GUIDANCE, LABELS, MEASUREMENT_CODES } from '@/lib/atelier/measurements';
import { isMarket } from '@/lib/vendure/channels';

export function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  return contentMetadata(params, {
    path: '/size-guide',
    title: 'Size guide',
    description:
      'Nelo Woman is cut in UK 6 to 30. Where each of the seven recorded measurements is taken, what the numbers mean, and how to choose between sizes.',
  });
}

/**
 * Size guide.
 *
 * The one written page that carries real weight: the 6–30 range is the brand's central
 * claim, and the seven recorded points are what make a cut-to-measure order possible. Both
 * are stated here rather than implied by a dropdown.
 *
 * The seven points come from `lib/atelier/measurements` - the same labels and the same
 * guidance text the measurement intake form uses. One definition, so the page and the form
 * can never describe the same measurement differently.
 */
export default async function SizeGuidePage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  return (
    <ContentPage
      market={market}
      eyebrow="Care"
      title="Size guide"
      standfirst="Every style is cut in UK 6 to 30. These are body measurements - what a tape measure says about you, not the width of the finished garment."
      announcement="Every style is made in every size, 6 to 30"
      aside={
        <>
          <span className="lab">Fig. 01 - Recorded points</span>
          <MeasurementDiagram />
          <dl style={{ margin: 'var(--s5) 0 0' }}>
            <div className="spec">
              <dt>Precision</dt>
              <dd>0.01 mm</dd>
            </div>
            <div className="spec" style={{ borderBottom: 0 }}>
              <dt>Units</dt>
              <dd>in / cm</dd>
            </div>
          </dl>
        </>
      }
    >
      <h2>The range is the whole range</h2>
      <p>
        UK 6 to 30, in every style, with no size dropped above a certain point. On a product
        page the sizes are shown as a scale rather than hidden in a dropdown, and a size that
        is not in stock to ship is struck through rather than removed - because &ldquo;we make
        this in your size, just not today&rdquo; is a different sentence from &ldquo;we do not
        make this in your size&rdquo;.
      </p>

      <h2>The seven points we record</h2>
      <p>
        A commission, and any piece cut to measure, is made from these seven. Take each one
        over the underwear you would wear with the garment, with the tape snug but not pulled.
      </p>

      <dl className="mdefs">
        {MEASUREMENT_CODES.map((code) => (
          <div key={code}>
            <dt>{LABELS[code]}</dt>
            <dd>{GUIDANCE[code]}</dd>
          </div>
        ))}
      </dl>

      <h2>Why the numbers have decimals</h2>
      <p>
        We store measurements in millimetres to two decimal places. That is not fussiness: a
        quarter of an inch is 6.35&nbsp;mm, and a system that only holds whole millimetres
        silently rounds it to 6 and throws away work somebody did carefully with a tape. You
        enter inches or centimetres, whichever you measured in, and we keep the exact decimal
        you typed alongside the unit you typed it in.
      </p>
      <p>
        A measurement we have not confirmed is shown as not confirmed - never as zero. You can
        see and edit what we hold in{' '}
        <Link href={`/${market}/account/measurements`}>your measurement profile</Link>.
      </p>

      <h2>Body measurements by size</h2>
      <p>
        Find your bust, waist and hip below and take the largest size the three fall into. If
        you are between sizes, or across two, that is exactly what cut-to-measure is for - the
        atelier grades the pattern to your own numbers instead of asking you to pick a
        compromise.
      </p>

      {/* A seven-column table has nowhere to go on a phone but sideways, so the wrapper
          scrolls. A scrollable region with no focusable content inside it cannot be scrolled
          from the keyboard at all, which is why it is a labelled region and a tab stop. */}
      <div
        className="tablewrap"
        role="region"
        aria-label="Body measurements by size"
        tabIndex={0}
      >
        <table className="rows sizetable">
          <caption className="sr">
            Body measurements in centimetres and inches for UK sizes 6 to 30
          </caption>
          <thead>
            <tr>
              <th scope="col">UK</th>
              <th scope="col" className="num">
                Bust cm
              </th>
              <th scope="col" className="num">
                Bust in
              </th>
              <th scope="col" className="num">
                Waist cm
              </th>
              <th scope="col" className="num">
                Waist in
              </th>
              <th scope="col" className="num">
                Hip cm
              </th>
              <th scope="col" className="num">
                Hip in
              </th>
            </tr>
          </thead>
          <tbody>
            {SIZE_CHART.map((row) => (
              <tr key={row.uk}>
                <th scope="row" className="num">
                  {row.uk}
                </th>
                <td data-label="Bust cm" className="num">
                  {row.bustCm}
                </td>
                <td data-label="Bust in" className="num">
                  {cmToInches(row.bustCm)}
                </td>
                <td data-label="Waist cm" className="num">
                  {row.waistCm}
                </td>
                <td data-label="Waist in" className="num">
                  {cmToInches(row.waistCm)}
                </td>
                <td data-label="Hip cm" className="num">
                  {row.hipCm}
                </td>
                <td data-label="Hip in" className="num">
                  {cmToInches(row.hipCm)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Between two sizes</h2>
      <p>
        Go by the largest of your three measurements and have the rest taken in - that is
        cheaper and faster than letting a seam out. If the difference between your bust and
        hip spans more than two sizes, tell us when you order and we will grade the pattern
        across them rather than cutting a single size and hoping.
      </p>

      <h2>Alterations are part of it</h2>
      <p>
        Alterations are free for 30 days after delivery, on anything.{' '}
        <Link href={`/${market}/returns`}>Returns and alterations</Link> has the detail, and{' '}
        <Link href={`/${market}/atelier`}>the atelier</Link> takes it from there for a
        commission.
      </p>
    </ContentPage>
  );
}
