import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, FlaskConical, MapPin, Plus, Rocket, Target, X } from 'lucide-react';
import { Card, EmptyState, LoadingState, MetricCard, SectionHeader } from '@/components/ui';
import { AnimatedProgress } from '@/components/ui/motion';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/constants';
import { isGovernmentRoutedToIndustry } from '@/lib/problems';
import {
  SOLUTION_STAGES,
  SOLUTION_STATUS_LABELS,
  SOLUTION_STATUS_STYLES,
  resolveSolutionProgress,
  saveIndustrySolution,
  subscribeToIndustrySolutionReviews,
  solutionReviewStatusLabel,
  solutionStatusOf,
  stageLabel,
  subscribeToIndustrySolutions,
  type IndustrySolution,
  type IndustrySolutionReview,
  type SolutionStage,
  type SolutionStageSection,
} from '@/lib/solutions';
import type { Challenge } from '@/types';

type Props = { onNavigate: (route: string) => void };

type SolutionRow = { challenge: Challenge; solution?: IndustrySolution; review?: IndustrySolutionReview };

type SolutionForm = {
  title: string;
  solution: string;
  approach: string;
  expectedImpact: string;
  estimatedFunding: string;
  progress: string;
  prototypeStatus: SolutionStage;
  testingStatus: SolutionStage;
  implementationStatus: SolutionStage;
  deploymentStatus: SolutionStage;
};

const STAGE_SECTIONS: { section: SolutionStageSection; label: string }[] = [
  { section: 'prototype', label: 'Prototype' },
  { section: 'testing', label: 'Testing' },
  { section: 'implementation', label: 'Implementation' },
  { section: 'deployment', label: 'Deployment' },
];

const STAGE_OPTIONS: { value: SolutionStage; label: string }[] = SOLUTION_STAGES.map(stage => ({ value: stage, label: stage.replace('_', ' ').toLowerCase() }));

function formatRupees(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function locationOf(challenge: Challenge) {
  return [challenge.district, challenge.block, challenge.village].filter(Boolean).join(' · ') || 'Not available';
}

function problemTextOf(challenge: Challenge) {
  return challenge.description?.trim() || 'Not available';
}

function emptyForm(row: SolutionRow): SolutionForm {
  const { challenge, solution } = row;
  return {
    title: solution?.title || `${challenge.title} solution`,
    solution: solution?.solution || '',
    approach: solution?.approach || (challenge.aiRequiredExpertise || challenge.ai_required_expertise || []).join(', '),
    expectedImpact: solution?.expectedImpact || '',
    estimatedFunding: solution?.estimatedFunding ? String(solution.estimatedFunding) : '',
    progress: typeof solution?.progress === 'number' ? String(solution.progress) : '',
    prototypeStatus: solution?.prototypeStatus || 'NOT_STARTED',
    testingStatus: solution?.testingStatus || 'NOT_STARTED',
    implementationStatus: solution?.implementationStatus || 'NOT_STARTED',
    deploymentStatus: solution?.deploymentStatus || 'NOT_STARTED',
  };
}

function stageValueOf(form: SolutionForm, section: SolutionStageSection): SolutionStage {
  if (section === 'prototype') return form.prototypeStatus;
  if (section === 'testing') return form.testingStatus;
  if (section === 'implementation') return form.implementationStatus;
  return form.deploymentStatus;
}

function withStage(form: SolutionForm, section: SolutionStageSection, stage: SolutionStage): SolutionForm {
  if (section === 'prototype') return { ...form, prototypeStatus: stage };
  if (section === 'testing') return { ...form, testingStatus: stage };
  if (section === 'implementation') return { ...form, implementationStatus: stage };
  return { ...form, deploymentStatus: stage };
}

function MetricRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-sm font-semibold text-primary-900 mt-1">{value}</p>
      {hint && <p className="text-[11px] text-neutral-500 mt-0.5">{hint}</p>}
    </div>
  );
}

function ProgressBar({ progress }: { progress: number | null }) {
  if (progress === null) return <p className="text-sm font-semibold text-neutral-500">Not started</p>;
  return (
    <div>
      <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
        <AnimatedProgress value={progress} className="h-full rounded-full bg-primary-500" />
      </div>
      <p className="text-sm font-semibold text-primary-900 mt-1">{progress}%</p>
    </div>
  );
}

export default function IndustrySolutionsPage({ onNavigate }: Props) {
  const { profile } = useAuth();
  const { show } = useToast();
  const { challenges, loading, error: platformError } = usePlatform();
  const [solutions, setSolutions] = useState<IndustrySolution[]>([]);
  const [reviews, setReviews] = useState<Record<string, IndustrySolutionReview>>({});
  const [solutionError, setSolutionError] = useState('');
  const [detail, setDetail] = useState<SolutionRow | null>(null);
  const [formTarget, setFormTarget] = useState<SolutionRow | null>(null);
  const [form, setForm] = useState<SolutionForm | null>(null);
  const [busy, setBusy] = useState(false);

  const profileExtras = profile as unknown as Record<string, unknown> | null;
  const organizationName = String(profileExtras?.organization_name || profileExtras?.organizationName || profile?.full_name || '');
  const organizationIds = useMemo(
    () => [profile?.organization_id, profile?.id].filter(Boolean).map(String),
    [profile?.organization_id, profile?.id],
  );
  const organizationKey = organizationIds.join('|');

  useEffect(
    () => subscribeToIndustrySolutions(organizationIds, setSolutions, error => setSolutionError(error.message)),
    [organizationKey],
  );
  useEffect(
    () => subscribeToIndustrySolutionReviews(organizationIds, setReviews, error => setSolutionError(error.message)),
    [organizationKey],
  );

  const accepted = useMemo(
    () => challenges.filter(problem =>
      isGovernmentRoutedToIndustry(problem) &&
      Boolean(problem.industryPartnerId) &&
      organizationIds.includes(String(problem.industryPartnerId))),
    [challenges, organizationKey],
  );

  const solutionByChallenge = useMemo(() => new Map(solutions.map(item => [item.challengeId, item])), [solutions]);
  const rows = useMemo<SolutionRow[]>(
    () => accepted.map(challenge => ({ challenge, solution: solutionByChallenge.get(challenge.id), review: reviews[challenge.id] })),
    [accepted, solutionByChallenge, reviews],
  );
  const definedCount = rows.filter(row => Boolean(row.solution)).length;
  const inDevelopmentCount = rows.filter(row => ['IN_DEVELOPMENT', 'READY'].includes(solutionStatusOf(row.solution))).length;
  const awaitingReviewCount = Object.values(reviews).filter(review => ['SUBMITTED', 'PENDING', 'UNDER_REVIEW'].includes(review.status)).length;

  function openForm(row: SolutionRow) {
    setFormTarget(row);
    setForm(emptyForm(row));
  }

  async function submitForm() {
    if (!form || !formTarget) return;
    const progressValue = form.progress.trim() === '' ? undefined : Number(form.progress);
    if (progressValue !== undefined && (!Number.isFinite(progressValue) || progressValue < 0 || progressValue > 100)) {
      show('Solution progress must be a number between 0 and 100.', 'error');
      return;
    }
    const fundingValue = form.estimatedFunding.trim() === '' ? undefined : Number(form.estimatedFunding);
    if (fundingValue !== undefined && (!Number.isFinite(fundingValue) || fundingValue < 0)) {
      show('Estimated funding must be a valid amount.', 'error');
      return;
    }
    if (!form.title.trim() || !form.solution.trim()) {
      show('Add a solution title and proposed solution before saving.', 'error');
      return;
    }
    setBusy(true);
    try {
      const { challenge } = formTarget;
      await saveIndustrySolution({
        challengeId: challenge.id,
        projectId: challenge.project_id || challenge.id,
        organizationId: String(challenge.industryPartnerId || organizationIds[0] || ''),
        organizationName: challenge.industryPartnerName || organizationName,
        challengeTitle: challenge.title,
        problem: problemTextOf(challenge),
        title: form.title,
        solution: form.solution,
        approach: form.approach,
        expectedImpact: form.expectedImpact,
        domains: [challenge.domain, challenge.subdomain].filter(Boolean) as string[],
        districts: [challenge.district].filter(Boolean) as string[],
        estimatedFunding: fundingValue,
        progress: progressValue,
        prototypeStatus: form.prototypeStatus,
        testingStatus: form.testingStatus,
        implementationStatus: form.implementationStatus,
        deploymentStatus: form.deploymentStatus,
        createdBy: profile?.id || '',
      });
      show('Solution submitted to Government for review.', 'success');
      setFormTarget(null);
      setForm(null);
    } catch (error) {
      show((error as Error).message || 'Unable to save the solution.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !challenges.length) return <LoadingState label="Loading your accepted challenges..." />;

  return <div className="civic-page space-y-5">
    <SectionHeader
      title="My Solutions"
      subtitle="Solutions developed for the Government-routed challenges accepted by your organization."
      action={<button className="btn-secondary" onClick={() => onNavigate('/dashboard/projects')}><Rocket size={14} /> My Projects</button>}
    />

    {(platformError || solutionError) && <p className="text-sm text-error-600" role="alert">{solutionError || platformError}</p>}

    {!accepted.length ? (
      <Card>
        <EmptyState
          icon={<FileText size={40} />}
          title="No solutions yet"
          description="Accept a Government-routed challenge to start working on a solution."
          action={<button className="btn-primary" onClick={() => onNavigate('/dashboard/challenges')}>Explore Challenges</button>}
        />
      </Card>
    ) : <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Accepted Projects" value={accepted.length} icon={<Target size={18} />} />
        <MetricCard label="Solutions Defined" value={definedCount} icon={<CheckCircle2 size={18} />} color="secondary" />
        <MetricCard label="Awaiting Government Review" value={awaitingReviewCount} icon={<FileText size={18} />} color="warning" />
        <MetricCard label="In Development" value={inDevelopmentCount} icon={<FlaskConical size={18} />} color="warning" />
      </div>

      {!definedCount && (
        <Card className="p-4 border-warning-200 bg-warning-50/50">
          <p className="text-sm font-semibold text-primary-900">No solutions yet</p>
          <p className="text-sm text-neutral-600 mt-1">You have accepted challenges, but no solution has been added yet. Use <b>Add Solution</b> on a project below to record what your organization proposes.</p>
          <button className="btn-secondary mt-3" onClick={() => onNavigate('/dashboard/projects')}>View My Projects</button>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {rows.map(row => <SolutionCard
          key={row.challenge.id}
          row={row}
          onView={() => setDetail(row)}
          onEdit={() => openForm(row)}
        />)}
      </div>
    </>}

    {detail && <SolutionDetailModal
      row={detail}
      onClose={() => setDetail(null)}
      onEdit={() => { const row = detail; setDetail(null); openForm(row); }}
      onOpenProject={() => onNavigate(`/dashboard/projects/${encodeURIComponent(detail.challenge.id)}`)}
    />}

    {formTarget && form && <SolutionFormModal
      row={formTarget}
      form={form}
      busy={busy}
      onChange={setForm}
      onClose={() => { setFormTarget(null); setForm(null); }}
      onSave={() => void submitForm()}
    />}
  </div>;
}

function SolutionCard({ row, onView, onEdit }: { row: SolutionRow; onView: () => void; onEdit: () => void }) {
  const { challenge, solution, review } = row;
  const status = solutionStatusOf(solution);
  const progress = resolveSolutionProgress(solution, challenge.progress);
  const reviewLabel = solutionReviewStatusLabel(review?.status);
  const reviewColor = review?.status === 'APPROVED' ? 'bg-success-50 text-success-700' : review?.status === 'CHANGES_REQUESTED' || review?.status === 'REJECTED' ? 'bg-warning-50 text-warning-700' : 'bg-secondary-50 text-secondary-700';
  return <Card className="p-5 flex flex-col" hover>
    <div className="flex items-start justify-between gap-3">
      <h3 className="font-bold text-primary-900">{solution?.title || challenge.title}</h3>
      <span className={`badge ${reviewLabel ? reviewColor : SOLUTION_STATUS_STYLES[status]}`}>{reviewLabel || SOLUTION_STATUS_LABELS[status]}</span>
    </div>
    <div className="flex flex-wrap gap-2 mt-2 text-xs text-neutral-500">
      <span className="badge bg-primary-50 text-primary-700">{challenge.domain || 'Other'}</span>
      <span><MapPin size={12} className="inline" /> {locationOf(challenge)}</span>
      <span>Accepted {formatDate(challenge.publishedAt || challenge.created_at)}</span>
    </div>

    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Original problem</p>
      <p className="text-sm text-neutral-700 mt-1 line-clamp-4">{problemTextOf(challenge)}</p>
    </div>

    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Proposed solution</p>
      <p className="text-sm text-neutral-700 mt-1 line-clamp-4">{solution?.solution?.trim() || 'No solution has been added yet.'}</p>
    </div>

    <div className="grid grid-cols-2 gap-2 mt-4">
      <MetricRow label="Funding" value={typeof solution?.estimatedFunding === 'number' ? formatRupees(solution.estimatedFunding) : 'Not assigned yet'} />
      <div className="rounded-lg bg-neutral-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Solution Progress</p>
        <div className="mt-1"><ProgressBar progress={progress} /></div>
      </div>
      <MetricRow label="Prototype" value={stageLabel('prototype', solution?.prototypeStatus || 'NOT_STARTED')} />
      <MetricRow label="Testing" value={stageLabel('testing', solution?.testingStatus || 'NOT_STARTED')} />
    </div>

    <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn-primary !py-2" onClick={onView}>View Solution</button>
      <button className="btn-secondary !py-2" onClick={onEdit}><Plus size={14} /> {solution ? 'Edit Solution' : 'Add Solution'}</button>
    </div>
  </Card>;
}

function SolutionDetailModal({ row, onClose, onEdit, onOpenProject }: { row: SolutionRow; onClose: () => void; onEdit: () => void; onOpenProject: () => void }) {
  const { challenge, solution } = row;
  const progress = resolveSolutionProgress(solution, challenge.progress);
  return <div className="fixed inset-0 z-50 bg-primary-950/30 p-4 flex items-start justify-center overflow-y-auto" onClick={onClose}>
    <section role="dialog" aria-modal="true" className="w-full max-w-2xl rounded-xl bg-[#fffaf0] p-6 shadow-2xl my-8" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Solution</p>
          <h2 className="text-xl font-bold text-primary-900 mt-1">{solution?.title || challenge.title}</h2>
          <p className="text-xs text-neutral-500 mt-1">Challenge {challenge.challenge_code || challenge.id}</p>
        </div>
        <button className="btn-ghost" onClick={onClose} aria-label="Close solution details"><X size={18} /></button>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <MetricRow label="Government review" value={solutionReviewStatusLabel(row.review?.status) || 'Not submitted'} hint={row.review?.feedback || undefined} />
        <MetricRow label="Location" value={locationOf(challenge)} />
        <MetricRow label="Government status" value={String(challenge.governmentVerificationStatus || 'Not available').replaceAll('_', ' ')} hint={challenge.collaborationType ? `Routed for ${String(challenge.collaborationType).replaceAll('_', ' ').toLowerCase()}` : undefined} />
        <MetricRow label="Industry" value={challenge.industryPartnerName || 'Not available'} />
        <MetricRow label="Domain" value={[challenge.domain, challenge.subdomain].filter(Boolean).join(' · ') || 'Not available'} />
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Original challenge / problem</p>
          <p className="text-sm text-neutral-700 mt-1 whitespace-pre-line">{problemTextOf(challenge)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Proposed solution</p>
          <p className="text-sm text-neutral-700 mt-1 whitespace-pre-line">{solution?.solution?.trim() || 'No solution has been added yet.'}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Technology / approach</p>
          <p className="text-sm text-neutral-700 mt-1 whitespace-pre-line">{solution?.approach?.trim() || 'Not available'}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Expected impact</p>
          <p className="text-sm text-neutral-700 mt-1 whitespace-pre-line">{solution?.expectedImpact?.trim() || 'Not available'}</p>
        </div>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <MetricRow label="Funding" value={typeof solution?.estimatedFunding === 'number' ? formatRupees(solution.estimatedFunding) : 'Not assigned yet'} />
        <div className="rounded-lg bg-neutral-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Solution progress</p>
          <div className="mt-1"><ProgressBar progress={progress} /></div>
        </div>
        <MetricRow label="Prototype" value={stageLabel('prototype', solution?.prototypeStatus || 'NOT_STARTED')} />
        <MetricRow label="Testing" value={stageLabel('testing', solution?.testingStatus || 'NOT_STARTED')} />
        <MetricRow label="Implementation" value={stageLabel('implementation', solution?.implementationStatus || 'NOT_STARTED')} />
        <MetricRow label="Deployment" value={stageLabel('deployment', solution?.deploymentStatus || 'NOT_STARTED')} />
      </div>

      <p className="text-xs text-neutral-500 mt-4">Project stage recorded on the accepted challenge: {String(challenge.currentStage || challenge.challengeStatus || 'Not available').replaceAll('_', ' ')}</p>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button className="btn-ghost" onClick={onOpenProject}>Open in Projects</button>
        <button className="btn-secondary" onClick={onEdit}>{solution ? 'Edit Solution' : 'Add Solution'}</button>
        <button className="btn-primary" onClick={onClose}>Close</button>
      </div>
    </section>
  </div>;
}

function SolutionFormModal({ row, form, busy, onChange, onClose, onSave }: {
  row: SolutionRow;
  form: SolutionForm;
  busy: boolean;
  onChange: (form: SolutionForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { challenge, solution } = row;
  return <div className="fixed inset-0 z-50 bg-primary-950/30 p-4 flex items-start justify-center overflow-y-auto" onClick={onClose}>
    <section role="dialog" aria-modal="true" className="w-full max-w-2xl rounded-xl bg-[#fffaf0] p-6 shadow-2xl my-8" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">{solution ? 'Update solution' : 'Add solution'}</p>
          <h2 className="text-xl font-bold text-primary-900 mt-1">{challenge.title}</h2>
          <p className="text-xs text-neutral-500 mt-1">Linked to challenge {challenge.challenge_code || challenge.id} · {locationOf(challenge)}</p>
        </div>
        <button className="btn-ghost" onClick={onClose} aria-label="Close solution form"><X size={18} /></button>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-5">
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium text-neutral-700">Solution title</span>
          <input className="input" value={form.title} onChange={event => onChange({ ...form, title: event.target.value })} placeholder="Name the solution your organization proposes" />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium text-neutral-700">Proposed solution</span>
          <textarea className="input min-h-24" value={form.solution} onChange={event => onChange({ ...form, solution: event.target.value })} placeholder="What will your organization build or deliver for this problem?" />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium text-neutral-700">Expected impact</span>
          <textarea className="input min-h-20" value={form.expectedImpact} onChange={event => onChange({ ...form, expectedImpact: event.target.value })} placeholder="Which outcome should this solution create for the affected community?" />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium text-neutral-700">Technology / approach</span>
          <input className="input" value={form.approach} onChange={event => onChange({ ...form, approach: event.target.value })} placeholder="Key technology or delivery approach" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-neutral-700">Estimated funding (optional)</span>
          <input className="input" inputMode="numeric" value={form.estimatedFunding} onChange={event => onChange({ ...form, estimatedFunding: event.target.value })} placeholder="Amount in rupees" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium text-neutral-700">Solution progress % (optional)</span>
          <input className="input" inputMode="numeric" value={form.progress} onChange={event => onChange({ ...form, progress: event.target.value })} placeholder="0 - 100" />
        </label>
        {STAGE_SECTIONS.map(({ section, label }) => <label className="space-y-1" key={section}>
          <span className="text-sm font-medium text-neutral-700">{label}</span>
          <select className="input" value={stageValueOf(form, section)} onChange={event => onChange(withStage(form, section, event.target.value as SolutionStage))}>
            {STAGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{stageLabel(section, option.value)}</option>)}
          </select>
        </label>)}
      </div>

      <div className="flex flex-wrap justify-end gap-2 mt-5">
        <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn-primary" onClick={onSave} disabled={busy}>{busy ? 'Submitting…' : 'Submit for Government Review'}</button>
      </div>
    </section>
  </div>;
}

