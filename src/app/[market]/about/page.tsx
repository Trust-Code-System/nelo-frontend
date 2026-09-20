import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { contentMetadata } from '@/features/content/metadata';
import { isMarket } from '@/lib/vendure/channels';

const EXPRESSIONS = [
  {
    number: '01',
    title: 'Elegance',
    copy: 'Sculptural silhouettes, considered proportion and presence without performance.',
  },
  {
    number: '02',
    title: 'Consciousness',
    copy: 'Made with intention in Lagos, in quantities that respect the hands behind every piece.',
  },
  {
    number: '03',
    title: 'Timelessness',
    copy: 'Clothes designed to outlive a moment and return to your wardrobe with new meaning.',
  },
  {
    number: '04',
    title: 'Empowerment',
    copy: 'A full size range and an atelier service that begin with the woman, never an idealised body.',
  },
] as const;

export function generateMetadata({ params }: { params: Promise<{ market: string }> }) {
  return contentMetadata(params, {
    path: '/about',
    title: 'Our story',
    description:
      'Founded in Lagos by Chinelo Nzelu, Nelo Woman brings art, purpose and personal storytelling into fashion.',
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market } = await params;
  if (!isMarket(market)) notFound();

  return (
    <>
      <SiteHeader market={market} announcement="Designed in Lagos, worn everywhere" />

      <main className="about-page">
        <section className="about-hero" aria-labelledby="about-title">
          <span className="about-hero__parallax" data-motion-parallax="7">
            <Image
              src="/editorial/live/about-founder-landscape.jpg"
              alt="Nelo Woman founder Chinelo Nzelu in her Lagos studio"
              fill
              priority
              sizes="100vw"
            />
          </span>
          <div className="about-hero__shade" />
          <div className="about-hero__copy">
            <span className="lab">Lagos, since 2019</span>
            <h1 id="about-title" data-motion-words>A fashion house for every version of her.</h1>
            <p>Founded by designer Chinelo Nzelu.</p>
          </div>
          <span className="about-hero__index num">NL / STORY 01</span>
        </section>

        <section className="about-statement shell" aria-labelledby="about-statement-title">
          <span className="lab">Our story</span>
          <h2 id="about-statement-title" data-motion-words>
            Clothing with meaning, made for women with somewhere to go.
          </h2>
          <div className="about-statement__copy">
            <p>
              Founded in 2019 by Nigerian designer Chinelo Nzelu, Nelo Woman brings art,
              purpose and personal storytelling into fashion. Every collection begins with a
              woman in mind, then becomes shape, movement and memory.
            </p>
            <p>
              The house is rooted in Lagos and speaks to women everywhere. Ready to wear runs
              from UK 6 to 30. Bespoke and bridal begin with conversation, exact measurements
              and the belief that clothes should meet the body where it is.
            </p>
          </div>
        </section>

        <section className="about-founder shell" aria-labelledby="founder-title">
          <div className="about-founder__portrait" data-motion-clip>
            <Image
              src="/editorial/live/about-founder-portrait.jpg"
              alt="Chinelo Nzelu smiling in the Nelo Woman studio"
              fill
              sizes="(max-width: 760px) 100vw, 46vw"
            />
            <span className="num">FOUNDER / CREATIVE DIRECTOR</span>
          </div>
          <div className="about-founder__copy">
            <span className="lab">The designer</span>
            <h2 id="founder-title">Chinelo Nzelu designs from recognition.</h2>
            <p>
              Her work recognises the different roles a woman moves through, the softness she
              protects and the power she does not need to announce. The result is expressive,
              feminine clothing with disciplined construction beneath the drama.
            </p>
            <blockquote>
              “We make clothes that let a woman arrive as herself, only more clearly.”
            </blockquote>
            <Link className="btn" href={`/${market}/atelier`}>
              Enter the atelier
            </Link>
          </div>
        </section>

        <section className="about-beliefs" aria-label="Mission and vision" data-motion-stagger>
          <article>
            <span className="num">01 / MISSION</span>
            <h2>Make self-expression feel unmistakably personal.</h2>
            <p>
              We create distinctive pieces that honour individuality, confidence and the joy
              of dressing with intention.
            </p>
          </article>
          <article>
            <span className="num">02 / VISION</span>
            <h2>Build a globally recognised house from Lagos.</h2>
            <p>
              One known for strong design, inclusive sizing, responsible choices and an
              experience as considered as the clothes.
            </p>
          </article>
        </section>

        <section className="about-expressions shell" aria-labelledby="expressions-title">
          <div className="about-expressions__head">
            <span className="lab">What we carry forward</span>
            <h2 id="expressions-title">Four expressions of the house</h2>
          </div>
          <ol data-motion-stagger>
            {EXPRESSIONS.map((expression) => (
              <li key={expression.number}>
                <span className="num">{expression.number}</span>
                <h3>{expression.title}</h3>
                <p>{expression.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-cta shell" data-motion-reveal>
          <span className="lab">Continue the story</span>
          <h2>Choose a finished piece, or begin one with us.</h2>
          <div>
            <Link className="btn" href={`/${market}/shop`}>
              Shop the collection
            </Link>
            <Link className="btn btn-q" href={`/${market}/atelier`}>
              Commission a garment
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter market={market} />
    </>
  );
}
