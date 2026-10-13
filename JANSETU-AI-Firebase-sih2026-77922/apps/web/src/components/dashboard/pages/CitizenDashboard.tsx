import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, ArrowRight, BrainCircuit, Check, ChevronRight, Clock3, FileText, Handshake, MapPin, MessageSquare, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { api } from '@/lib/api';
import { CHALLENGE_STATUS_CONFIG, timeAgo } from '@/lib/constants';
import type { Challenge } from '@/types';
import { getProblemImage } from '@/lib/problemImages';

interface CitizenDashboardProps { onNavigate: (route: string) => void }
type CommunityStats = { communityPriority?: number; supporters?: number; supportersCount?: number; affectedCount?: number };
const WELCOME_BACKGROUND_IMAGE = '/assets/hero_image.png';
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=82';
const JOURNEY_STAGES = ['REPORTED', 'AI_ANALYSIS', 'GOVERNMENT_VERIFIED', 'UNIVERSITY_ASSIGNED', 'INDUSTRY_MENTOR_ASSIGNED', 'PROTOTYPE', 'FIELD_TESTING', 'DEPLOYMENT', 'DEPLOYED', 'CITIZEN_VERIFICATION'];
const JOURNEY_LABELS = ['Reported', 'AI Analysis', 'Govt. Verification', 'University Assigned', 'Industry Mentor', 'Prototype Development', 'Field Testing', 'Deployment', 'Deployed', 'Citizen Verification'];

function imageFor(challenge: Challenge) { return getProblemImage(challenge); }
function verified(challenge: Challenge) { return String(challenge.governmentVerificationStatus || '').toUpperCase() === 'VERIFIED' || ['VALIDATED', 'OPEN_FOR_INSTITUTIONS', 'ASSIGNED'].includes(String(challenge.status).toUpperCase()); }
function resolved(challenge: Challenge) { return ['RESOLVED', 'COMPLETED', 'CLOSED'].includes(String(challenge.currentStage || challenge.status).toUpperCase()); }
function active(challenge: Challenge) { return !resolved(challenge) && (verified(challenge) || Boolean(challenge.currentStage && challenge.currentStage !== 'REPORTED')); }
function journeyIndex(challenge?: Challenge) { if (!challenge) return -1; const currentStage = String(challenge.currentStage || challenge.status || '').toUpperCase(); if (currentStage === 'DEPLOYED' || currentStage === 'CITIZEN_VERIFICATION') return JOURNEY_STAGES.indexOf(currentStage); if (challenge.universityName || challenge.assigned_organization_id) return 3; if (challenge.industryPartnerName) return 4; const index = JOURNEY_STAGES.indexOf(String(challenge.currentStage || (verified(challenge) ? 'GOVERNMENT_VERIFIED' : 'REPORTED')).toUpperCase()); return index >= 0 ? index : verified(challenge) ? 2 : 0; }

export default function CitizenDashboard({ onNavigate }: CitizenDashboardProps) {
  const { profile } = useAuth();
  const { challenges: allChallenges, projects } = usePlatform();
  const [community, setCommunity] = useState<Record<string, CommunityStats>>({});
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || '';
  const myProblems = useMemo(() => allChallenges.filter(challenge => challenge.source === 'firestore' && challenge.submitted_by === profile?.id), [allChallenges, profile?.id]);
  const recent = useMemo(() => [...myProblems].sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime()).slice(0, 3), [myProblems]);
  const latest = myProblems.find(active) || myProblems[0];
  const isUnderReview = (challenge: Challenge) => ['SUBMITTED', 'AI_PROCESSED', 'PENDING_VALIDATION', 'FIELD_VERIFICATION'].includes(challenge.status) || String(challenge.currentStage || '').toUpperCase() === 'GOVERNMENT_VERIFIED' && String(challenge.governmentVerificationStatus || '').toUpperCase() !== 'VERIFIED';
  const isInProgress = (challenge: Challenge) => !resolved(challenge) && !isUnderReview(challenge) && Boolean(challenge.currentStage || projects.find(project => project.challenge_id === challenge.id));
  const underReview = myProblems.filter(isUnderReview).length;
  const inProgress = myProblems.filter(isInProgress).length;
  const resolvedCount = myProblems.filter(resolved).length;
  const latestProject = latest ? projects.find(project => project.challenge_id === latest.id) : undefined;
  const stageIndex = journeyIndex(latest);
  const highPriorityDomains = useMemo(() => [...new Set(allChallenges.filter(challenge => ['HIGH', 'CRITICAL'].includes(challenge.priority_level)).map(challenge => challenge.domain.toLowerCase()))].slice(0, 3), [allChallenges]);

  useEffect(() => {
    let alive = true;
    const candidates = [...allChallenges].sort((a, b) => b.priority_score - a.priority_score).slice(0, 8);
    Promise.all(candidates.map(async challenge => { try { return [challenge.id, await api.community(challenge.id)] as const; } catch { return [challenge.id, {}] as const; } })).then(rows => { if (alive) setCommunity(Object.fromEntries(rows)); });
    return () => { alive = false; };
  }, [allChallenges]);

  const priorityRows = useMemo(() => [...allChallenges].sort((a, b) => (community[b.id]?.communityPriority ?? b.priority_score) - (community[a.id]?.communityPriority ?? a.priority_score)).slice(0, 3), [allChallenges, community]);
  const commonDomain = useMemo(() => { const counts = new Map<string, number>(); allChallenges.forEach(challenge => counts.set(challenge.domain, (counts.get(challenge.domain) || 0) + 1)); return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]; }, [allChallenges]);
  const insight = !allChallenges.length ? 'AI insights will appear as more community problems are reported.' : highPriorityDomains.length > 1 ? `Your community currently has ${allChallenges.filter(challenge => ['HIGH', 'CRITICAL'].includes(challenge.priority_level)).length} high-priority problems related to ${highPriorityDomains.join(', ')}.` : `${commonDomain || 'Community'} issues are currently among the most reported challenges in your community.`;

  return <div className="citizen-overview civic-page">
    <section
      className="citizen-welcome"
      style={{
        backgroundColor: '#faf4e6',
        backgroundImage: `url('${WELCOME_BACKGROUND_IMAGE}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'right center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="citizen-welcome-copy">
        <span className="citizen-eyebrow"><Sparkles size={13} /> JAN BHAGIDARI · SE SAMADHAN</span>
        <h1>Welcome back{firstName ? `, ${firstName}` : ''} <span aria-hidden="true">👋</span></h1>
        <p>Report problems, follow their progress, and help your community turn local needs into real solutions.</p>
        <div className="citizen-welcome-actions">
          <button className="citizen-report-button" onClick={() => onNavigate('/dashboard/submit')}>+ Report a Problem</button>
          <button className="citizen-view-button" onClick={() => onNavigate('/dashboard/my-challenges')}>View My Problems <ArrowRight size={14} /></button>
        </div>
      </div>
    </section>

    <section className="citizen-summary-grid"><SummaryCard icon={<FileText size={20} />} tone="mint" label="My Problems" value={myProblems.length} detail="Reported by you" onClick={() => onNavigate('/dashboard/my-challenges')} /><SummaryCard icon={<Clock3 size={20} />} tone="peach" label="In Review" value={underReview} detail="Currently being reviewed" onClick={() => onNavigate('/dashboard/my-challenges')} /><SummaryCard icon={<Activity size={20} />} tone="blue" label="In Progress" value={inProgress} detail="Moving toward a solution" onClick={() => onNavigate('/dashboard/my-challenges')} /><SummaryCard icon={<Check size={20} />} tone="lavender" label="Problems Resolved" value={resolvedCount} detail="Your problems completed" onClick={() => onNavigate('/dashboard/my-challenges')} /></section>

    <section className="citizen-main-grid"><DashboardCard title="My Problem Journey" icon={<FileText size={17} />} action="View All" onAction={() => onNavigate('/dashboard/my-challenges')} className="citizen-journey-card">{!latest ? <EmptyDashboard text="Your latest reported problem will appear here." /> : <><div className="citizen-journey-summary"><img src={imageFor(latest)} alt={latest.title} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = FALLBACK_IMAGE; }} /><div className="min-w-0"><h3>{latest.title}</h3><p><MapPin size={13} /> {[latest.district, latest.block, latest.village].filter(Boolean).join(', ') || 'Location unavailable'}</p><span className="citizen-priority-badge">{latest.priority_level || 'MEDIUM'}</span></div><span className="citizen-current-stage"><small>Current Stage</small>{latestProject ? 'In Progress' : latest.universityName ? 'University Assigned' : verified(latest) ? 'Government Verified' : 'Under Review'}</span></div><div className="citizen-timeline" role="list">{JOURNEY_LABELS.map((label, step) => { const done = step < stageIndex; const current = step === stageIndex; return <div className={`citizen-timeline-step ${done ? 'done' : ''} ${current ? 'current' : ''}`} key={label} role="listitem"><span className="citizen-timeline-node">{done ? <Check size={12} /> : step + 1}</span><span>{label}</span>{step < JOURNEY_LABELS.length - 1 && <i />}</div>; })}</div></>}</DashboardCard><DashboardCard title="Community Priority" subtitle="Problems receiving the most community support" icon={<Users size={17} />} action="View Community Problems" onAction={() => onNavigate('/dashboard/community')}><div className="citizen-priority-list">{priorityRows.map(challenge => <button key={challenge.id} onClick={() => onNavigate('/dashboard/community')}><img src={imageFor(challenge)} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = FALLBACK_IMAGE; }} /><span><b>{challenge.title}</b><small>{challenge.district} · {community[challenge.id]?.affectedCount || challenge.affected_population || 0} affected · {community[challenge.id]?.supporters || community[challenge.id]?.supportersCount || 0} supporters</small></span><em className={challenge.priority_level === 'CRITICAL' ? 'very-high' : ''}>{challenge.priority_level === 'CRITICAL' ? 'VERY HIGH' : challenge.priority_level}</em></button>)}{!priorityRows.length && <EmptyDashboard text="Community priority will appear after reports are shared." />}</div></DashboardCard></section>

    <section className="citizen-lower-grid"><DashboardCard title="Recent Problems" subtitle="Latest issues reported by you" icon={<FileText size={17} />} action="View All" onAction={() => onNavigate('/dashboard/my-challenges')}><div className="citizen-recent-list">{recent.map(challenge => <button key={challenge.id} onClick={() => onNavigate('/dashboard/my-challenges')}><span className="citizen-recent-icon"><FileText size={16} /></span><span><b>{challenge.title}</b><small><MapPin size={11} /> {challenge.district}{challenge.village ? `, ${challenge.village}` : ''}</small></span><strong>{challenge.priority_level}</strong><em className={`status-${String(challenge.status).toLowerCase()}`}>{CHALLENGE_STATUS_CONFIG[challenge.status]?.label || 'Under Review'}</em><time>{timeAgo(challenge.created_at)}</time></button>)}{!recent.length && <EmptyDashboard text="Your recent problems will appear here." />}</div></DashboardCard><DashboardCard title="AI Insight" subtitle="Grounded in your current community data" icon={<BrainCircuit size={17} />} action="View AI" onAction={() => onNavigate('/dashboard/copilot')} className="citizen-ai-card"><div className="citizen-ai-body"><div className="citizen-brain"><BrainCircuit size={29} /></div><p>{insight}</p><button className="citizen-ai-button" onClick={() => onNavigate('/dashboard/copilot')}>Explore AI Analysis <ArrowRight size={14} /></button></div></DashboardCard><DashboardCard title="From Problem to Solution" subtitle="Together we build a better tomorrow" icon={<Handshake size={17} />}><div className="citizen-solution-flow">{[['1', 'Report', 'Citizen reports a real problem.'], ['2', 'AI Analysis', 'AI categorizes and prioritizes it.'], ['3', 'Government Validation', 'Government verifies and routes.'], ['4', 'University + Industry', 'Partners work on the solution.'], ['5', 'Citizen Verification', 'Citizens verify the result.']].map(([number, title, text], step) => <div key={number} className="citizen-solution-step"><span>{number}</span><b>{title}</b><small>{text}</small>{step < 4 && <ArrowRight size={14} />}</div>)}</div></DashboardCard></section>
  </div>;
}

function SummaryCard({ icon, tone, label, value, detail, onClick }: { icon: ReactNode; tone: string; label: string; value: number; detail: string; onClick: () => void }) { return <button className="citizen-summary-card" onClick={onClick}><span className={`citizen-summary-icon ${tone}`}>{icon}</span><span><b>{label}</b><strong>{value}</strong><small>{detail}</small></span><ChevronRight size={17} /></button>; }
function DashboardCard({ title, subtitle, icon, action, onAction, className = '', children }: { title: string; subtitle?: string; icon: ReactNode; action?: string; onAction?: () => void; className?: string; children: ReactNode }) { return <article className={`citizen-dashboard-card ${className}`}><header><span className="citizen-card-icon">{icon}</span><span><h2>{title}</h2>{subtitle && <small>{subtitle}</small>}</span>{action && <button onClick={onAction}>{action} <ChevronRight size={13} /></button>}</header><div className="citizen-card-content">{children}</div></article>; }
function EmptyDashboard({ text }: { text: string }) { return <p className="citizen-empty">{text}</p>; }
