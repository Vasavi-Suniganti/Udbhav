import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, CheckCircle2, Cloud, Factory, FlaskConical, Handshake, HeartHandshake, Rocket, Star, TestTube2, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { useToast } from '@/context/ToastContext';
import { Card, EmptyState, LoadingState, MetricCard, SectionHeader } from '@/components/ui';
import { formatDate } from '@/lib/constants';
import { api } from '@/lib/api';
import {
  createIndustryPrototypeReview,
  createIndustrySupportOffer,
  createMentorMeeting,
  dedupeIndustryCollaborations,
  industryAcceptedProjects,
  industryOrganizationIds,
  industryOrganizationName,
  industryProblemText,
  subscribeToIndustryCollaborations,
  subscribeToIndustryMentorMeetings,
  subscribeToIndustryMentorships,
  subscribeToIndustryPrototypeReviews,
  subscribeToIndustrySupportOffers,
  updateMentorshipStatus,
  type IndustryMentorship,
  type IndustryMentorMeeting,
  type IndustryPrototypeReview,
  type IndustrySupportOffer,
  type MentorshipStatus,
} from '@/lib/industry';

type Nav = (route: string) => void;

/**
 * Shared Industry scope: the accepted projects of the signed-in organization.
 * Mentorship, Prototype Reviews and Industry Support are all driven by this one
 * list, so they can never surface another organization's work.
 */
function useIndustryScope() {
  const { profile } = useAuth();
  const { challenges, loading, error } = usePlatform();
  const organizationIds = useMemo(() => industryOrganizationIds(profile), [profile?.id, profile?.organization_id]);
  const organizationKey = organizationIds.join('|');
  const projects = useMemo(() => industryAcceptedProjects(challenges, organizationIds), [challenges, organizationKey]);
  return { organizationIds, organizationName: industryOrganizationName(profile as never), projects, loading, error };
}

function BackLink({ route, label, onNavigate }: { route: string; label: string; onNavigate: Nav }) {
  return <button className="btn-ghost mb-4" onClick={() => onNavigate(route)}><ArrowLeft size={14} /> {label}</button>;
}

export function IndustryMentorWorkspace({ onNavigate }: { onNavigate: Nav }) {
  const { show } = useToast();
  const { organizationIds, organizationName, projects, loading, error } = useIndustryScope();
  const [mentorships, setMentorships] = useState<IndustryMentorship[]>([]);
  const [meetings, setMeetings] = useState<IndustryMentorMeeting[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  // The user must pick the request. Nothing is auto-selected: the previous
  // implementation defaulted the form to mentorships[0], so scheduling silently
  // targeted whichever record happened to load first.
  const [selectedId, setSelectedId] = useState('');
  const [meeting, setMeeting] = useState({ scheduledAt: '', durationMinutes: 45, agenda: '', meetingUrl: '' });

  const organizationKey = organizationIds.join('|');
  useEffect(() => {
    const offMentors = subscribeToIndustryMentorships(organizationIds, setMentorships, e => setLoadError(e.message));
    const offMeetings = subscribeToIndustryMentorMeetings(organizationIds, setMeetings, e => setLoadError(e.message));
    setReady(true);
    return () => { offMentors(); offMeetings(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationKey]);

  const selected = mentorships.find(row => row.id === selectedId) || null;
  const projectTitle = (challengeId: string) => projects.find(p => p.id === challengeId)?.title || 'Challenge details unavailable';

  async function decide(row: IndustryMentorship, status: MentorshipStatus) {
    setBusy(true);
    try { await updateMentorshipStatus(row, status); show(`Mentorship ${status.toLowerCase()}.`, 'success'); }
    catch (e) { show((e as Error).message || 'Unable to update the mentorship request.', 'error'); }
    finally { setBusy(false); }
  }

  async function schedule() {
    if (!selected) { show('Select a mentorship request first.', 'error'); return; }
    if (!meeting.scheduledAt) { show('Choose a meeting date and time.', 'error'); return; }
    if (!meeting.agenda.trim()) { show('Add an agenda for the session.', 'error'); return; }
    setBusy(true);
    try {
      await createMentorMeeting({
        mentorshipId: selected.id, challengeId: selected.challengeId, organizationId: selected.organizationId,
        agenda: meeting.agenda.trim(), scheduledAt: new Date(meeting.scheduledAt).toISOString(),
        durationMinutes: Number(meeting.durationMinutes) || 45, meetingUrl: meeting.meetingUrl.trim() || undefined,
      });
      show('Mentoring session scheduled.', 'success');
      setMeeting({ scheduledAt: '', durationMinutes: 45, agenda: '', meetingUrl: '' });
    } catch (e) { show((e as Error).message || 'Unable to schedule the session.', 'error'); }
    finally { setBusy(false); }
  }

  if ((loading && !projects.length) || !ready) return <LoadingState label="Loading mentorship workspace…" />;


  return <div className="civic-page space-y-5">
    <BackLink route="/dashboard" label="Back to Overview" onNavigate={onNavigate} />
    <SectionHeader title="Industry Mentorship Workspace" subtitle={`Mentoring connected to the challenges ${organizationName || 'your organization'} has accepted.`} />
    {(error || loadError) && <p className="text-sm text-error-600" role="alert">{loadError || error}</p>}

    <div className="grid sm:grid-cols-4 gap-4">
      <MetricCard label="Mentorship requests" value={mentorships.length} icon={<Users size={18} />} />
      <MetricCard label="Accepted" value={mentorships.filter(x => x.status === 'ACCEPTED').length} icon={<Handshake size={18} />} color="success" />
      <MetricCard label="Scheduled sessions" value={meetings.length} icon={<CalendarDays size={18} />} color="secondary" />
      <MetricCard label="My projects" value={projects.length} icon={<Rocket size={18} />} color="warning" />
    </div>

    <div className="grid lg:grid-cols-[1.5fr,1fr] gap-5">
      <div className="space-y-3">
        <h3 className="font-semibold text-primary-900">Mentorship requests</h3>
        {mentorships.length === 0
          ? <Card className="p-5"><EmptyState icon={<Handshake size={40} />} title="No mentorship requests yet" description={projects.length ? 'Mentorship requests raised for your accepted challenges will appear here.' : 'Accept a Government-routed challenge first, then mentorship requests for it will appear here.'} action={projects.length ? undefined : <button className="btn-primary" onClick={() => onNavigate('/dashboard/challenges')}>Explore Challenges</button>} /></Card>
          : mentorships.map(row => <Card key={row.id} className={`p-4 ${row.id === selectedId ? 'border-primary-400 ring-1 ring-primary-200' : ''}`}>
            <button className="w-full text-left" onClick={() => setSelectedId(row.id === selectedId ? '' : row.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <b className="text-sm text-primary-900">{row.challengeTitle || projectTitle(row.challengeId)}</b>
                  <p className="text-xs text-neutral-500 mt-1">Needs: {row.requestedExpertise.join(', ') || 'Not specified'}</p>
                  {row.message && <p className="text-sm text-neutral-600 mt-1">{row.message}</p>}
                </div>
                <span className="badge bg-neutral-100 text-neutral-700">{String(row.status).replaceAll('_', ' ')}</span>
              </div>
            </button>
            <div className="flex flex-wrap gap-2 mt-3">
              <button className="btn-secondary" onClick={() => onNavigate(`/dashboard/projects/${encodeURIComponent(row.challengeId)}`)}>Open project</button>
              {row.status === 'PENDING' && <>
                <button className="btn-secondary" disabled={busy} onClick={() => void decide(row, 'DECLINED')}>Decline</button>
                <button className="btn-primary" disabled={busy} onClick={() => void decide(row, 'ACCEPTED')}>Accept</button>
              </>}
              {row.status === 'ACCEPTED' && <button className="btn-secondary" disabled={busy} onClick={() => void decide(row, 'COMPLETED')}>Mark completed</button>}
            </div>
          </Card>)}
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="font-semibold">Schedule mentoring session</h3>
          {!selected
            ? <p className="text-sm text-neutral-500 mt-2">Select a mentorship request on the left to schedule a session for it.</p>
            : <div className="space-y-2 mt-3">
              <p className="text-xs text-neutral-500">Scheduling for: <b className="text-primary-900">{selected.challengeTitle || projectTitle(selected.challengeId)}</b></p>
              <input type="datetime-local" className="input" value={meeting.scheduledAt} onChange={e => setMeeting({ ...meeting, scheduledAt: e.target.value })} aria-label="Session date and time" />
              <input type="number" className="input" min={15} value={meeting.durationMinutes} onChange={e => setMeeting({ ...meeting, durationMinutes: Number(e.target.value) })} aria-label="Duration in minutes" />
              <textarea className="input" rows={3} placeholder="Agenda" value={meeting.agenda} onChange={e => setMeeting({ ...meeting, agenda: e.target.value })} aria-label="Agenda" />
              <input className="input" placeholder="Meeting URL (optional)" value={meeting.meetingUrl} onChange={e => setMeeting({ ...meeting, meetingUrl: e.target.value })} aria-label="Meeting URL" />
              <button className="btn-primary w-full" disabled={busy} onClick={() => void schedule()}>Schedule session</button>
            </div>}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Scheduled sessions</h3>
          {!meetings.length ? <p className="text-sm text-neutral-500 mt-2">No sessions scheduled yet.</p>
            : <div className="space-y-2 mt-3">{meetings.map(m => <div key={m.id} className="rounded-lg border p-3">
              <b className="text-sm">{m.agenda}</b>
              <p className="text-xs text-neutral-500 mt-1">{formatDate(m.scheduledAt)} · {m.durationMinutes} min</p>
              {m.meetingUrl && <a className="text-xs text-primary-700 underline" href={m.meetingUrl} target="_blank" rel="noreferrer">Join link</a>}
            </div>)}</div>}
        </Card>
      </div>
    </div>
  </div>;
}


export function PrototypeReviewPage({ onNavigate }: { onNavigate: Nav }) {
  const { show } = useToast();
  const { organizationIds, organizationName, projects, loading, error } = useIndustryScope();
  const [reviews, setReviews] = useState<IndustryPrototypeReview[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  // Explicit selection. The old page called api.projects() and auto-selected
  // projects[0] plus its first prototype, so reviews were written against an
  // arbitrary project and never against the reviewer's own organization.
  const [projectId, setProjectId] = useState('');
  const [form, setForm] = useState({ prototypeVersion: '', architecture: 4, technology: 4, scalability: 3, industryReadiness: 3, feedback: '', decision: 'REQUIRES_CHANGES' });

  const organizationKey = organizationIds.join('|');
  useEffect(() => {
    const off = subscribeToIndustryPrototypeReviews(organizationIds, setReviews, e => setLoadError(e.message));
    setReady(true);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationKey]);

  const project = projects.find(p => p.id === projectId) || null;
  const visible = projectId ? reviews.filter(r => r.challengeId === projectId) : [];

  async function submit() {
    if (!project) { show('Select one of your accepted projects first.', 'error'); return; }
    if (form.feedback.trim().length < 3) { show('Add technical feedback before submitting the review.', 'error'); return; }
    setBusy(true);
    try {
      await createIndustryPrototypeReview({
        challengeId: project.id, challengeTitle: project.title,
        organizationId: project.industryPartnerId || organizationIds[0] || '', organizationName,
        prototypeVersion: form.prototypeVersion.trim() || undefined,
        decision: form.decision, architecture: Number(form.architecture), technology: Number(form.technology),
        scalability: Number(form.scalability), industryReadiness: Number(form.industryReadiness), feedback: form.feedback.trim(),
      });
      show('Prototype review submitted.', 'success');
      setForm({ ...form, feedback: '', prototypeVersion: '' });
    } catch (e) { show((e as Error).message || 'Unable to submit the review.', 'error'); }
    finally { setBusy(false); }
  }

  if ((loading && !projects.length) || !ready) return <LoadingState label="Loading prototype reviews…" />;


  return <div className="civic-page space-y-5">
    <BackLink route="/dashboard" label="Back to Overview" onNavigate={onNavigate} />
    <SectionHeader title="Prototype Review & Industry Readiness" subtitle={`Review prototypes for the challenges ${organizationName || 'your organization'} has accepted.`} />
    {(error || loadError) && <p className="text-sm text-error-600" role="alert">{loadError || error}</p>}

    <div className="grid sm:grid-cols-3 gap-4">
      <MetricCard label="My projects" value={projects.length} icon={<Rocket size={18} />} />
      <MetricCard label="Reviews recorded" value={reviews.length} icon={<Star size={18} />} color="secondary" />
      <MetricCard label="Ready for pilot" value={reviews.filter(r => r.decision === 'READY_FOR_PILOT').length} icon={<CheckCircle2 size={18} />} color="success" />
    </div>

    {!projects.length
      ? <Card className="p-5"><EmptyState icon={<FlaskConical size={40} />} title="No projects to review" description="Prototype reviews are available once your organization accepts a Government-routed challenge." action={<button className="btn-primary" onClick={() => onNavigate('/dashboard/challenges')}>Explore Challenges</button>} /></Card>
      : <>
        <Card className="p-5">
          <h3 className="font-semibold">Submit a prototype review</h3>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Project</span>
              <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Select one of your accepted projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Prototype version (optional)</span>
              <input className="input" placeholder="e.g. v0.3" value={form.prototypeVersion} onChange={e => setForm({ ...form, prototypeVersion: e.target.value })} />
            </label>
            {(['architecture', 'technology', 'scalability', 'industryReadiness'] as const).map(k => <label className="text-sm" key={k}>
              {k.replace(/([A-Z])/g, ' $1')}
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(n => <button type="button" key={n} aria-label={`${k} ${n} of 5`} onClick={() => setForm({ ...form, [k]: n })}><Star size={22} className={n <= form[k] ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'} /></button>)}
              </div>
            </label>)}
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Technical feedback</span>
              <textarea className="input" rows={4} placeholder="What should the team fix before the next stage?" value={form.feedback} onChange={e => setForm({ ...form, feedback: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-neutral-700">Decision</span>
              <select className="input" value={form.decision} onChange={e => setForm({ ...form, decision: e.target.value })}>
                <option value="REQUIRES_CHANGES">Requires changes</option>
                <option value="APPROVED_FOR_TESTING">Approved for testing</option>
                <option value="READY_FOR_PILOT">Ready for pilot</option>
              </select>
            </label>
            <div className="flex items-end"><button className="btn-primary w-full" disabled={busy || !projectId} onClick={() => void submit()}>Submit review</button></div>
          </div>
          {!projectId && <p className="text-xs text-neutral-500 mt-3">Select a project to enable the review form.</p>}
        </Card>

        {project && <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Original problem under review</h3>
            <button className="btn-secondary" onClick={() => onNavigate(`/dashboard/projects/${encodeURIComponent(project.id)}`)}>Open project</button>
          </div>
          <p className="text-sm text-neutral-600 mt-2">{industryProblemText(project)}</p>
        </Card>}

        <div>
          <h3 className="font-semibold text-primary-900 mb-3">{projectId ? 'Reviews for this project' : 'Select a project to see its reviews'}</h3>
          {projectId && visible.length === 0
            ? <Card className="p-5"><EmptyState icon={<Star size={40} />} title="No reviews yet" description="Submit the first prototype review for this project using the form above." /></Card>
            : <div className="grid md:grid-cols-2 gap-4">{visible.map(r => <Card className="p-4" key={r.id}>
              <div className="flex justify-between gap-2">
                <b>{String(r.decision).replaceAll('_', ' ')}</b>
                <span className="text-xs text-neutral-400">{formatDate(r.createdAt)}</span>
              </div>
              {r.prototypeVersion && <p className="text-xs text-neutral-500 mt-1">Prototype {r.prototypeVersion}</p>}
              <p className="text-sm text-neutral-600 mt-2">{r.feedback}</p>
              <p className="text-xs text-neutral-500 mt-3">Architecture {r.architecture}/5 · Technology {r.technology}/5 · Scalability {r.scalability}/5 · Readiness {r.industryReadiness}/5</p>
            </Card>)}</div>}
        </div>
      </>}
  </div>;
}


const SUPPORT_TYPES: [string, typeof Users][] = [
  ['MENTORSHIP', Users], ['TECHNICAL_EXPERTISE', FlaskConical], ['TESTING', TestTube2], ['PROTOTYPING', Factory],
  ['CLOUD_RESOURCES', Cloud], ['FUNDING', HeartHandshake], ['DEPLOYMENT', Rocket], ['RESEARCH', Handshake],
  ['MANUFACTURING', Factory],
];

export function IndustrySupportPage({ onNavigate }: { onNavigate: Nav }) {
  const { show } = useToast();
  const { organizationIds, organizationName } = useIndustryScope();
  const [offers, setOffers] = useState<IndustrySupportOffer[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ supportTypes: ['MENTORSHIP'] as string[], description: '', capacity: '' });

  const organizationKey = organizationIds.join('|');
  useEffect(() => {
    const off = subscribeToIndustrySupportOffers(organizationIds, setOffers, e => setLoadError(e.message));
    setReady(true);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationKey]);

  function toggle(type: string) {
    setForm(current => ({ ...current, supportTypes: current.supportTypes.includes(type) ? current.supportTypes.filter(t => t !== type) : [...current.supportTypes, type] }));
  }

  async function create() {
    if (!form.description.trim()) { show('Describe the support you can provide.', 'error'); return; }
    if (!form.supportTypes.length) { show('Select at least one support type.', 'error'); return; }
    setBusy(true);
    try {
      await createIndustrySupportOffer({
        organizationId: organizationIds[0] || '', organizationName,
        supportTypes: form.supportTypes, description: form.description.trim(), capacity: form.capacity.trim(),
      });
      show('Support capability published.', 'success');
      setForm({ supportTypes: ['MENTORSHIP'], description: '', capacity: '' });
    } catch (e) { show((e as Error).message || 'Unable to publish the capability.', 'error'); }
    finally { setBusy(false); }
  }

  if (!ready) return <LoadingState label="Loading support capability…" />;

  return <div className="civic-page space-y-5">
    <BackLink route="/dashboard" label="Back to Overview" onNavigate={onNavigate} />
    <SectionHeader title="Industry Support & Deployment Capability" subtitle={`Declare the mentorship, testing, prototyping, cloud, manufacturing, funding, research and deployment resources ${organizationName || 'your organization'} can offer.`} />
    {loadError && <p className="text-sm text-error-600" role="alert">{loadError}</p>}

    <div className="grid sm:grid-cols-3 gap-4">
      <MetricCard label="Published capabilities" value={offers.length} icon={<Rocket size={18} />} />
      <MetricCard label="Support types covered" value={new Set(offers.flatMap(o => o.supportTypes)).size} icon={<Handshake size={18} />} color="secondary" />
      <MetricCard label="Available now" value={offers.filter(o => o.status === 'AVAILABLE').length} icon={<CheckCircle2 size={18} />} color="success" />
    </div>

    <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-5">
        <h3 className="font-semibold">Offer capability</h3>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {SUPPORT_TYPES.map(([type, Icon]) => <button key={type} type="button" aria-pressed={form.supportTypes.includes(type)} onClick={() => toggle(type)} className={`rounded-lg border p-3 text-left text-xs ${form.supportTypes.includes(type) ? 'border-primary-500 bg-primary-50' : 'border-neutral-200'}`}>
            <Icon size={16} className="mb-1" />{type.replaceAll('_', ' ')}
          </button>)}
        </div>
        <textarea className="input mt-3" rows={3} placeholder="Describe the support, facilities and eligibility conditions" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} aria-label="Support description" />
        <input className="input mt-2" placeholder="Capacity / availability" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} aria-label="Capacity" />
        <button className="btn-primary mt-3 w-full" disabled={busy || !form.description.trim() || !form.supportTypes.length} onClick={() => void create()}>Publish capability</button>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold">Published capabilities</h3>
        {!offers.length
          ? <div className="mt-3"><EmptyState icon={<Factory size={40} />} title="No capabilities published" description="Publish the support your organization can offer so projects can be matched to it." /></div>
          : <div className="space-y-2 mt-3">{offers.map(offer => <div key={offer.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <b className="text-sm text-primary-900">{offer.supportTypes.map(t => t.replaceAll('_', ' ')).join(', ') || 'General support'}</b>
              <span className="badge bg-primary-50 text-primary-700">{offer.status}</span>
            </div>
            <p className="text-sm text-neutral-600 mt-1">{offer.description}</p>
            {offer.capacity && <p className="text-xs text-neutral-500 mt-1">Capacity: {offer.capacity}</p>}
            <p className="text-xs text-neutral-400 mt-1">Published {formatDate(offer.createdAt)}</p>
          </div>)}</div>}
      </Card>
    </div>
  </div>;
}


/**
 * Real collaboration records for the signed-in organization, read from the same
 * `industryCollaborations` collection the Industry Overview already uses.
 * The previous Collaborations tab rendered a static organization directory that
 * contained every partner regardless of whether a collaboration existed.
 */
export function IndustryCollaborationsPage({ onNavigate }: { onNavigate: Nav }) {
  const { profile } = useAuth();
  const { challenges, loading, error } = usePlatform();
  const [rows, setRows] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [acceptingId, setAcceptingId] = useState('');

  const organizationIds = useMemo(() => industryOrganizationIds(profile), [profile?.id, profile?.organization_id]);
  const organizationKey = organizationIds.join('|');

  useEffect(() => {
    let active = true;
    if (!organizationIds.length) { setRows([]); setReady(true); return () => { active = false; }; }
    setReady(false);
    const unsubscribe = subscribeToIndustryCollaborations(records => {
      if (!active) return;
      setRows(dedupeIndustryCollaborations(records.filter(row => {
          const assignedToThisOrganization = [row.industryPartnerId, row.industry_partner_id, row.partnerId, row.partner_id]
            .some((id: unknown) => id && organizationIds.includes(String(id)));
          const openGuidanceRequest = String(row.requestType || '').toUpperCase() === 'GUIDANCE'
            && String(row.status || '').toUpperCase() === 'PENDING'
            && !row.industryPartnerId && !row.industry_partner_id && !row.partnerId && !row.partner_id;
          return assignedToThisOrganization || openGuidanceRequest;
        })));
      setReady(true);
    }, (failure: Error) => {
      if (!active) return;
      setLoadError(failure.message || 'Unable to load collaborations.');
      setReady(true);
    });
    return () => { active = false; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationKey]);

  const projects = useMemo(() => industryAcceptedProjects(challenges, organizationIds), [challenges, organizationKey]);
  const titleFor = (record: any) => {
    const challengeId = String(record.challengeId || record.challenge_id || record.projectId || record.project_id || '');
    return projects.find(p => p.id === challengeId)?.title || record.projectName || record.project_name || 'Project details unavailable';
  };

  async function acceptGuidanceRequest(record: any) {
    setAcceptingId(record.id);
    setActionError('');
    try {
      const accepted = await api.acceptIndustryGuidance(record.id);
      setRows(current => current.map(row => row.id === record.id ? { ...row, ...accepted } : row));
      if (accepted.notificationDelivery?.failed) {
        setActionError(`Request accepted, but ${accepted.notificationDelivery.failed} notification${accepted.notificationDelivery.failed === 1 ? ' was' : 's were'} not delivered.`);
      }
    } catch (failure) {
      setActionError((failure as Error).message || 'Unable to accept this guidance request.');
    } finally {
      setAcceptingId('');
    }
  }

  if (!ready) return <LoadingState label="Loading collaborations…" />;

  return <div className="civic-page space-y-5">
    <BackLink route="/dashboard" label="Back to Overview" onNavigate={onNavigate} />
    <SectionHeader title="Collaborations" subtitle="University and industry collaborations recorded for your organization." />
    {(error || loadError) && <p className="text-sm text-error-600" role="alert">{loadError || error}</p>}
    {actionError && <p className="text-sm text-error-600" role="alert">{actionError}</p>}

    <div className="grid sm:grid-cols-3 gap-4">
      <MetricCard label="Collaborations" value={rows.length} icon={<HeartHandshake size={18} />} />
      <MetricCard label="Active" value={rows.filter(r => ['ACCEPTED', 'IN_PROGRESS', 'ACTIVE'].includes(String(r.status || '').toUpperCase())).length} icon={<CheckCircle2 size={18} />} color="success" />
      <MetricCard label="Pending" value={rows.filter(r => String(r.status || '').toUpperCase() === 'PENDING').length} icon={<Users size={18} />} color="warning" />
    </div>

    {!rows.length
      ? <Card className="p-5"><EmptyState icon={<HeartHandshake size={40} />} title="No collaborations yet" description="University collaboration requests for your organization's projects will appear here once they are raised." action={<button className="btn-primary" onClick={() => onNavigate('/dashboard/projects')}>View My Projects</button>} /></Card>
      : <div className="grid md:grid-cols-2 gap-4">{rows.map(record => {
        const progress = Number(record.progress);
        const assignedToThisOrganization = [record.industryPartnerId, record.industry_partner_id, record.partnerId, record.partner_id]
          .some((id: unknown) => id && organizationIds.includes(String(id)));
        const unassigned = !record.industryPartnerId && !record.industry_partner_id && !record.partnerId && !record.partner_id;
        const canAcceptGuidance = String(record.requestType || '').toUpperCase() === 'GUIDANCE'
          && String(record.status || '').toUpperCase() === 'PENDING'
          && (unassigned || assignedToThisOrganization);
        return <Card className="p-5" key={record.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-primary-900">{titleFor(record)}</h3>
              <p className="text-xs text-neutral-500 mt-1">{record.universityName || record.university_name || 'University partner pending'}</p>
            </div>
            <span className="badge bg-primary-50 text-primary-700">{String(record.status || 'PENDING').replaceAll('_', ' ')}</span>
          </div>
          {record.requestedExpertise?.length ? <p className="text-sm text-neutral-600 mt-2">Support requested: {record.requestedExpertise.join(', ')}</p> : null}
          {record.requirement && <p className="text-sm text-neutral-600 mt-2">{record.requirement}</p>}
          {record.blocker && <p className="text-xs text-neutral-500 mt-1">Current blocker: {record.blocker}</p>}
          {record.supportTypes?.length ? <p className="text-xs text-neutral-500 mt-1">Support offered: {record.supportTypes.join(', ')}</p> : null}
          {Number.isFinite(progress) && <p className="text-xs text-neutral-500 mt-2">Progress {Math.max(0, Math.min(100, Math.round(progress)))}%</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            {canAcceptGuidance
              ? <button className="btn-primary" disabled={acceptingId === record.id} onClick={() => void acceptGuidanceRequest(record)}>{acceptingId === record.id ? 'Accepting…' : 'Accept guidance request'}</button>
              : null}
            {record.projectId || record.project_id || record.challengeId || record.challenge_id
              ? <button className="btn-secondary" onClick={() => onNavigate(`/dashboard/projects/${encodeURIComponent(String(record.projectId || record.project_id || record.challengeId || record.challenge_id))}`)}>Open project</button>
              : null}
            <button className="btn-ghost" onClick={() => onNavigate('/dashboard/industry-support')}>Industry support</button>
          </div>
        </Card>;
      })}</div>}

    {!rows.length && !projects.length && (
      <p className="text-xs text-neutral-500 text-center">Accept a Government-routed challenge to start a collaboration.</p>
    )}
  </div>;
}

