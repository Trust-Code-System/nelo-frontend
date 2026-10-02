import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StageTrack } from '@/components/StageTrack';
import { AccountShell, AccountUnavailable, SignInRequired } from '@/features/account/AccountShell';
import { AppointmentList } from '@/features/atelier/AppointmentList';
import { atelierDate, ITEM_STAGE_LABELS, ITEM_STAGE_ORDER, PROJECT_STAGE_LABELS, PROJECT_STAGE_ORDER } from '@/features/atelier/presentation';
import { display, LABELS } from '@/lib/atelier/measurements';
import { isMarket } from '@/lib/vendure/channels';
import { getActiveCustomer } from '@/lib/vendure/customer';
import { BespokeProjectDocument } from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export const metadata: Metadata = { title: 'Your commission', robots: { index: false, follow: false } };

export default async function CommissionPage({ params }: { params: Promise<{ market: string; reference: string }> }) {
  const { market, reference } = await params;
  if (!isMarket(market)) notFound();
  const identity = await getActiveCustomer(market);
  const shell = (children: React.ReactNode) => <AccountShell market={market} title="Your commission" current="/atelier" standfirst="Follow the atelier stages, fitting appointments and completion dates for your garments.">{children}</AccountShell>;
  if (!identity.reachable) return shell(<AccountUnavailable market={market} />);
  if (!identity.customer) return shell(<SignInRequired market={market} returnTo={`/${market}/account/atelier/${encodeURIComponent(reference)}`} reason="Sign in to follow your commission." />);
  let project;
  try { project = (await vendureQuery(BespokeProjectDocument, { reference }, { market })).data.bespokeProject; }
  catch { return shell(<AccountUnavailable market={market} />); }
  if (!project) notFound();
  return shell(<>
    <Link href={`/${market}/account/atelier`}>← Your atelier</Link>
    <div className="commission-heading"><div><span className="lab">{project.context === 'bridal' ? 'Bridal' : 'Bespoke'} · {project.reference}</span><h2>{project.items.length === 1 ? 'Your garment' : 'Your garments'}</h2></div><div className="proj-meta"><span>Opened {atelierDate(project.createdAt)}</span><span>Target completion: {atelierDate(project.targetCompletionDate)}</span></div></div>
    {project.stage === 'cancelled' ? <p className="notice">This commission has been cancelled.</p> : <StageTrack order={PROJECT_STAGE_ORDER} labels={PROJECT_STAGE_LABELS} current={project.stage} caption="Commission" />}
    <section className="section-gap"><h2>Garment progress</h2>
      {!project.items.length ? <p className="mnote">The atelier is preparing your garment plan.</p> : project.items.map(item => <article className="garment" key={item.id}><div className="garment-head"><h3>{item.name}</h3><span className="eta">Target completion: {atelierDate(item.targetCompletionDate)}</span></div>
        {item.stage === 'cancelled' ? <p className="notice">This garment has been cancelled.</p> : <StageTrack order={ITEM_STAGE_ORDER} labels={ITEM_STAGE_LABELS} current={item.stage} />}
      </article>)}
    </section>
    <section className="section-gap"><h2>Confirmed measurements</h2>
      {project.measurements ? <><p className="mnote">Confirmed {atelierDate(project.measurements.confirmedAt)}. Updating your profile will not change this commission’s measurements.</p><dl className="snap-grid">{project.measurements.measurements.map(measurement => <div key={measurement.code}><dt>{LABELS[measurement.code]}</dt><dd>{display(measurement.millimetres, 'millimetre')}</dd></div>)}</dl></> : <p className="mnote">Measurements will appear after the atelier confirms them.</p>}
    </section>
    <section className="section-gap"><h2>Fittings and consultations</h2><AppointmentList appointments={project.appointments} market={market} /></section>
    {project.relatedOrderCodes.length ? <section className="section-gap"><h2>Related orders</h2><div className="acts-row">{project.relatedOrderCodes.map(code => <Link className="btn-q" key={code} href={`/${market}/account/orders/${encodeURIComponent(code)}`}>{code}</Link>)}</div></section> : null}
    <div className="acts-row"><Link className="btn" href={`/${market}/atelier?purpose=fitting&context=${project.context}#commission-form`}>Request a fitting</Link><Link className="btn-q" href={`/${market}/contact`}>Contact the atelier</Link></div>
  </>);
}
