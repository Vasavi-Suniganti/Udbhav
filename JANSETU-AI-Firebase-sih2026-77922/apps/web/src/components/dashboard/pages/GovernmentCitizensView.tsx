import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, CalendarDays, CheckCircle2, ChevronRight, FileText, Filter, MapPin, MessageSquare, Search, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, EmptyState, ErrorState, LoadingState, MetricCard, PriorityBadge, SectionHeader } from '@/components/ui';

type Problem = {
  id: string;
  title: string;
  domain?: string;
  district?: string;
  block?: string;
  village?: string;
  priority?: string;
  priorityLevel?: string;
  priority_level?: string;
  governmentVerificationStatus?: string;
  currentStage?: string;
  challengeStatus?: string;
  progress?: number;
  communitySupportCount?: number;
  communityCommentCount?: number;
  evidence?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  submittedBy?: string;
};

type Citizen = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  district?: string;
  block?: string;
  village?: string;
  joinedAt?: string;
  role?: 'CITIZEN' | 'VOLUNTEER';
  problems: Problem[];
};

const journey = ['Reported', 'AI Analysis', 'Government Verification', 'University Assigned', 'Faculty Mentor', 'Industry Mentor', 'Prototype Development', 'Field Testing', 'Deployment', 'Deployed', 'Citizen Verification', 'Resolved'];
const districts = ['Ranchi', 'Khunti', 'Dhanbad', 'Hazaribagh', 'East Singhbhum'];
const dateValue = (value?: string) => value ? new Date(value).getTime() : 0;
const displayDate = (value?: string) => value && !Number.isNaN(dateValue(value)) ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const priorityFor = (problem: Problem) => String(problem.priorityLevel || problem.priority_level || (typeof problem.priority === 'string' ? problem.priority : '') || 'MEDIUM').toUpperCase();
const locationFor = (citizen: Citizen, problem?: Problem) => [problem?.village || citizen.village, problem?.block || citizen.block, problem?.district || citizen.district].filter(Boolean).join(', ') || 'Location unavailable';
const isVolunteer = (citizen: Citizen) => String(citizen.role || 'CITIZEN').toUpperCase() === 'VOLUNTEER';
const isActive = (citizen: Citizen) => Date.now() - Math.max(...citizen.problems.map(problem => dateValue(problem.updatedAt || problem.createdAt)), dateValue(citizen.joinedAt)) < 90 * 86400000;

export function summarizeVolunteerContributors(rows: Citizen[]) {
  return rows
    .filter(row => isVolunteer(row) && row.problems.length > 0)
    .map(row => {
      const uniqueDistricts = [...new Set(row.problems.map(problem => problem.district || problem.block || 'Location unavailable').filter(Boolean))];
      const latest = row.problems.slice().sort((a, b) => dateValue(b.updatedAt || b.createdAt) - dateValue(a.updatedAt || a.createdAt))[0];
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        location: uniqueDistricts.join(', ') || row.district || 'Location unavailable',
        problemsSubmitted: row.problems.length,
        latestActivity: latest?.updatedAt || latest?.createdAt || row.joinedAt || '',
        role: 'VOLUNTEER' as const,
      };
    })
    .sort((left, right) => dateValue(right.latestActivity) - dateValue(left.latestActivity));
}

function initials(name: string) { return name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
function stageIndex(problem: Problem) {
  const current = String(problem.currentStage || problem.challengeStatus || '').toUpperCase();
  if (current === 'RESOLVED') return journey.length - 1;
  const aliases: Record<string, number> = { REPORTED: 0, AI_ANALYSIS: 1, GOVERNMENT_VERIFIED: 2, UNIVERSITY_ASSIGNED: 3, FACULTY_MENTOR_ASSIGNED: 4, INDUSTRY_MENTOR_ASSIGNED: 5, SOLUTION_DEVELOPMENT: 6, PROTOTYPE: 6, FIELD_TESTING: 7, DEPLOYMENT: 8, DEPLOYED: 9, CITIZEN_VERIFICATION: 10 };
  return aliases[current] ?? (problem.governmentVerificationStatus === 'VERIFIED' ? 2 : 0);
}

export default function GovernmentCitizensView() {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [activity, setActivity] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CITIZENS' | 'VOLUNTEERS'>('ALL');
  const [selected, setSelected] = useState<Citizen | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Citizen | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try { setCitizens(await api.governmentCitizens()); } catch (e) { setError((e as Error).message || 'Unable to load citizens.'); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const citizenRows = useMemo(() => citizens.filter(citizen => !isVolunteer(citizen)), [citizens]);
  const volunteerRows = useMemo(() => summarizeVolunteerContributors(citizens), [citizens]);

  const filteredCitizens = useMemo(() => citizenRows.filter(citizen => {
    const text = `${citizen.name} ${citizen.email || ''} ${citizen.district || ''} ${citizen.block || ''} ${citizen.village || ''}`.toLowerCase();
    const citizenPriority = citizen.problems.some(problem => priority === 'ALL' || priorityFor(problem) === priority);
    const matchesActivity = activity === 'ALL' || (activity === 'ACTIVE' ? isActive(citizen) : !isActive(citizen));
    const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? isActive(citizen) : !isActive(citizen));
    const matchesRole = roleFilter === 'ALL' || roleFilter === 'CITIZENS';
    return matchesRole && text.includes(query.toLowerCase()) && (district === 'ALL' || citizen.district === district) && matchesStatus && matchesActivity && citizenPriority;
  }), [citizenRows, query, district, status, activity, priority, roleFilter]);

  const filteredVolunteers = useMemo(() => volunteerRows.filter(volunteer => {
    const text = `${volunteer.name} ${volunteer.email || ''} ${volunteer.location || ''}`.toLowerCase();
    const matchesRole = roleFilter === 'ALL' || roleFilter === 'VOLUNTEERS';
    return matchesRole && text.includes(query.toLowerCase()) && (district === 'ALL' || volunteer.location.includes(district));
  }), [volunteerRows, query, district, roleFilter]);

  const totals = useMemo(() => ({
    problems: citizens.reduce((sum, citizen) => sum + citizen.problems.length, 0),
    active: citizenRows.filter(isActive).length,
    contributors: volunteerRows.length,
  }), [citizens, citizenRows, volunteerRows]);

  if (loading) return <LoadingState label="Loading citizen records…" />;
  if (error) return <ErrorState title="Could not load citizens" description={error} onRetry={() => void load()} />;

  return <div className="civic-page space-y-5">
    <SectionHeader title="Citizens" subtitle="View citizens, their reported community problems, participation, and progress across UDBHAV." action={<div className="flex flex-wrap gap-2"><label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input className="input pl-9 w-56" placeholder="Search citizens or volunteers..." value={query} onChange={event => setQuery(event.target.value)} /></label><button className="btn-secondary"><Filter size={15} /> Filter</button></div>} />

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <MetricCard label="Total Citizens" value={citizenRows.length} icon={<Users size={18} />} />
      <MetricCard label="Active Citizens" value={totals.active} icon={<Activity size={18} />} color="success" />
      <MetricCard label="Problems Reported" value={totals.problems} icon={<FileText size={18} />} color="warning" />
      <MetricCard label="Community Contributors" value={totals.contributors} icon={<MessageSquare size={18} />} color="secondary" />
    </div>

    <Card className="overflow-hidden">
      <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center gap-2">
        <select className="input w-auto text-xs" value={district} onChange={event => setDistrict(event.target.value)}><option value="ALL">All districts</option>{districts.map(item => <option key={item}>{item}</option>)}</select>
        <select className="input w-auto text-xs" value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">All status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
        <select className="input w-auto text-xs" value={activity} onChange={event => setActivity(event.target.value)}><option value="ALL">All activity</option><option value="ACTIVE">Recently active</option><option value="INACTIVE">No recent activity</option></select>
        <select className="input w-auto text-xs" value={priority} onChange={event => setPriority(event.target.value)}><option value="ALL">All priorities</option>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(item => <option key={item}>{item}</option>)}</select>
        <select className="input w-auto text-xs" value={roleFilter} onChange={event => setRoleFilter(event.target.value as 'ALL' | 'CITIZENS' | 'VOLUNTEERS')}><option value="ALL">All</option><option value="CITIZENS">Citizens</option><option value="VOLUNTEERS">Volunteers</option></select>
        <span className="text-xs text-neutral-400 ml-auto">{filteredCitizens.length} citizens</span>
      </div>
      {filteredCitizens.length === 0 ? <EmptyState icon={<Users size={38} />} title="No citizens found" description="Try changing the search or filters." /> : <>
        <div className="hidden lg:block overflow-x-auto"><table className="w-full text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr>{['Citizen', 'Location', 'Problems Reported', 'Supported', 'Comments', 'Latest Activity', 'Status', 'Action'].map(label => <th className="text-left p-4 whitespace-nowrap" key={label}>{label}</th>)}</tr></thead><tbody>{filteredCitizens.map(citizen => <CitizenRow key={citizen.id} citizen={citizen} onView={() => { setSelected(citizen); setSelectedProblem(null); }} />)}</tbody></table></div>
        <div className="lg:hidden divide-y divide-neutral-200">{filteredCitizens.map(citizen => <CitizenCard key={citizen.id} citizen={citizen} onView={() => { setSelected(citizen); setSelectedProblem(null); }} />)}</div>
      </>}
    </Card>

    <Card className="overflow-hidden">
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-primary-900">Community Contributors</h3>
          <p className="text-xs text-neutral-500">Volunteers who have submitted problems from local communities.</p>
        </div>
        <span className="badge bg-secondary-50 text-secondary-700">{filteredVolunteers.length}</span>
      </div>
      {filteredVolunteers.length === 0 ? <EmptyState icon={<MessageSquare size={38} />} title="No community contributors yet." description="Volunteers will appear here when they have actual submitted problem reports." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr>{['Volunteer', 'Location', 'Problems Submitted', 'Latest Activity', 'Status', 'View'].map(label => <th className="text-left p-4 whitespace-nowrap" key={label}>{label}</th>)}</tr></thead><tbody>{filteredVolunteers.map(volunteer => <VolunteerRow key={volunteer.id} volunteer={volunteer} onView={() => { setSelectedVolunteer({ id: volunteer.id, name: volunteer.name, email: volunteer.email, district: volunteer.location, role: 'VOLUNTEER', problems: citizens.find(item => item.id === volunteer.id)?.problems || [] }); setSelectedProblem(null); }} />)}</tbody></table></div>}
    </Card>

    {selected && <CitizenDetails citizen={selected} selectedProblem={selectedProblem} onClose={() => { setSelected(null); setSelectedProblem(null); }} onProblem={setSelectedProblem} />}
    {selectedVolunteer && <VolunteerDetails volunteer={selectedVolunteer} onClose={() => { setSelectedVolunteer(null); setSelectedProblem(null); }} onSelectProblem={setSelectedProblem} />}
  </div>;
}

function CitizenRow({ citizen, onView }: { citizen: Citizen; onView: () => void }) {
  const problems = citizen.problems;
  const supported = problems.reduce((sum, problem) => sum + Number(problem.communitySupportCount || 0), 0);
  const comments = problems.reduce((sum, problem) => sum + Number(problem.communityCommentCount || 0), 0);
  const latest = problems.slice().sort((a, b) => dateValue(b.updatedAt || b.createdAt) - dateValue(a.updatedAt || a.createdAt))[0];
  return <tr className="border-t border-neutral-200 hover:bg-primary-50/30"><td className="p-4"><div className="flex items-center gap-3"><Avatar citizen={citizen} /><div><b>{citizen.name}</b><div className="text-xs text-neutral-400">{citizen.email || 'Citizen account'}</div></div></div></td><td className="p-4 text-neutral-600">{locationFor(citizen, latest)}</td><td className="p-4 font-semibold">{problems.length}</td><td className="p-4">{supported}</td><td className="p-4">{comments}</td><td className="p-4 text-neutral-500">{displayDate(latest?.updatedAt || latest?.createdAt)}</td><td className="p-4"><span className={`badge ${isActive(citizen) ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-600'}`}>{isActive(citizen) ? 'Active' : 'Inactive'}</span></td><td className="p-4"><button className="btn-secondary text-xs" onClick={onView}>View <ChevronRight size={14} /></button></td></tr>;
}

function CitizenCard({ citizen, onView }: { citizen: Citizen; onView: () => void }) { return <div className="p-4 space-y-3"><div className="flex items-center gap-3"><Avatar citizen={citizen} /><div className="flex-1"><b>{citizen.name}</b><p className="text-xs text-neutral-500">{locationFor(citizen)}</p></div><span className={`badge ${isActive(citizen) ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-600'}`}>{isActive(citizen) ? 'Active' : 'Inactive'}</span></div><div className="grid grid-cols-3 gap-2 text-xs text-neutral-500"><span><b className="block text-lg text-primary-900">{citizen.problems.length}</b>Problems</span><span><b className="block text-lg text-primary-900">{citizen.problems.reduce((sum, problem) => sum + Number(problem.communitySupportCount || 0), 0)}</b>Supported</span><span><b className="block text-lg text-primary-900">{citizen.problems.reduce((sum, problem) => sum + Number(problem.communityCommentCount || 0), 0)}</b>Comments</span></div><button className="btn-secondary w-full justify-center" onClick={onView}>View citizen <ChevronRight size={14} /></button></div>; }

function VolunteerRow({ volunteer, onView }: { volunteer: { id: string; name: string; email?: string; location: string; problemsSubmitted: number; latestActivity: string; role: 'VOLUNTEER' }; onView: () => void }) {
  const status = volunteer.problemsSubmitted > 0 ? 'Active' : 'Inactive';
  return <tr className="border-t border-neutral-200 hover:bg-secondary-50/30"><td className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-secondary-100 text-secondary-700 grid place-items-center text-xs font-bold">{initials(volunteer.name)}</div><div><b>{volunteer.name}</b><div className="text-xs text-neutral-400">{volunteer.email || 'Volunteer account'}</div></div></div></td><td className="p-4 text-neutral-600">{volunteer.location || 'Location unavailable'}</td><td className="p-4 font-semibold text-primary-900">{volunteer.problemsSubmitted}</td><td className="p-4 text-neutral-500">{displayDate(volunteer.latestActivity)}</td><td className="p-4"><span className={`badge ${status === 'Active' ? 'bg-success-50 text-success-700' : 'bg-neutral-100 text-neutral-600'}`}>{status}</span></td><td className="p-4"><button className="btn-secondary text-xs" onClick={onView}>View <ChevronRight size={14} /></button></td></tr>;
}

function VolunteerDetails({ volunteer, onClose, onSelectProblem }: { volunteer: Citizen; onClose: () => void; onSelectProblem: (problem: Problem) => void }) {
  const latest = volunteer.problems.slice().sort((a, b) => dateValue(b.updatedAt || b.createdAt) - dateValue(a.updatedAt || a.createdAt))[0];
  const uniqueLocations = [...new Set(volunteer.problems.map(problem => [problem.village, problem.block, problem.district].filter(Boolean).join(', ')).filter(Boolean))];
  const openProblem = (problem: Problem) => {
    onSelectProblem(problem);
    onClose();
    if (problem.id) {
      window.location.hash = `/dashboard/challenges?challenge=${encodeURIComponent(problem.id)}`;
    }
  };

  return <div className="fixed inset-0 z-50 bg-primary-950/30 p-3 sm:p-6 flex justify-end" onMouseDown={event => event.currentTarget === event.target && onClose()}><aside className="w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#fffaf0] shadow-2xl border border-neutral-200"><div className="sticky top-0 z-10 bg-[#fffaf0]/95 backdrop-blur border-b border-neutral-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-secondary-100 text-secondary-700 grid place-items-center text-xs font-bold">{initials(volunteer.name)}</div><div className="flex-1"><h2 className="font-bold text-primary-900">{volunteer.name}</h2><p className="text-xs text-neutral-500">Volunteer profile · {volunteer.email || 'Volunteer account'}</p></div><button className="p-2 rounded-full hover:bg-neutral-100" onClick={onClose} aria-label="Close"><X size={18} /></button></div><div className="p-4 sm:p-6 space-y-6"><div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><DetailStat label="Problems Submitted" value={volunteer.problems.length} /><DetailStat label="Locations" value={uniqueLocations.length || 1} /><DetailStat label="Latest" value={displayDate(latest?.updatedAt || latest?.createdAt)} /><DetailStat label="Role" value="Volunteer" /></div><div className="grid sm:grid-cols-2 gap-3 text-sm"><Info label="Location" value={uniqueLocations.join(' · ') || locationFor(volunteer)} icon={<MapPin size={15} />} /><Info label="Submitted by" value={volunteer.name} icon={<UserRound size={15} />} /><Info label="Latest submission" value={displayDate(latest?.updatedAt || latest?.createdAt)} icon={<CalendarDays size={15} />} /><Info label="Account status" value={volunteer.problems.length > 0 ? 'Active' : 'Inactive'} icon={<ShieldCheck size={15} />} /></div><div><h3 className="font-bold text-primary-900 mb-3">Submitted Problems</h3>{volunteer.problems.length === 0 ? <p className="text-sm text-neutral-500">No submitted problems recorded.</p> : <div className="space-y-2">{volunteer.problems.slice().sort((a, b) => dateValue(b.updatedAt || b.createdAt) - dateValue(a.updatedAt || a.createdAt)).map(problem => <button key={problem.id} className="w-full text-left rounded-xl border border-neutral-200 bg-white p-3 hover:border-primary-300 transition" onClick={() => openProblem(problem)}><div className="flex items-center justify-between gap-3"><div><h4 className="font-semibold text-primary-900">{problem.title || 'Untitled problem'}</h4><p className="text-xs text-neutral-500">{problem.district || 'Location unavailable'} {problem.block ? `· ${problem.block}` : ''}</p></div><ChevronRight size={16} className="text-primary-600" /></div><div className="mt-2 flex flex-wrap gap-2 text-[11px] text-neutral-500"><span>Stage: {problem.currentStage || problem.challengeStatus || 'REPORTED'}</span><span>Verified: {problem.governmentVerificationStatus || 'PENDING'}</span></div></button>)}</div>}</div></div></aside></div>;
}

function Avatar({ citizen }: { citizen: Citizen }) { return citizen.avatarUrl ? <img src={citizen.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 grid place-items-center text-xs font-bold">{initials(citizen.name)}</div>; }

function CitizenDetails({ citizen, selectedProblem, onClose, onProblem }: { citizen: Citizen; selectedProblem: Problem | null; onClose: () => void; onProblem: (problem: Problem) => void }) {
  const reported = citizen.problems.filter(problem => problem.governmentVerificationStatus === 'VERIFIED').length;
  const resolved = citizen.problems.filter(problem => String(problem.currentStage || problem.challengeStatus).toUpperCase() === 'RESOLVED').length;
  const evidence = citizen.problems.reduce((sum, problem) => sum + (problem.evidence?.length || 0), 0);
  return <div className="fixed inset-0 z-50 bg-primary-950/30 p-3 sm:p-6 flex justify-end" onMouseDown={event => event.currentTarget === event.target && onClose()}><aside className="w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#fffaf0] shadow-2xl border border-neutral-200"><div className="sticky top-0 z-10 bg-[#fffaf0]/95 backdrop-blur border-b border-neutral-200 p-4 flex items-center gap-3"><Avatar citizen={citizen} /><div className="flex-1"><h2 className="font-bold text-primary-900">{citizen.name}</h2><p className="text-xs text-neutral-500">Citizen profile · {citizen.email || 'Firebase account'}</p></div><button className="p-2 rounded-full hover:bg-neutral-100" onClick={onClose} aria-label="Close"><X size={18} /></button></div><div className="p-4 sm:p-6 space-y-6"><div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><DetailStat label="Reported" value={citizen.problems.length} /><DetailStat label="Verified" value={reported} /><DetailStat label="Resolved" value={resolved} /><DetailStat label="Evidence" value={evidence} /></div><div className="grid sm:grid-cols-2 gap-3 text-sm"><Info label="Location" value={locationFor(citizen)} icon={<MapPin size={15} />} /><Info label="Joined" value={displayDate(citizen.joinedAt)} icon={<CalendarDays size={15} />} /><Info label="Last activity" value={displayDate(citizen.problems.slice().sort((a, b) => dateValue(b.updatedAt || b.createdAt) - dateValue(a.updatedAt || a.createdAt))[0]?.updatedAt)} icon={<Activity size={15} />} /><Info label="Account status" value={isActive(citizen) ? 'Active' : 'Inactive'} icon={<UserRound size={15} />} /></div><div><h3 className="font-bold text-primary-900 mb-3">Participation</h3><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"><DetailStat label="Supports" value={citizen.problems.reduce((sum, problem) => sum + Number(problem.communitySupportCount || 0), 0)} /><DetailStat label="Comments" value={citizen.problems.reduce((sum, problem) => sum + Number(problem.communityCommentCount || 0), 0)} /><DetailStat label="Evidence" value={evidence} /><DetailStat label="Priorities influenced" value={citizen.problems.filter(problem => Number(problem.communitySupportCount || 0) > 0).length} /></div></div><div><h3 className="font-bold text-primary-900 mb-3">Reported problems</h3>{citizen.problems.length === 0 ? <p className="text-sm text-neutral-500">No problems reported yet.</p> : <div className="space-y-2">{citizen.problems.map(problem => <button key={problem.id} className={`w-full text-left p-3 rounded-xl border transition ${selectedProblem?.id === problem.id ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-primary-300'}`} onClick={() => onProblem(problem)}><div className="flex gap-3 items-start"><FileText size={17} className="mt-0.5 text-primary-600" /><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-primary-900">{problem.title}</b><PriorityBadge level={priorityFor(problem)} /></div><p className="text-xs text-neutral-500 mt-1">{problem.domain || 'Community problem'} · {locationFor(citizen, problem)}</p><div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-2"><span>{problem.governmentVerificationStatus || 'PENDING'}</span><span>{problem.currentStage || 'REPORTED'}</span><span>{problem.progress ?? 0}% progress</span></div></div><ChevronRight size={16} className="text-neutral-400" /></div></button>)}</div>}</div>{selectedProblem && <ProblemJourney problem={selectedProblem} citizen={citizen} />}</div></aside></div>;
}
function ProblemJourney({ problem, citizen }: { problem: Problem; citizen: Citizen }) { const current = stageIndex(problem); return <div className="border-t border-neutral-200 pt-5"><div className="flex items-center justify-between gap-3 mb-3"><div><h3 className="font-bold text-primary-900">Problem journey</h3><p className="text-xs text-neutral-500">Same Firestore record · reported {displayDate(problem.createdAt)}</p></div><span className="text-sm font-bold text-primary-700">{problem.progress ?? 0}%</span></div><div className="h-2 rounded-full bg-neutral-200 overflow-hidden mb-5"><div className="h-full bg-primary-600 rounded-full" style={{ width: `${Math.min(100, Math.max(0, Number(problem.progress || 0)))}%` }} /></div><div className="space-y-3">{journey.map((stage, index) => <div key={stage} className="flex items-center gap-3 text-sm"><span className={`w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${index <= current ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-500'}`}>{index <= current ? <CheckCircle2 size={14} /> : index + 1}</span><span className={index <= current ? 'font-semibold text-primary-900' : 'text-neutral-500'}>{stage}</span>{index === current && <span className="ml-auto badge bg-primary-50 text-primary-700">Current</span>}</div>)}</div><p className="text-xs text-neutral-400 mt-4">{locationFor(citizen, problem)}</p></div>; }
function DetailStat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3"><div className="text-xl font-bold text-primary-900">{value}</div><div className="text-[11px] text-neutral-500">{label}</div></div>; }
function Info({ label, value, icon }: { label: string; value: string; icon: ReactNode }) { return <div className="flex items-start gap-2 p-3 rounded-xl border border-neutral-200 bg-white/50"><span className="text-primary-600 mt-0.5">{icon}</span><div><div className="text-[11px] uppercase tracking-wide text-neutral-400">{label}</div><div className="text-sm font-semibold text-primary-900">{value}</div></div></div>; }
