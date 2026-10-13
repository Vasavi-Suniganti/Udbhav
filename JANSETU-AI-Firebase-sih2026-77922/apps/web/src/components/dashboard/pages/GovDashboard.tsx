import { useEffect, useMemo, useState } from 'react';
import {
  FileText, Users, Rocket, Target, ShieldCheck,
  MapPin, AlertTriangle, CheckCircle2, Clock, Layers,
  ArrowRight, Brain, Search,
} from 'lucide-react';

import { MetricCard, Card, SectionHeader } from '@/components/ui';
import { JHARKHAND_DISTRICTS } from '@/data/demo';
import { usePlatform } from '@/context/PlatformContext';
import { api } from '@/lib/api';
import { formatNumber, timeAgo } from '@/lib/constants';

export function summarizeGovActionQueue(
  problems: Array<Record<string, any>> = [],
  projects: Array<Record<string, any>> = [],
  submissions: Array<Record<string, any>> = [],
) {
  const priorityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
  const kindRank: Record<string, number> = { VALIDATION: 0, CLARIFICATION: 1, REVIEW: 2, DEPLOYMENT: 3 };

  const byType = new Map<string, Record<string, any>>();
  const upsert = (item: Record<string, any>) => {
    const current = byType.get(item.type);
    if (!current) {
      byType.set(item.type, item);
      return;
    }
    const currentPriority = priorityRank[String(current.priority || 'MEDIUM').toUpperCase()] ?? 99;
    const nextPriority = priorityRank[String(item.priority || 'MEDIUM').toUpperCase()] ?? 99;
    if (nextPriority < currentPriority || (nextPriority === currentPriority && new Date(String(item.createdAt || 0)).getTime() > new Date(String(current.createdAt || 0)).getTime())) {
      byType.set(item.type, item);
    }
  };

  problems.forEach((problem) => {
    const status = String(problem.governmentVerificationStatus ?? problem.government_status ?? problem.status ?? '').toUpperCase();
    const stage = String(problem.currentStage || '').toUpperCase();
    const isVerified = status === 'VERIFIED' || stage === 'GOVERNMENT_VERIFIED' || ['VALIDATED', 'OPEN_FOR_INSTITUTIONS', 'ASSIGNED'].includes(status);
    if (!isVerified && !['REJECTED', 'ARCHIVED', 'CLARIFICATION_REQUIRED'].includes(status)) {
      upsert({
        id: `validation-${problem.id}`,
        type: 'VALIDATION',
        title: problem.title || 'Unreviewed problem',
        route: '/dashboard/validation',
        priority: String(problem.priority_level || problem.priorityLevel || 'MEDIUM').toUpperCase(),
        district: problem.district || 'Location unavailable',
        createdAt: problem.created_at || problem.createdAt || new Date().toISOString(),
      });
    }
    if (status === 'CLARIFICATION_REQUIRED' || Boolean(problem.clarificationRequest)) {
      upsert({
        id: `clarification-${problem.id}`,
        type: 'CLARIFICATION',
        title: problem.title || 'Clarification requested',
        route: '/dashboard/validation',
        priority: String(problem.priority_level || problem.priorityLevel || 'MEDIUM').toUpperCase(),
        district: problem.district || 'Location unavailable',
        createdAt: problem.updated_at || problem.updatedAt || problem.created_at || problem.createdAt || new Date().toISOString(),
      });
    }
  });

  submissions.forEach((submission) => {
    const status = String(submission.status || '').toUpperCase();
    const governmentStatus = String(submission.governmentReview?.status || submission.government_review?.status || '').toUpperCase();
    if (['APPROVED', 'REJECTED', 'DRAFT'].includes(status)) return;
    if (status === 'SUBMITTED' || ['PENDING', 'UNDER_REVIEW'].includes(governmentStatus)) {
      upsert({
        id: `review-${submission.id || submission.submissionId || submission.projectId || 'review'}`,
        type: 'REVIEW',
        title: submission.title || 'Solution awaiting review',
        route: '/dashboard/solution-review',
        priority: String(submission.priority || submission.priorityLevel || 'HIGH').toUpperCase(),
        district: submission.district || 'N/A',
        createdAt: submission.updatedAt || submission.createdAt || new Date().toISOString(),
      });
    }
  });

  projects.forEach((project) => {
    const status = String(project.status || '').toUpperCase();
    if (['FIELD_TESTING', 'DEPLOYMENT', 'SCALING', 'PROTOTYPE', 'PILOT'].includes(status)) {
      upsert({
        id: `deployment-${project.id}`,
        type: 'DEPLOYMENT',
        title: project.title || 'Project in delivery',
        route: '/dashboard/deployments',
        priority: String(project.priority_level || project.priorityLevel || 'MEDIUM').toUpperCase(),
        district: project.district || 'N/A',
        createdAt: project.updatedAt || project.createdAt || new Date().toISOString(),
      });
    }
  });

  return [...byType.values()].sort((a, b) => {
    const kindDelta = (kindRank[a.type] ?? 99) - (kindRank[b.type] ?? 99);
    if (kindDelta !== 0) return kindDelta;
    const priorityDelta = (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99);
    if (priorityDelta !== 0) return priorityDelta;
    return new Date(String(b.createdAt || 0)).getTime() - new Date(String(a.createdAt || 0)).getTime();
  });
}

export function summarizeGovDashboardMetrics(
  problems: Array<Record<string, any>> = [],
  projects: Array<Record<string, any>> = [],
  submissions: Array<Record<string, any>> = [],
  deployments: Array<Record<string, any>> = [],
) {
  const getProblemStatus = (problem: Record<string, any>) => String(
    problem.governmentVerificationStatus ?? problem.government_status ?? problem.status ?? ''
  ).toUpperCase();

  const isVerified = (problem: Record<string, any>) => {
    const status = getProblemStatus(problem);
    const stage = String(problem.currentStage || '').toUpperCase();
    return status === 'VERIFIED' || stage === 'GOVERNMENT_VERIFIED' || ['VALIDATED', 'OPEN_FOR_INSTITUTIONS', 'ASSIGNED'].includes(status);
  };

  const pendingValidation = problems.filter((problem) => !isVerified(problem) && !['REJECTED', 'ARCHIVED'].includes(getProblemStatus(problem)));
  const verifiedProblems = problems.filter(isVerified);
  const routedToIndustry = verifiedProblems.filter((problem) => Boolean(problem.industryPartnerId || problem.industry_partner_id || problem.industryId || problem.industry_id));
  const routedToUniversity = verifiedProblems.filter((problem) => Boolean(problem.universityId || problem.university_id || problem.assignedOrganizationId || problem.assigned_organization_id));
  const activeProjects = projects.filter((project) => !['ARCHIVED', 'REJECTED', 'DRAFT'].includes(String(project.status || '').toUpperCase()));
  const acceptedProjects = projects.filter((project) => ['ACTIVE', 'FIELD_TESTING', 'DEPLOYMENT', 'DEPLOYMENT_READY', 'DEPLOYED', 'SCALING', 'PROTOTYPE', 'SOLUTION_DEVELOPMENT', 'COMPLETED'].includes(String(project.status || '').toUpperCase()));
  const essentialReviewStates = ['PENDING', 'UNDER_REVIEW', 'SUBMITTED'];
  const solutionsAwaitingReview = submissions.filter((submission) => {
    const status = String(submission.status || '').toUpperCase();
    const governmentStatus = String(submission.governmentReview?.status || submission.government_review?.status || '').toUpperCase();
    if (['APPROVED', 'REJECTED', 'DRAFT'].includes(status)) return false;
    if (status === 'SUBMITTED') return true;
    return ['PENDING', 'UNDER_REVIEW'].includes(governmentStatus);
  }).length;
  const activeDeployments = deployments.length
    ? deployments.filter((deployment) => !['CANCELLED', 'COMPLETED', 'ARCHIVED'].includes(String(deployment.status || '').toUpperCase())).length
    : projects.filter((project) => ['DEPLOYMENT', 'DEPLOYMENT_READY', 'DEPLOYED', 'FIELD_TESTING', 'SCALING'].includes(String(project.status || '').toUpperCase())).length;

  return {
    totalProblems: problems.length,
    pendingValidation: pendingValidation.length,
    verifiedProblems: verifiedProblems.length,
    routedToIndustry: routedToIndustry.length,
    routedToUniversity: routedToUniversity.length,
    activeProjects: activeProjects.length,
    acceptedProjects: acceptedProjects.length,
    collaborations: verifiedProblems.filter((problem) => Boolean(problem.universityId || problem.university_id) && Boolean(problem.industryPartnerId || problem.industry_partner_id)).length,
    solutionsAwaitingReview,
    activeDeployments,
  };
}

interface GovDashboardProps {
  onNavigate: (route: string) => void;
}

export default function GovDashboard({ onNavigate }: GovDashboardProps) {
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [solutionRows, setSolutionRows] = useState<Array<Record<string, any>>>([]);
  const [deploymentRows, setDeploymentRows] = useState<Array<Record<string, any>>>([]);
  const {challenges,projects,clusters,universities,analytics}=usePlatform();

  useEffect(() => {
    let active = true;
    Promise.all([
      api.governmentSolutionSubmissions().catch(() => []),
      api.deployments().catch(() => []),
    ]).then(([submissions, deployments]) => {
      if (!active) return;
      setSolutionRows(submissions);
      setDeploymentRows(deployments);
    });
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(
    () => summarizeGovDashboardMetrics(challenges, projects, solutionRows, deploymentRows),
    [challenges, projects, solutionRows, deploymentRows],
  );

  const getProblemStatus = (problem: Record<string, any>) => String(
    problem.governmentVerificationStatus ?? problem.government_status ?? problem.status ?? ''
  ).toUpperCase();

  const isProblemVerified = (problem: Record<string, any>) => {
    const status = getProblemStatus(problem);
    const stage = String(problem.currentStage || '').toUpperCase();
    return status === 'VERIFIED' || stage === 'GOVERNMENT_VERIFIED' || ['VALIDATED', 'OPEN_FOR_INSTITUTIONS', 'ASSIGNED'].includes(status);
  };

  const pendingValidation = useMemo(
    () => challenges.filter(
      (problem) => !isProblemVerified(problem) && !['REJECTED', 'ARCHIVED'].includes(getProblemStatus(problem as Record<string, any>)),
    ),
    [challenges],
  );

  const actionQueue = useMemo(
    () => summarizeGovActionQueue(challenges, projects, solutionRows),
    [challenges, projects, solutionRows],
  );

  async function handleCopilot() {
    if (!copilotQuery.trim()) return;
    setCopilotLoading(true);
    try { const result=await api.analyticsCopilot(copilotQuery); setCopilotAnswer(result.answer||'No grounded answer was returned.'); }
    catch(error){setCopilotAnswer(`Copilot unavailable: ${(error as Error).message}`);}
    finally{setCopilotLoading(false);}
  }

  return (
    <div className="civic-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-neutral-900">Government Command Centre</h1>
        <p className="text-sm text-neutral-500 mt-1">Statewide challenge intelligence, validation, and project oversight from the live UDBHAV data layer.</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Challenges Received" value={metrics.totalProblems} icon={<FileText size={18} />} color="primary" trend={{ value: "Live", up: true }} onClick={() => onNavigate('/dashboard/challenges')} />
        <MetricCard label="Pending Validation" value={metrics.pendingValidation} icon={<ShieldCheck size={18} />} color="warning" onClick={() => onNavigate('/dashboard/validation')} />
        <MetricCard label="Verified Problems" value={metrics.verifiedProblems} icon={<CheckCircle2 size={18} />} color="success" onClick={() => onNavigate('/dashboard/validation')} />
        <MetricCard label="Routed to Industry" value={metrics.routedToIndustry} icon={<Target size={18} />} color="secondary" onClick={() => onNavigate('/dashboard/challenges')} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Routed to University" value={metrics.routedToUniversity} icon={<Users size={18} />} color="accent" onClick={() => onNavigate('/dashboard/gov-ecosystem')} />
        <MetricCard label="Active Projects" value={metrics.activeProjects} icon={<Rocket size={18} />} color="secondary" onClick={() => onNavigate('/dashboard/projects')} />
        <MetricCard label="Accepted Projects" value={metrics.acceptedProjects} icon={<Target size={18} />} color="success" onClick={() => onNavigate('/dashboard/projects')} />
        <MetricCard label="Solutions Awaiting Review" value={metrics.solutionsAwaitingReview} icon={<AlertTriangle size={18} />} color="error" onClick={() => onNavigate('/dashboard/solution-review')} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Collaborations" value={metrics.collaborations} icon={<Users size={18} />} color="primary" onClick={() => onNavigate('/dashboard/gov-ecosystem')} />
        <MetricCard label="Active Deployments" value={metrics.activeDeployments} icon={<Rocket size={18} />} color="success" onClick={() => onNavigate('/dashboard/deployments')} />
        <MetricCard label="Citizens Impacted" value={analytics?.citizensImpacted ?? "—"} icon={<Users size={18} />} color="accent" onClick={() => onNavigate('/dashboard/gov-citizens')} />
        <MetricCard label="Universities Engaged" value={analytics?.universities ?? universities.length} icon={<Users size={18} />} color="primary" onClick={() => onNavigate('/dashboard/gov-ecosystem')} />
      </div>

      {/* AI Copilot */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
            <Brain size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Government AI Copilot</h3>
            <p className="text-xs text-neutral-500">Ask natural-language questions about analytics data</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCopilot()}
              placeholder="e.g., Show high-priority water challenges in Ranchi"
              className="input pl-10"
            />
          </div>
          <button onClick={handleCopilot} disabled={copilotLoading} className="btn-primary">
            {copilotLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Brain size={16} />}
            Ask
          </button>
        </div>
        {copilotAnswer && (
          <div className="mt-3 rounded-lg bg-primary-50 border border-primary-200 p-4 animate-fade-in">
            <div className="flex items-start gap-2">
              <Brain size={16} className="text-primary-600 shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-700 leading-relaxed">{copilotAnswer}</p>
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {['Show high-priority water challenges in Ranchi', 'Which projects are delayed?', 'Show funding utilization', 'Which solutions can be reused?'].map((s) => (
            <button key={s} onClick={() => { setCopilotQuery(s); }} className="text-xs px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors">
              {s}
            </button>
          ))}
        </div>
      </Card>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Validation Queue */}
        <Card className="p-5">
          <SectionHeader title="Validation Queue" subtitle={`${pendingValidation.length} challenges awaiting review`} />
          <div className="space-y-2">
            {pendingValidation.map((ch) => (
              <button key={ch.id} onClick={() => onNavigate('/dashboard/validation')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-neutral-200 hover:border-primary-200 hover:bg-primary-50/30 transition-colors text-left">
                <div className={`w-2 h-12 rounded-full ${ch.priority_level === 'CRITICAL' ? 'bg-error-500' : ch.priority_level === 'HIGH' ? 'bg-orange-500' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{ch.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {ch.district}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(ch.created_at)}</span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-neutral-300" />
              </button>
            ))}
          </div>
        </Card>

        {/* District Distribution */}
        <Card className="p-5">
          <SectionHeader title="District Distribution" subtitle="Challenges by district (top 5)" />
          <div className="space-y-3">
            {((analytics?.districts||[]).length ? analytics.districts.map((x:any,i:number)=>({id:x.name,name:x.name,challenge_count:x.value,active_projects:projects.filter(p=>challenges.find(c=>c.id===p.challenge_id)?.district===x.name).length})) : JHARKHAND_DISTRICTS).slice(0, 5).map((d:any, i:number) => (
              <div key={d.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-neutral-700">{d.name}</span>
                  <span className="text-neutral-500">{d.challenge_count} challenges · {d.active_projects} projects</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500" style={{ width: `${Math.min(100, ((d.challenge_count||0) / Math.max(1, ...(((analytics?.districts||[]).map((x:any)=>x.value)) as number[]), 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Government action queue */}
      <div>
        <SectionHeader title="Government Action Queue" subtitle="Current tasks that need validation, clarification, review, or deployment follow-up" />
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {actionQueue.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-4 rounded-xl border border-dashed border-neutral-300 bg-white/70 p-5 text-sm text-neutral-500">
              No live Government actions are pending.
            </div>
          ) : actionQueue.map((item) => (
            <button key={item.id} onClick={() => onNavigate(item.route)} className="card-hover p-4 text-left w-full">
              <div className="flex items-start justify-between mb-2">
                <span className={`badge ${item.type === 'VALIDATION' ? 'bg-warning-50 text-warning-700' : item.type === 'CLARIFICATION' ? 'bg-amber-50 text-amber-700' : item.type === 'REVIEW' ? 'bg-primary-50 text-primary-700' : 'bg-success-50 text-success-700'}`}>
                  {item.type}
                </span>
                <span className="text-xs text-neutral-400">{item.district}</span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 leading-snug mb-2">{item.title}</h3>
              <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                <span className="font-medium text-neutral-700">{item.priority}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(item.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Projects */}
      <div>
        <SectionHeader title="Active Projects" subtitle="Innovation projects in progress" action={<button onClick={() => onNavigate('/dashboard/projects')} className="btn-ghost text-sm">View All <ArrowRight size={14} /></button>} />
        <div className="grid md:grid-cols-2 gap-4">
          {projects.slice(0,6).map((proj) => (
            <button key={proj.id} onClick={() => onNavigate('/dashboard/projects')} className="card-hover p-4 text-left w-full">
              <div className="flex items-start justify-between mb-2">
                <span className="badge bg-indigo-50 text-indigo-700">{proj.status.replace(/_/g, ' ')}</span>
                <span className="badge bg-neutral-100 text-neutral-600">IRL {proj.irl_level}</span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 leading-snug mb-1.5">{proj.title}</h3>
              <p className="text-xs text-neutral-500 mb-3">{proj.organization_name}</p>
              <div className="flex items-center gap-4 text-xs text-neutral-400 pt-3 border-t border-neutral-100">
                <span className="flex items-center gap-1"><Users size={12} /> {proj.team_members?.length || 0} members</span>
                <span className="flex items-center gap-1"><Target size={12} /> {proj.beneficiaries?.toLocaleString('en-IN')} beneficiaries</span>
                <span className="font-mono ml-auto">{proj.project_code}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
