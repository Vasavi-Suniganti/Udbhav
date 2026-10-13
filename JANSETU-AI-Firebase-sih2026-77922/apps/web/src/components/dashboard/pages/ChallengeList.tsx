import { useEffect, useState } from 'react';
import { Search, MapPin, Clock, FileText, X, CheckCircle2, Circle, ChevronRight, ShieldCheck, GraduationCap, BriefcaseBusiness, BrainCircuit, Users, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { Card, EmptyState, LoadingState } from '@/components/ui';
import { usePlatform } from '@/context/PlatformContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { CHALLENGE_STATUS_CONFIG, PRIORITY_CONFIG, ISSUE_TYPE_CONFIG, formatDate, timeAgo } from '@/lib/constants';
import type { Challenge, ChallengeStatus, PriorityLevel } from '@/types';
import { getProblemFallbackImage, getProblemImage } from '@/lib/problemImages';

type MyProblem = Challenge & {
  isDemo?: boolean;
  displayCategory?: string;
  demoStatus?: string;
  demoVerified?: boolean;
  communitySupport?: number;
  communityComments?: number;
  communityEvidence?: number;
  universityName?: string;
  studentTeam?: string;
  facultyMentor?: string;
  industryPartner?: string;
  industryMentor?: string;
  industrySupport?: string;
  currentProgress?: string;
  progressPercent?: number;
  nextMilestone?: string;
  impact?: string[];
};

// Prototype-only fallback. Real user-owned challenges always take precedence.
const DEMO_MY_PROBLEMS: MyProblem[] = [
  { id: 'demo-my-1', challenge_code: 'DEMO-MY-001', isDemo: true, displayCategory: 'Water & Sanitation', title: 'Monsoon Drinking Water Contamination', description: 'During the monsoon, drinking water in several rural communities becomes contaminated and difficult to use. Residents have reported concerns about water quality and sanitation.', domain: 'Water Resources', issue_type: 'INNOVATION_OPPORTUNITY', status: 'VALIDATED', priority_score: 82, priority_level: 'HIGH', submitted_by: 'demo-citizen', submitted_by_name: 'Citizen', district: 'Ranchi', affected_population: 4500, created_at: '2026-09-15T08:30:00Z', updated_at: '2026-09-15T08:30:00Z', demoStatus: 'Under Government Review', demoVerified: true, currentStage: 'GOVERNMENT_VERIFIED', progress: 25, progressPercent: 25, communitySupport: 24, communityComments: 0, communityEvidence: 0, universityName: 'Not Assigned', facultyMentor: 'Not Assigned', studentTeam: 'Not Assigned', industryPartner: 'Not Assigned', industryMentor: 'Not Assigned', industrySupport: 'Not Assigned' },
  { id: 'demo-my-2', challenge_code: 'DEMO-MY-002', isDemo: true, displayCategory: 'Road Safety', title: 'Unsafe Road Crossing Near Primary School', description: 'Students and residents face difficulty crossing a busy road near a primary school, especially during school opening and closing hours.', domain: 'Transport', issue_type: 'CRITICAL_SAFETY', status: 'ASSIGNED', priority_score: 96, priority_level: 'CRITICAL', submitted_by: 'demo-citizen', submitted_by_name: 'Citizen', district: 'Dhanbad', affected_population: 320, created_at: '2026-09-12T08:30:00Z', updated_at: '2026-09-12T08:30:00Z', demoStatus: 'University Assigned', demoVerified: true, currentStage: 'UNIVERSITY_ASSIGNED', progress: 40, progressPercent: 40, communitySupport: 41, communityComments: 0, communityEvidence: 0, universityName: 'IIT (ISM) Dhanbad', facultyMentor: 'Dr. Meera Singh', studentTeam: 'SafeRoute Student Team', industryPartner: 'Not Assigned', industryMentor: 'Not Assigned', industrySupport: 'Not Assigned' },
  { id: 'demo-my-3', challenge_code: 'DEMO-MY-003', isDemo: true, displayCategory: 'Agriculture & Rural Livelihoods', title: 'Crop Damage From Wild Elephants', description: 'Forest-edge farmers are experiencing repeated crop damage caused by wild elephant movement. The community needs a practical early-warning and crop-protection solution.', domain: 'Agriculture', issue_type: 'RESEARCH_CHALLENGE', status: 'ASSIGNED', priority_score: 86, priority_level: 'HIGH', submitted_by: 'demo-citizen', submitted_by_name: 'Citizen', district: 'East Singhbhum', affected_population: 2100, created_at: '2026-09-10T08:30:00Z', updated_at: '2026-09-10T08:30:00Z', demoStatus: 'Industry Mentor Assigned', demoVerified: true, currentStage: 'INDUSTRY_MENTOR_ASSIGNED', progress: 55, progressPercent: 55, communitySupport: 32, communityComments: 0, communityEvidence: 0, universityName: 'Birsa Agricultural University', facultyMentor: 'Dr. Priya Verma', studentTeam: 'AgriGuard Team', industryPartner: 'GreenTech Innovations', industryMentor: 'Karthik Reddy', industrySupport: 'Early-warning system and crop-protection mentoring' },
  { id: 'demo-my-4', challenge_code: 'DEMO-MY-004', isDemo: true, displayCategory: 'Education & Digital Inclusion', title: 'Digital Literacy Training for Rural Women', description: 'Women in several rural communities need access to basic digital literacy training, including online services, digital payments and government portals.', domain: 'Digital Inclusion', issue_type: 'INNOVATION_OPPORTUNITY', status: 'PENDING_VALIDATION', priority_score: 62, priority_level: 'MEDIUM', submitted_by: 'demo-citizen', submitted_by_name: 'Citizen', district: 'Khunti', affected_population: 1800, created_at: '2026-09-08T08:30:00Z', updated_at: '2026-09-08T08:30:00Z', demoStatus: 'Under Government Review', demoVerified: false, currentStage: 'GOVERNMENT_VERIFIED', progress: 15, progressPercent: 15, communitySupport: 18, communityComments: 0, communityEvidence: 0, universityName: 'Not Assigned', facultyMentor: 'Not Assigned', studentTeam: 'Not Assigned', industryPartner: 'Not Assigned', industryMentor: 'Not Assigned', industrySupport: 'Not Assigned' },
  { id: 'demo-my-5', challenge_code: 'DEMO-MY-005', isDemo: true, displayCategory: 'Energy & Rural Development', title: 'Solar Microgrid for Remote Tribal Hamlet', description: 'A remote tribal hamlet has limited access to reliable electricity. A small-scale solar microgrid could support household electricity needs and essential community services.', domain: 'Energy', issue_type: 'INNOVATION_OPPORTUNITY', status: 'OPEN_FOR_INSTITUTIONS', priority_score: 84, priority_level: 'HIGH', submitted_by: 'demo-citizen', submitted_by_name: 'Citizen', district: 'Latehar', affected_population: 280, created_at: '2026-09-05T08:30:00Z', updated_at: '2026-09-05T08:30:00Z', demoStatus: 'Solution Development', demoVerified: true, currentStage: 'PROTOTYPE', progress: 65, progressPercent: 65, communitySupport: 37, communityComments: 0, communityEvidence: 0, universityName: 'NIT Jamshedpur', facultyMentor: 'Dr. Vikram Rao', studentTeam: 'SuryaGram Team', industryPartner: 'SolarGrid Innovations', industryMentor: 'Neha Patel', industrySupport: 'Solar system design and battery technology support' },
  { id: 'demo-my-6', challenge_code: 'DEMO-MY-006', isDemo: true, displayCategory: 'Agriculture & Food Security', title: 'Post-Harvest Grain Storage Problem', description: 'Farmers are facing grain losses after harvesting because suitable local storage facilities are limited.', domain: 'Agriculture', issue_type: 'RESEARCH_CHALLENGE', status: 'ASSIGNED', priority_score: 55, priority_level: 'MEDIUM', submitted_by: 'demo-citizen', submitted_by_name: 'Citizen', district: 'Giridih', affected_population: 5200, created_at: '2026-09-02T08:30:00Z', updated_at: '2026-09-02T08:30:00Z', demoStatus: 'Resolved', demoVerified: true, currentStage: 'RESOLVED', progress: 100, progressPercent: 100, communitySupport: 29, communityComments: 0, communityEvidence: 0, universityName: 'Birsa Agricultural University', facultyMentor: 'Dr. Suresh Kumar', studentTeam: 'GrainSafe Team', industryPartner: 'Rural Storage Technologies', industryMentor: 'Ananya Singh', industrySupport: 'Low-cost storage design and field deployment' },
];

function formatProblemDate(date: unknown): string {
  if (!date) return 'Date unavailable';
  let value: Date;
  if (date instanceof Date) value = date;
  else if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as { toDate?: unknown }).toDate === 'function') value = (date as { toDate: () => Date }).toDate();
  else if (typeof date === 'object' && date !== null && 'seconds' in date) value = new Date(Number((date as { seconds: number }).seconds) * 1000);
  else if (typeof date === 'number') value = new Date(date);
  else value = new Date(String(date));
  return Number.isNaN(value.getTime()) ? 'Date unavailable' : value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface ChallengeListProps {
  onNavigate: (route: string) => void;
  personal?: boolean;
}

export default function ChallengeList({ onNavigate, personal = false }: ChallengeListProps) {
  if (personal) return <MyProblemsPage />;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const { challenges: sourceChallenges, loading } = usePlatform();
  let challenges = sourceChallenges;

  if (search) {
    const q = search.toLowerCase();
    challenges = challenges.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q)
    );
  }
  if (statusFilter !== 'ALL') challenges = challenges.filter((c) => c.status === statusFilter);
  if (domainFilter !== 'ALL') challenges = challenges.filter((c) => c.domain === domainFilter);
  if (priorityFilter !== 'ALL') challenges = challenges.filter((c) => c.priority_level === priorityFilter);

  const domains = [...new Set(sourceChallenges.map((c) => c.domain))];

  return (
    <div className="civic-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Innovation Challenges</h1>
        <p className="text-sm text-neutral-500 mt-1">Browse and filter all societal challenges across Jharkhand.</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="input pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
            <option value="ALL">All Statuses</option>
            {Object.entries(CHALLENGE_STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="input">
            <option value="ALL">All Domains</option>
            {domains.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input">
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? <LoadingState label="Loading challenges..." /> : challenges.length === 0 ? (
        <EmptyState icon={<FileText size={40} />} title="No challenges found" description="Try adjusting your filters or search terms." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {challenges.map((ch) => (
            <ChallengeCard key={ch.id} challenge={ch} onClick={() => onNavigate('/dashboard/challenges')} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChallengeCard({ challenge, onClick }: { challenge: Challenge; onClick: () => void }) {
  const statusConfig = CHALLENGE_STATUS_CONFIG[challenge.status as ChallengeStatus];
  const priorityConfig = PRIORITY_CONFIG[challenge.priority_level as PriorityLevel];
  const issueConfig = ISSUE_TYPE_CONFIG[challenge.issue_type];

  return (
    <button onClick={onClick} className="card-hover dashboard-problem-card p-5 text-left w-full">
      <span className="dashboard-problem-image">
        <img src={getProblemImage(challenge)} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = getProblemFallbackImage(challenge); }} />
      </span>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`badge ${statusConfig?.bg} ${statusConfig?.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig?.dot}`} />
            {statusConfig?.label}
          </span>
          <span className={`badge ${issueConfig?.bg} ${issueConfig?.color}`}>{issueConfig?.label}</span>
        </div>
        <span className={`badge ${priorityConfig?.bg} ${priorityConfig?.color} border ${priorityConfig?.border}`}>
          {challenge.priority_level}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-neutral-900 leading-snug mb-2">{challenge.title}</h3>
      <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 mb-3">{challenge.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="badge bg-primary-50 text-primary-700">{challenge.domain}</span>
        {challenge.tags?.slice(0, 3).map((t) => (
          <span key={t} className="badge bg-neutral-100 text-neutral-600">#{t}</span>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-neutral-400 pt-3 border-t border-neutral-100">
        <span className="flex items-center gap-1"><MapPin size={12} /> {challenge.district}</span>
        {challenge.affected_population && <span className="flex items-center gap-1"><Users size={12} /> {challenge.affected_population.toLocaleString('en-IN')}</span>}
        <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(challenge.created_at)}</span>
        <span className="ml-auto font-mono text-[10px]">{challenge.challenge_code}</span>
      </div>
    </button>
  );
}

function MyProblemsPage() {
  const { challenges, projects, universities, loading } = usePlatform();
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [priority, setPriority] = useState('ALL');
  const [selected, setSelected] = useState<MyProblem | null>(null);
  const [community, setCommunity] = useState<any>(null);
  const realProblems = challenges.filter((challenge) => challenge.source === 'firestore' && (!profile || challenge.submitted_by === profile.id));
  const displayProblems: MyProblem[] = realProblems as MyProblem[];
  const resolvedIds = new Set(projects.filter((project) => ['COMPLETED', 'ARCHIVED'].includes(project.status)).map((project) => project.challenge_id));
  const isResolved = (challenge: MyProblem) => challenge.demoStatus === 'Resolved' || resolvedIds.has(challenge.id) || ['RESOLVED', 'COMPLETED', 'CLOSED'].includes(String(challenge.currentStage || challenge.status).toUpperCase());
  const isUnderReview = (challenge: MyProblem) => challenge.demoStatus === 'Under Government Review' || ['SUBMITTED', 'AI_PROCESSED', 'PENDING_VALIDATION', 'FIELD_VERIFICATION'].includes(challenge.status) || String(challenge.currentStage || '').toUpperCase() === 'GOVERNMENT_VERIFIED' && String(challenge.governmentVerificationStatus || '').toUpperCase() !== 'VERIFIED';
  const isInProgress = (challenge: MyProblem) => !isResolved(challenge) && !isUnderReview(challenge) && Boolean(challenge.currentStage || challenge.demoStatus || projects.find((project) => project.challenge_id === challenge.id));
  const filtered = displayProblems.filter((challenge) => {
    const term = search.toLowerCase();
    const matchesSearch = !term || `${challenge.title} ${challenge.district} ${challenge.domain} ${challenge.displayCategory || ''} ${challenge.description} ${challenge.universityName || ''} ${challenge.industryPartnerName || challenge.industryPartner || ''}`.toLowerCase().includes(term);
    const resolved = isResolved(challenge);
    const matchesScope = scope === 'ALL' || (scope === 'RESOLVED' ? resolved : !resolved);
    return matchesSearch && matchesScope && (priority === 'ALL' || challenge.priority_level === priority);
  });
  const activeCount = displayProblems.filter((challenge) => !isResolved(challenge)).length;
  const resolvedCount = displayProblems.length - activeCount;
  const reviewCount = displayProblems.filter(isUnderReview).length;
  const inProgressCount = displayProblems.filter(isInProgress).length;

  useEffect(() => {
    if (!selected) { setCommunity(null); return; }
    api.community(selected.id).then(setCommunity).catch(() => setCommunity(null));
  }, [selected?.id]);

  if (loading) return <LoadingState label="Loading your problems..." />;
  return <div className="civic-page space-y-5">
    <header>
      <h1 className="text-3xl font-bold font-display text-primary-900">My Problems</h1>
      <p className="text-sm text-neutral-600 mt-1">Track the problems you reported and follow their journey from verification to solution.</p>
    </header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Summary label="My Reports" value={displayProblems.length} />
      <Summary label="Under Review" value={reviewCount} />
      <Summary label="In Progress" value={inProgressCount} />
      <Summary label="Resolved" value={resolvedCount} />
    </div>
    <div className="card p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input aria-label="Search my problems" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search my problems..." className="input pl-10" /></div>
        <select aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value)} className="input sm:max-w-[150px]"><option value="ALL">All priorities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select>
      </div>
      <div className="flex gap-2"><button className={`btn-secondary !py-2 ${scope === 'ALL' ? '!bg-primary-100 !text-primary-800' : ''}`} onClick={() => setScope('ALL')}>All</button><button className={`btn-secondary !py-2 ${scope === 'ACTIVE' ? '!bg-primary-100 !text-primary-800' : ''}`} onClick={() => setScope('ACTIVE')}>Active</button><button className={`btn-secondary !py-2 ${scope === 'RESOLVED' ? '!bg-primary-100 !text-primary-800' : ''}`} onClick={() => setScope('RESOLVED')}>Resolved</button></div>
    </div>
    {!filtered.length ? <EmptyState icon={<FileText size={40} />} title="No problems found" description="Your reported problems will appear here once submitted." /> : <div className="grid md:grid-cols-2 gap-4">{filtered.map((challenge) => <PersonalCard key={challenge.id} challenge={challenge} onClick={() => setSelected(challenge)} />)}</div>}
    {selected && <MyProblemSheet challenge={selected} community={community} projects={projects} universities={universities} close={() => setSelected(null)} />}
  </div>;
}

function Summary({ label, value }: { label: string; value: number }) { return <div className="card p-4 bg-[#f6f0e4]"><div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div><div className="text-2xl font-bold text-primary-900 mt-1">{value}</div></div>; }

function PersonalCard({ challenge, onClick }: { challenge: Challenge; onClick: () => void }) {
  const priority = PRIORITY_CONFIG[challenge.priority_level as PriorityLevel];
  const demo = challenge as MyProblem;
  const verified = demo.demoVerified ?? ['VALIDATED', 'OPEN_FOR_INSTITUTIONS', 'ASSIGNED'].includes(challenge.status);
  return <article className="card p-5 bg-[#fffaf0] rounded-2xl border-[#d7d0c2] shadow-soft"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold text-primary-800"><span className="w-8 h-8 rounded-xl bg-secondary-100 text-secondary-700 flex items-center justify-center"><FileText size={16}/></span>{demo.displayCategory || challenge.domain}</div><span className={`badge border ${priority?.bg} ${priority?.color} ${priority?.border}`}>Priority: {priority?.label || challenge.priority_level}</span></div><h2 className="text-lg font-bold text-primary-900 mt-4 leading-snug">{challenge.title}</h2><p className="text-sm text-neutral-500 mt-2 flex items-center gap-1"><MapPin size={14}/>{challenge.district || 'Location unavailable'}, Jharkhand</p><div className="flex flex-wrap items-center gap-2 mt-4 text-xs"><span className={`badge ${verified ? 'bg-success-50 text-success-700' : 'bg-amber-50 text-amber-700'}`}>{verified ? '✓ Government Verified' : '⏳ Verification Pending'}</span>{challenge.isPublished && <span className="badge bg-teal-50 text-teal-700">✓ Published Challenge</span>}<span className="badge bg-secondary-50 text-secondary-700">{demo.collaborationType ? demo.collaborationType.replaceAll('_', ' + ') : demo.demoStatus || citizenStatus(challenge)}</span></div><div className="flex items-center justify-between gap-3 mt-5 pt-3 border-t border-[#e7dfd1]"><span className="text-xs text-neutral-500">Reported: {formatProblemDate(challenge.created_at)}</span><button className="btn-primary !px-3 !py-2" onClick={onClick}>View Details <ChevronRight size={15}/></button></div></article>;
}

function MyProblemSheet({ challenge, community, projects, universities, close }: { challenge: Challenge; community: any; projects: any[]; universities: any[]; close: () => void }) {
  const demo = challenge as MyProblem;
  const project = projects.find((item: any) => item.challenge_id === challenge.id);
  const university = project ? universities.find((item: any) => item.id === project.university_id) : null;
  const verified = demo.demoVerified ?? ['VALIDATED', 'OPEN_FOR_INSTITUTIONS', 'ASSIGNED'].includes(challenge.status);
  const detailCommunity = community || (demo.communitySupport !== undefined ? { supporters: demo.communitySupport, commentCount: demo.communityComments, evidenceCount: demo.communityEvidence, communityPriority: demo.communitySupport } : null);
  if (demo.demoStatus) return <DemoProblemSheet problem={demo} close={close} />;
  return <div className="fixed inset-0 z-50 bg-primary-950/30 backdrop-blur-sm" onClick={close}><section role="dialog" aria-modal="true" aria-labelledby="my-problem-title" className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto bg-[#fffaf0] shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d7d0c2] bg-[#fffaf0]/95 px-5 py-4 backdrop-blur"><div><span className="badge bg-primary-50 text-primary-700">{challenge.domain}</span><p className="text-xs text-neutral-500 mt-1">{challenge.district}, Jharkhand · Reported {formatDate(challenge.created_at)}</p></div><button className="btn-ghost" onClick={close} aria-label="Close problem details"><X size={20}/></button></div><div className="p-5 sm:p-7 space-y-5"><div><h1 id="my-problem-title" className="text-3xl font-bold text-primary-900">{challenge.title}</h1><div className="flex flex-wrap gap-2 mt-4"><span className={`badge border ${PRIORITY_CONFIG[challenge.priority_level]?.bg} ${PRIORITY_CONFIG[challenge.priority_level]?.color}`}>Priority: {PRIORITY_CONFIG[challenge.priority_level]?.label || challenge.priority_level}</span><span className={`badge ${verified ? 'bg-success-50 text-success-700' : 'bg-amber-50 text-amber-700'}`}>{verified ? '✓ Government Verified' : '⏳ Pending Government Verification'}</span><span className="badge bg-secondary-50 text-secondary-700">{citizenStatus(challenge)}</span></div></div><DetailCard title="Problem Description"><p className="text-sm leading-6 text-neutral-700">{challenge.description}</p>{challenge.evidence_urls?.length ? <div className="mt-4 grid grid-cols-2 gap-2">{challenge.evidence_urls.map((url: string) => <img key={url} src={url} alt="Submitted evidence" className="aspect-video rounded-lg object-cover" />)}</div> : null}</DetailCard><DetailCard title="Government Verification"><p className={`font-semibold ${verified ? 'text-success-700' : 'text-amber-700'}`}>{verified ? '✓ Verified' : '⏳ Pending Government Verification'}</p>{!verified && <p className="text-sm text-neutral-600 mt-2">Your problem has been submitted and is waiting for government validation.</p>}{challenge.validation_comments?.length ? <div className="mt-3 space-y-2">{challenge.validation_comments.map((item: any) => <div key={item.id} className="rounded-lg bg-[#f6f0e4] p-3 text-sm"><b>{item.author_name}</b><p className="text-neutral-600 mt-1">{item.comment}</p></div>)}</div> : null}</DetailCard>{community && <DetailCard title="Community Support"><div className="grid grid-cols-3 gap-2"><SmallMetric icon={<Users size={15}/>} label="Supporters" value={community.supporters}/><SmallMetric icon={<MessageSquare size={15}/>} label="Comments" value={community.commentCount}/><SmallMetric icon={<ImageIcon size={15}/>} label="Evidence" value={community.evidenceCount}/></div><p className="text-sm text-neutral-600 mt-3">Community Priority: <b>{community.communityPriority}</b></p></DetailCard>}<JourneyTimeline challenge={challenge} project={project}/>{project && <DetailCard title="Current Progress"><div className="grid sm:grid-cols-2 gap-3 text-sm"><InfoRow label="Current stage" value={project.status?.replaceAll('_', ' ') || 'Unavailable'}/>{project.irl && <InfoRow label="IRL progress" value={`${project.irl}/9`}/>}<InfoRow label="University" value={university?.name || project.universityName || 'Assigned institution'}/><InfoRow label="Next milestone" value={project.milestones?.find((item: any) => !item.done)?.title || 'Not available'}/></div>{project.milestones?.length ? <div className="mt-4 space-y-2">{project.milestones.map((item: any) => <div key={item.id} className="flex items-center gap-2 text-sm"><span className={item.done ? 'text-success-600' : 'text-neutral-400'}>{item.done ? <CheckCircle2 size={16}/> : <Circle size={16}/>}</span>{item.title}</div>)}</div> : null}</DetailCard>}<DetailCard title="University Assignment">{university || project ? <div className="space-y-2 text-sm"><InfoRow label="University" value={university?.name || project?.universityName || 'Assigned institution'}/><InfoRow label="Student team" value={project?.team?.map((item: any) => item.name).join(', ') || 'Not available'}/><InfoRow label="Faculty mentor" value={project?.team?.find((item: any) => /faculty|mentor/i.test(item.role || ''))?.name || 'Not available'}/></div> : <><b>Pending</b><p className="text-sm text-neutral-600 mt-2">This problem is currently being evaluated for suitable university expertise.</p></>}</DetailCard>{project && <DetailCard title="Industry Support"><p className="text-sm text-neutral-600">{project.industryPartner || project.partnerName || 'Not assigned yet'}</p></DetailCard>}<DetailCard title="AI Insight"><div className="grid sm:grid-cols-2 gap-3 text-sm"><InfoRow label="Category" value={challenge.ai_domain || challenge.domain}/><InfoRow label="AI priority" value={challenge.priority_level}/><InfoRow label="Recommended expertise" value={challenge.ai_required_expertise?.join(', ') || 'Not available'}/></div></DetailCard></div></section></div>;
}

function DemoProblemSheet({ problem, close }: { problem: MyProblem; close: () => void }) {
  const verified = problem.demoVerified === true;
  const assigned = problem.universityName && problem.universityName !== 'Not Assigned';
  return <div className="fixed inset-0 z-50 bg-primary-950/30 backdrop-blur-sm" onClick={close}><section role="dialog" aria-modal="true" aria-labelledby="demo-problem-title" className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto bg-[#fffaf0] shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d7d0c2] bg-[#fffaf0]/95 px-5 py-4 backdrop-blur"><div><span className="badge bg-primary-50 text-primary-700">{problem.domain}</span><p className="text-xs text-neutral-500 mt-1">{problem.district}, Jharkhand · Reported {formatDate(problem.created_at)}</p></div><button className="btn-ghost" onClick={close} aria-label="Close problem details"><X size={20}/></button></div><div className="p-5 sm:p-7 space-y-5"><div><h1 id="demo-problem-title" className="text-3xl font-bold text-primary-900">{problem.title}</h1><div className="flex flex-wrap gap-2 mt-4"><span className={`badge border ${PRIORITY_CONFIG[problem.priority_level]?.bg} ${PRIORITY_CONFIG[problem.priority_level]?.color}`}>Priority: {PRIORITY_CONFIG[problem.priority_level]?.label}</span><span className={`badge ${verified ? 'bg-success-50 text-success-700' : 'bg-amber-50 text-amber-700'}`}>{verified ? '✓ Government Verified' : '⏳ Pending Government Verification'}</span><span className="badge bg-secondary-50 text-secondary-700">{problem.demoStatus}</span></div></div><DetailCard title="Problem Description"><p className="text-sm leading-6 text-neutral-700">{problem.description}</p></DetailCard><DetailCard title="Government Verification"><p className={`font-semibold ${verified ? 'text-success-700' : 'text-amber-700'}`}>{verified ? '✓ Verified' : '⏳ Pending Government Verification'}</p>{!verified && <p className="text-sm text-neutral-600 mt-2">Your problem has been submitted and is waiting for government validation.</p>}</DetailCard><DetailCard title="Community Support"><div className="grid grid-cols-3 gap-2"><SmallMetric icon={<Users size={15}/>} label="Supporters" value={problem.communitySupport || 0}/><SmallMetric icon={<MessageSquare size={15}/>} label="Comments" value={problem.communityComments || 0}/><SmallMetric icon={<ImageIcon size={15}/>} label="Evidence" value={problem.communityEvidence || 0}/></div></DetailCard><DemoJourney status={problem.demoStatus || ''}/><DetailCard title="Current Progress"><div className="grid sm:grid-cols-2 gap-3 text-sm"><InfoRow label="Current stage" value={problem.currentProgress || 'Not available'}/>{problem.progressPercent !== undefined && <InfoRow label="Progress" value={`${problem.progressPercent}%`}/>}<InfoRow label="Next milestone" value={problem.nextMilestone || 'Not available'}/></div></DetailCard><DetailCard title="University Assignment">{assigned ? <div className="grid sm:grid-cols-2 gap-3 text-sm"><InfoRow label="University" value={problem.universityName || 'Not available'}/><InfoRow label="Student team" value={problem.studentTeam || 'Not available'}/><InfoRow label="Faculty mentor" value={problem.facultyMentor || 'Not available'}/></div> : <><b>Pending</b><p className="text-sm text-neutral-600 mt-2">This problem is currently being evaluated for suitable university expertise.</p></>}</DetailCard><DetailCard title="Industry Support"><div className="grid sm:grid-cols-2 gap-3 text-sm"><InfoRow label="Industry partner" value={problem.industryPartner || 'Not assigned yet'}/><InfoRow label="Industry mentor" value={problem.industryMentor || 'Not assigned yet'}/><InfoRow label="Support" value={problem.industrySupport || 'Not assigned yet'}/></div></DetailCard>{problem.demoStatus === 'Resolved' && <><DetailCard title="Citizen Verification"><p className="text-sm text-neutral-600">The solution has been deployed. Your feedback helps confirm whether the problem has actually been resolved.</p><div className="flex flex-wrap gap-2 mt-3"><button className="btn-primary">Problem Solved</button><button className="btn-secondary">Partially Improved</button><button className="btn-secondary">Problem Still Exists</button></div></DetailCard>{problem.impact?.length && <DetailCard title="Impact"><div className="space-y-2 text-sm">{problem.impact.map((item) => <p key={item}>{item}</p>)}</div></DetailCard>}</>}</div></section></div>;
}

function DemoJourney({ status }: { status: string }) { const steps = ['Problem Reported', 'AI Analysis', 'Government Verification', 'University Assigned', 'Faculty Mentor', 'Industry Mentor', 'Solution Development', 'Field Testing', 'Deployment', 'Citizen Verification', 'Resolved']; const current = status === 'Resolved' ? 10 : status === 'Solution Development' ? 6 : status === 'Industry Mentor Assigned' ? 5 : status === 'University Assigned' ? 3 : status === 'Under Government Review' ? 2 : 0; return <DetailCard title="Problem Journey"><div className="space-y-2">{steps.slice(0, current + 1).map((step, index) => <div key={step} className={`flex items-center gap-3 text-sm ${index === current ? 'font-bold text-secondary-700' : 'text-success-700'}`}><span>{index < current ? <CheckCircle2 size={17}/> : <span className="w-4 h-4 rounded-full bg-secondary-500 inline-block"/>}</span>{step}</div>)}</div></DetailCard>; }

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) { return <Card className="p-5"><h2 className="font-bold text-lg text-primary-900">{title}</h2><div className="mt-3">{children}</div></Card>; }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-[#f6f0e4] p-3"><span className="text-xs text-neutral-500">{label}</span><p className="font-semibold text-primary-900 mt-1">{value}</p></div>; }
function SmallMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-lg bg-[#f6f0e4] p-3"><div className="flex items-center gap-1 text-primary-700">{icon}<b>{value || 0}</b></div><span className="text-[11px] text-neutral-500">{label}</span></div>; }
function JourneyTimeline({ challenge, project }: { challenge: Challenge; project: any }) { const steps = ['Problem Reported', 'AI Analysis', 'Government Verification', 'University Assigned', 'Faculty Mentor', 'Solution Development', 'Field Testing', 'Deployment', 'Deployed', 'Citizen Verification', 'Resolved']; const problemStage = String(challenge.currentStage || '').toUpperCase(); const current = problemStage === 'DEPLOYED' ? 8 : problemStage === 'CITIZEN_VERIFICATION' ? 9 : project?.status === 'COMPLETED' ? 10 : project?.status === 'DEPLOYED' || project?.status === 'SCALING' ? 8 : project?.status === 'DEPLOYMENT_READY' ? 7 : project?.status === 'FIELD_TESTING' ? 6 : project ? 5 : challenge.status === 'DEPLOYED' ? 8 : challenge.status === 'ASSIGNED' ? 3 : ['VALIDATED', 'OPEN_FOR_INSTITUTIONS'].includes(challenge.status) ? 2 : challenge.status === 'AI_PROCESSED' ? 1 : 0; return <DetailCard title="Problem Journey"><div className="space-y-2">{steps.map((step, index) => <div key={step} className={`flex items-center gap-3 text-sm ${index === current ? 'font-bold text-secondary-700' : index < current ? 'text-success-700' : 'text-neutral-400'}`}><span>{index < current ? <CheckCircle2 size={17}/> : index === current ? <span className="w-4 h-4 rounded-full bg-secondary-500 inline-block"/> : <Circle size={17}/>}</span>{step}</div>)}</div></DetailCard>; }
function citizenStatus(challenge: Challenge) { if (challenge.status === 'DEPLOYED' || String(challenge.currentStage || '').toUpperCase() === 'DEPLOYED') return 'Deployed'; if (challenge.status === 'ASSIGNED') return 'University Assigned'; if (challenge.status === 'VALIDATED') return 'Government Verified'; if (challenge.status === 'PENDING_VALIDATION' || challenge.status === 'FIELD_VERIFICATION') return 'Under Government Review'; return CHALLENGE_STATUS_CONFIG[challenge.status]?.label || 'Reported'; }
