import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AccountShell, AccountUnavailable, SignInRequired } from '@/features/account/AccountShell';
import { AppointmentList } from '@/features/atelier/AppointmentList';
import { atelierDate, PROJECT_STAGE_LABELS } from '@/features/atelier/presentation';
import { isMarket } from '@/lib/vendure/channels';
import { getActiveCustomer } from '@/lib/vendure/customer';
import { CustomerAtelierDocument } from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export const metadata: Metadata = { title: 'Your atelier', robots: { index: false, follow: false } };

export default async function AccountAtelierPage({ params, searchParams }: { params: Promise<{ market: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { market } = await params;
  if (!isMarket(market)) notFound();
  const raw = await searchParams;
  const pageValue = typeof raw.page === 'string' ? Number(raw.page) : 1;
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 && pageValue <= 1000 ? pageValue : 1;
  const take = 20;
  const skip = (page - 1) * take;
  const identity = await getActiveCustomer(market);
  const shell = (children: React.ReactNode) => <AccountShell market={market} title="Your atelier" current="/atelier" standfirst="Follow your appointments and the progress of every commissioned garment.">{children}</AccountShell>;
  if (!identity.reachable) return shell(<AccountUnavailable market={market} />);
  if (!identity.customer) return shell(<SignInRequired market={market} returnTo={`/${market}/account/atelier`} reason="Sign in to view appointments and commissions." />);
  let data;
  try { data = (await vendureQuery(CustomerAtelierDocument, { appointmentOptions: { take, skip }, projectOptions: { take, skip } }, { market })).data; }
  catch { return shell(<AccountUnavailable market={market} />); }
  const lastPage = Math.max(1, Math.ceil(Math.max(data.atelierAppointments.totalItems, data.bespokeProjects.totalItems) / take));
  return shell(<>
    <div className="acts-row"><Link className="btn" href={`/${market}/atelier#commission-form`}>Request an appointment</Link><Link className="btn-q" href={`/${market}/account/measurements`}>Your measurements</Link></div>
    <section className="section-gap"><h2>Commissions</h2>
      {!data.bespokeProjects.items.length ? <p className="mnote">No commissions on this page. A consultation request begins a conversation; the atelier creates your commission after discussing your piece.</p> : data.bespokeProjects.items.map(project => <article className="garment" key={project.id}>
        <div className="garment-head"><h3><Link href={`/${market}/account/atelier/${encodeURIComponent(project.reference)}`}>{project.reference}</Link></h3><span className="pill">{PROJECT_STAGE_LABELS[project.stage]}</span></div>
        <p>{project.items.map(item => item.name).join(' · ') || 'Your garment plan is being prepared.'}</p><p className="mnote">Target completion: {atelierDate(project.targetCompletionDate)}</p>
        <Link className="btn-q" href={`/${market}/account/atelier/${encodeURIComponent(project.reference)}`}>View commission</Link>
      </article>)}
    </section>
    <section className="section-gap"><h2>Consultations and fittings</h2><AppointmentList appointments={data.atelierAppointments.items} market={market} /></section>
    {lastPage > 1 || page > 1 ? <nav className="pager" aria-label="Atelier pages">{page > 1 ? <Link href={`/${market}/account/atelier?page=${Math.min(page - 1, lastPage)}`}>Previous</Link> : <span>Previous</span>}<span>{page <= lastPage ? `Page ${page} of ${lastPage}` : 'Page unavailable'}</span>{page < lastPage ? <Link href={`/${market}/account/atelier?page=${page + 1}`}>Next</Link> : <span>Next</span>}</nav> : null}
  </>);
}
