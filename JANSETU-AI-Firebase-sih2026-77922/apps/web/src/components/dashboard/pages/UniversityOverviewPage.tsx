import { useEffect, useState } from 'react';
import { ArrowRight, BellRing, Building2, CheckCircle2, ChevronRight, CircleAlert, FolderKanban, Handshake, Lightbulb, MapPin, Plus, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/ui';

type AnyRecord = Record<string, any>;
type Props = { onNavigate: (route: string) => void };
type ImpactMetric = { key: string; label: string; icon: LucideIcon; value: number };

const numberValue = (value: unknown) => {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};
const normalized = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const phaseForStatus = (project: AnyRecord) => project.currentPhase || project.phase || ({
  TEAM_FORMED: 'Problem Understanding', RESEARCH: 'Research', PROPOSAL: 'Solution Design',
  SOLUTION_DEVELOPMENT: 'Solution Development', PROTOTYPING: 'Prototype Development', LAB_TESTING: 'Prototype Development',
  FIELD_TESTING: 'Field Testing', PILOT: 'Field Testing', DEPLOYMENT_READY: 'Deployment', DEPLOYED: 'Deployment',
  CITIZEN_VERIFICATION: 'Citizen Verification',
} as Record<string, string>)[String(project.status || '').toUpperCase()] || 'Solution Development';

function verifiedImpact(records: AnyRecord[]): AnyRecord[] {
  return records.filter(record => record.verified === true || Boolean(record.verifiedAt || record.verified_at) || ['VERIFIED', 'APPROVED'].includes(String(record.verificationStatus || record.verification_status || record.status || '').toUpperCase()));
}
function impactTotal(records: AnyRecord[], aliases: string[]): number {
  return records.filter(record => aliases.includes(normalized(record.metric_name || record.metric || record.key || record.type)))
    .reduce((total, record) => total + numberValue(record.metric_value ?? record.value ?? record.count ?? record.after), 0);
}
function projectProgress(project: AnyRecord) {
  if (Number.isFinite(Number(project.progress))) return Math.max(0, Math.min(100, Number(project.progress)));
  const milestones = project.milestones || [];
  if (!milestones.length) return 0;
  return Math.round(milestones.filter((item: AnyRecord) => item.done || String(item.status).toUpperCase() === 'COMPLETED').length / milestones.length * 100);
}

export function UniversityOverviewPage({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [data, setData] = useState<AnyRecord | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.universityOverview().then((result: AnyRecord) => {
      if (active) setData(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load the university overview.');
    });
    return () => { active = false; };
  }, []);

  if (!data && !error) return <LoadingState label="Loading university overview…" />;

  const profileRecord = profile as unknown as AnyRecord | null;
  const universityName = data?.university?.name || data?.university?.organization_name || profileRecord?.organization_name || profileRecord?.organizationName || 'Your University';
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const projects: AnyRecord[] = data?.projects || [];
  const teams: AnyRecord[] = data?.teams || [];
  const submissions: AnyRecord[] = data?.submissions || [];
  const impactRecords = verifiedImpact(data?.impactRecords || []);
  const activeTeams = teams.filter(team => !['COMPLETED', 'ARCHIVED', 'CLOSED'].includes(String(team.teamStatus || team.status || '').toUpperCase())).length;
  const activeProjects = projects.filter(project => !['COMPLETED', 'ARCHIVED', 'DEPLOYED'].includes(String(project.status || '').toUpperCase())).length;
  const solutions = submissions.filter(submission => !['DRAFT', 'CANCELLED', 'REJECTED'].includes(String(submission.status || '').toUpperCase())).length;
  const citizensImpacted = impactTotal(impactRecords, ['citizens_helped', 'citizens_impacted', 'people_benefited', 'beneficiaries']);
  const problemCount = new Set(projects.map(project => project.challengeId || project.challenge_id).filter(Boolean)).size;
  const initiativeCount = impactTotal(impactRecords, ['government_initiatives_supported', 'initiatives_supported']);
  const communitiesCount = impactTotal(impactRecords, ['communities_reached', 'villages_reached', 'communities_impacted']);
  const displayImpact = impactRecords.length > 0;

  const projectRows = projects.slice(0, 4);
  const attention: AnyRecord[] = [];
  for (const submission of submissions) {
    const reviewStatus = String(submission.governmentReview?.status || '').toUpperCase();
    const project = projects.find(item => item.id === submission.projectId);
    const submissionRoute = submission.projectId ? `/dashboard/projects/${submission.projectId}` : `/dashboard/solution-submissions/${submission.id}`;
    if (reviewStatus === 'FEEDBACK_REQUIRED' || submission.feedbackRequired === true) {
      attention.push({ id: `feedback-${submission.id}`, title: 'Government feedback required', detail: project?.title || submission.projectTitle || 'Solution submission', label: 'Review Project', route: submissionRoute, kind: 'alert' });
    } else if (reviewStatus === 'CHANGES_REQUESTED' || String(submission.status).toUpperCase() === 'CHANGES_REQUESTED') {
      attention.push({ id: `changes-${submission.id}`, title: 'Solution changes requested', detail: project?.title || submission.projectTitle || 'Solution submission', label: 'View Details', route: submissionRoute, kind: 'alert' });
    }
  }
  for (const collaboration of data?.collaborations || []) {
    if (String(collaboration.status || '').toUpperCase() === 'PENDING') {
      attention.push({ id: `collaboration-${collaboration.id}`, title: 'Industry collaboration pending', detail: collaboration.projectTitle || projects.find(item => item.id === collaboration.projectId)?.title || collaboration.partner || 'Project collaboration', label: 'View Collaboration', route: collaboration.id ? `/dashboard/industry-collaboration/${collaboration.id}` : '/dashboard/industry-collaboration', kind: 'info' });
    }
  }

  const stats: { label: string; value: string; description: string; icon: LucideIcon; tone: string; route: string }[] = [
    { label: 'ACTIVE TEAMS', value: String(activeTeams), description: 'Registered student teams', icon: Users, tone: 'teal', route: '/dashboard/teams' },
    { label: 'ACTIVE PROJECTS', value: String(activeProjects), description: 'Projects under development', icon: FolderKanban, tone: 'orange', route: '/dashboard/projects' },
    { label: 'SOLUTIONS DEVELOPED', value: String(solutions), description: 'Solutions prepared by teams', icon: Lightbulb, tone: 'blue', route: '/dashboard/solution-submissions' },
    { label: 'CITIZENS IMPACTED', value: new Intl.NumberFormat('en-IN').format(citizensImpacted), description: 'People benefited through projects', icon: Users, tone: 'lavender', route: '/dashboard/milestones' },
  ];
  const impactMetrics: ImpactMetric[] = [
    { key: 'problems', label: 'PROBLEMS ADDRESSED', icon: CheckCircle2, value: problemCount },
    { key: 'citizens', label: 'CITIZENS HELPED', icon: Users, value: citizensImpacted },
    { key: 'initiatives', label: 'GOVERNMENT INITIATIVES SUPPORTED', icon: Building2, value: initiativeCount },
    { key: 'communities', label: 'COMMUNITIES REACHED', icon: MapPin, value: communitiesCount },
  ];

  return (
    <div className="civic-page university-overview">
      {error && <p className="university-error" role="alert">{error}</p>}
      <section className="university-hero">
        <div className="university-hero-copy">
          <div className="university-eyebrow"><span aria-hidden="true">✦</span> JAN BHAGIDARI · SE SAMADHAN</div>
          <h1>Welcome back{firstName ? `, ${firstName}` : ''} <span aria-hidden="true">👋</span></h1>
          <p><b>{universityName}</b> · Turn verified societal challenges into practical solutions through student innovation, research, and collaboration.</p>
          <div className="university-hero-actions">
            <button type="button" className="university-button university-button-primary" onClick={() => onNavigate('/dashboard/routed-challenges')}><Plus size={16} /> View Routed Challenges</button>
            <button type="button" className="university-button university-button-secondary" onClick={() => onNavigate('/dashboard/projects')}>View My Projects <ArrowRight size={15} /></button>
          </div>
        </div>
        <div className="university-hero-image" aria-label="University students collaborating on a technology project">
          <img src="/assets/uni.png" alt="University students and their mentor collaborating on a community technology project" />
          <div className="university-image-caption"><span>Research with purpose</span><b>Innovation for a better tomorrow</b></div>
        </div>
      </section>

      <section className="university-stat-grid" aria-label="University statistics">
        {stats.map(({ label, value, description, icon: Icon, tone, route }) => (
          <button type="button" className="university-stat" key={label} onClick={() => onNavigate(route)}>
            <span className={`university-stat-icon tone-${tone}`}><Icon size={18} /></span>
            <span className="university-stat-copy"><span className="university-stat-label">{label}</span><b>{value}</b><small>{description}</small></span>
            <ChevronRight className="university-stat-arrow" size={15} />
          </button>
        ))}
      </section>

      <section className="university-main-grid">
        <article className="university-panel university-project-panel">
          <header className="university-panel-header">
            <div><h2>Project Progress</h2><p>See how your university teams are progressing toward real-world solutions.</p></div>
            <button type="button" className="university-text-link" onClick={() => onNavigate('/dashboard/projects')}>View All Projects <ArrowRight size={14} /></button>
          </header>
          <div className="university-project-list">
            {projectRows.length ? projectRows.map(project => {
              const team = teams.find(item => item.projectId === project.id || item.project_id === project.id || item.id === project.teamId || item.id === project.team_id);
              const teamName = project.teamName || project.team_name || team?.teamName || team?.team_name || team?.name || project.organization_name || 'University team';
              const progress = projectProgress(project);
              const statusLabel = ['COMPLETED', 'ARCHIVED'].includes(String(project.status || '').toUpperCase()) ? String(project.status).replaceAll('_', ' ') : 'IN PROGRESS';
              return <button type="button" className="university-project-row" key={project.id} onClick={() => onNavigate(`/dashboard/projects/${project.id}`)}>
                <span className="university-project-thumb"><FolderKanban size={18} /></span>
                <span className="university-project-title"><b>{project.title}</b><small>{teamName} <i>·</i> {phaseForStatus(project)}</small></span>
                <span className="university-progress"><span><i style={{ width: `${progress}%` }} /></span><small>{progress}%</small></span>
                <span className="university-status">{statusLabel}</span>
                <ChevronRight className="university-row-arrow" size={15} />
              </button>;
            }) : <p className="university-empty">No university projects yet.</p>}
          </div>
        </article>

        <article className="university-panel university-impact-panel">
          <header className="university-panel-header"><div><h2>University Impact</h2><p>Your contribution to society, government and communities.</p></div></header>
          {!displayImpact && <p className="university-impact-pending">Impact data pending</p>}
          <div className="university-impact-grid">
            {impactMetrics.map(({ key, label, icon: Icon, value }) => (
              <div className="university-impact-item" key={key}>
                <span className="university-impact-icon"><Icon size={16} /></span>
                <span><small>{label}</small><b className={displayImpact ? '' : 'is-pending'}>{displayImpact ? new Intl.NumberFormat('en-IN').format(value) : 'Impact data pending'}</b></span>
              </div>
            ))}
          </div>
          <button type="button" className="university-button university-button-primary university-impact-action" onClick={() => onNavigate('/dashboard/milestones')}>View Impact &amp; Achievements <ArrowRight size={15} /></button>
        </article>
      </section>

      <section className="university-panel university-attention-panel">
        <header className="university-panel-header"><div><h2>Needs Attention</h2><p>Items that need your attention to keep projects on track.</p></div></header>
        {attention.length ? <div className="university-attention-list">{attention.slice(0, 3).map(item => (
          <div className="university-attention-item" key={item.id}>
            <span className={`university-attention-icon ${item.kind === 'info' ? 'is-info' : ''}`}>{item.kind === 'info' ? <BellRing size={15} /> : <CircleAlert size={15} />}</span>
            <span className="university-attention-copy"><b>{item.title}</b><small>{item.detail}</small></span>
            <button type="button" className="university-attention-action" onClick={() => onNavigate(item.route)}>{item.label}</button>
          </div>
        ))}</div> : <div className="university-all-clear"><CheckCircle2 size={17} /> All projects are on track</div>}
      </section>
    </div>
  );
}
