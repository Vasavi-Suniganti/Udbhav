import {useEffect,useMemo,useState} from 'react';
import {Building2,GraduationCap,HeartHandshake,Search,Users,Settings,CheckSquare,BrainCircuit,AlertTriangle,CheckCircle2,Clock,FileText} from 'lucide-react';
import {Card,EmptyState,ErrorState,LoadingState,MetricCard,SectionHeader} from '@/components/ui';
import FlowButton from '@/components/ui/flow-button';
import {usePlatform} from '@/context/PlatformContext';
import {api} from '@/lib/api';
import {useAuth} from '@/context/AuthContext';
import {askJanSamadhanAssistant,type AssistantMessage,type AssistantCard} from '@/lib/aiAssistant';
import {buildUniversitySolutionTargets,mergeUniversitySolutionProjects,subscribeToGovernmentSolutionSubmissions,subscribeToUniversitySolutionSubmissions,universityRoutedSolutionProblems} from '@/lib/solutions';

export function InstitutionsPage(){const{universities,faculty,students}=usePlatform();return <div className="civic-page"><SectionHeader title="Institution Capability Network" subtitle="Verified departments, faculty expertise, labs and student capacity used by the challenge-specific matching engine."/><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{universities.map((u:any)=><Card key={u.id} className="p-5"><div className="flex justify-between"><div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center"><Building2 size={20}/></div>{u.verified&&<span className="badge bg-success-50 text-success-700">Verified</span>}</div><h3 className="font-semibold mt-3">{u.name}</h3><p className="text-sm text-neutral-500">{u.district} · NAAC {u.naac||'—'}</p><div className="mt-3 flex flex-wrap gap-1">{(u.expertise||[]).slice(0,6).map((x:string)=><span className="badge bg-neutral-100 text-neutral-600" key={x}>{x}</span>)}</div><div className="grid grid-cols-2 gap-2 text-xs mt-4"><div className="rounded-lg bg-neutral-50 p-2">Faculty <b>{faculty.filter((f:any)=>f.universityId===u.id).length}</b></div><div className="rounded-lg bg-neutral-50 p-2">Students <b>{students.filter((s:any)=>s.universityId===u.id).length}</b></div></div></Card>)}</div></div>}
export function SolutionSubmissionsPage({ initialProjectId }: { initialProjectId?: string } = {}) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [submissionTargets, setSubmissionTargets] = useState<any[]>([]);
  const [universityId, setUniversityId] = useState('');
  const [universityName, setUniversityName] = useState('University');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(initialProjectId || '');
  const [formOpen, setFormOpen] = useState(Boolean(initialProjectId));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const [form, setForm] = useState({
    submissionId: '',
    projectId: initialProjectId || '',
    challengeTitle: '',
    solutionTitle: '',
    summary: '',
    approach: '',
    impact: '',
    evidenceLinks: '',
    technicalNotes: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [overview, availableProjects, availableChallenges] = await Promise.all([api.universityOverview(), api.projects(), api.challenges()]);
      const resolvedUniversityId = String(overview.universityId || profile?.organization_id || profile?.id || '');
      const universityProjects = mergeUniversitySolutionProjects(
        Array.isArray(overview.projects) ? overview.projects : [],
        Array.isArray(availableProjects) ? availableProjects : [],
        Array.isArray(overview.teams) ? overview.teams : [],
        resolvedUniversityId,
      );
      const routedProblems = universityRoutedSolutionProblems([
        ...(Array.isArray(availableChallenges) ? availableChallenges : []),
        ...(Array.isArray(overview.challenges) ? overview.challenges : []),
      ]);
      const projectList = buildUniversitySolutionTargets(universityProjects, routedProblems);
      setUniversityId(resolvedUniversityId);
      setUniversityName(String(overview.university?.name || profile?.full_name || 'University'));
      setSubmissionTargets(projectList);
      if (initialProjectId && !selectedId) {
        setSelectedId(initialProjectId);
        setFormOpen(true);
      }
      const requestedTarget = projectList.find((target: any) => target.id === selectedProjectId || target.linkedProjectId === selectedProjectId || target.problemId === selectedProjectId || target.challengeId === selectedProjectId);
      if (requestedTarget) {
        setSelectedProjectId(requestedTarget.id);
      } else if (projectList.length) {
        setSelectedProjectId(projectList[0].id);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [profile?.id, profile?.organization_id, initialProjectId]);

  useEffect(() => {
    if (!universityId) return;
    return subscribeToUniversitySolutionSubmissions([universityId, profile?.id || ''], items => {
      setRows(items);
    }, subscriptionError => setError(subscriptionError.message));
  }, [universityId, profile?.id]);

  useEffect(() => {
    if (!selectedId && rows.length) setSelectedId(rows[0].submissionId || rows[0].id);
  }, [rows, selectedId]);

  const filtered = useMemo(() => rows.filter((entry: any) => {
    const haystack = [entry.solutionTitle, entry.challengeTitle, entry.status, entry.projectTitle, entry.universityName].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [rows, query]);

  const selectedSubmission = filtered.find((entry: any) => (entry.submissionId || entry.id) === selectedId)
    || rows.find((entry: any) => (entry.submissionId || entry.id) === selectedId)
    || filtered[0]
    || rows[0]
    || null;
  const selectedTarget = selectedSubmission && submissionTargets.find((target: any) =>
    (target.linkedProjectId && target.linkedProjectId === selectedSubmission.projectId)
    || (target.problemId && target.problemId === selectedSubmission.problemId)
    || (target.challengeId && target.challengeId === selectedSubmission.challengeId)
  );

  const metrics = useMemo(() => ({
    total: rows.length,
    underReview: rows.filter((entry: any) => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING', 'REVIEW_PENDING'].includes(String(entry.status || '').toUpperCase())).length,
    changes: rows.filter((entry: any) => String(entry.status || '').toUpperCase() === 'CHANGES_REQUESTED').length,
    approved: rows.filter((entry: any) => ['APPROVED', 'FIELD_TESTING', 'DEPLOYMENT_READY', 'DEPLOYED'].includes(String(entry.status || '').toUpperCase())).length,
  }), [rows]);

  const fillForm = async (targetId: string, draft?: any) => {
    const targetProject = submissionTargets.find((target: any) => target.id === targetId);
    if (!targetProject) {
      setError(submissionTargets.length ? 'Select an available university problem before creating a submission.' : 'No university-routed problems or registered projects are available yet.');
      return;
    }

    const existing = draft || await api.solutionSubmissionByProject(targetProject.linkedProjectId || targetProject.problemId || targetProject.challengeId, universityId);
    const challengeTitle = targetProject.challengeTitle || targetProject.problemTitle || targetProject.title || 'Challenge solution';
    setSelectedProjectId(targetProject.id);
    setForm({
      submissionId: existing?.submissionId || existing?.id || '',
      projectId: targetProject.linkedProjectId || '',
      challengeTitle,
      solutionTitle: existing?.solutionTitle || existing?.title || `${challengeTitle} solution`,
      summary: existing?.summary || '',
      approach: existing?.approach || '',
      impact: existing?.impact || '',
      evidenceLinks: existing?.evidenceLinks || existing?.evidence || '',
      technicalNotes: existing?.technicalNotes || '',
    });
    setFormOpen(true);
  };

  async function handleSave(mode: 'DRAFT' | 'SUBMITTED') {
    if (!selectedProjectId) {
      setError('Select a problem before saving a submission.');
      return;
    }

    const target = submissionTargets.find((item: any) => item.id === selectedProjectId);
    if (!target) {
      setError('The selected problem is not available to this university account.');
      return;
    }

    const payload = {
      submissionId: form.submissionId,
      id: form.submissionId,
      projectId: target.linkedProjectId || '',
      projectTitle: target.linkedProjectId ? target.title || target.projectName || '' : '',
      problemId: target.problemId || target.challengeId || '',
      teamId: target.teamId || target.team_id || '',
      challengeId: target.challengeId || target.problemId || '',
      universityId: universityId || profile?.organization_id || profile?.id || '',
      universityName,
      challengeTitle: form.challengeTitle || target.challengeTitle || target.problemTitle || target.title || 'Challenge',
      solutionTitle: form.solutionTitle || `${target.challengeTitle || target.title || 'Solution'} submission`,
      summary: form.summary,
      approach: form.approach,
      impact: form.impact,
      evidenceLinks: form.evidenceLinks,
      technicalNotes: form.technicalNotes,
      teamName: target.teamName || target.projectTeamName || '',
      status: mode === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
      governmentReview: {
        status: mode === 'SUBMITTED' ? 'PENDING' : 'PENDING',
        feedback: '',
        reviewerId: null,
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
      },
    };

    try {
      setSaving(true);
      setError('');
      if (mode === 'SUBMITTED') {
        await api.submitSolutionSubmission(payload);
      } else {
        await api.saveSolutionSubmission(payload);
      }
      await load();
      setFormOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !rows.length && !submissionTargets.length) {
    return <div className="civic-page"><ErrorState title="Could not load university submissions" description={error} onRetry={() => void load()} /></div>;
  }

  return <div className="civic-page space-y-5">
    <SectionHeader title="Solution Submissions" subtitle="Create, update and track solutions for university-routed problems, with registered project and team links where available." />

    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="relative max-w-md w-full">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input className="input pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search submissions, teams or challenge names" />
      </div>
      <button className="btn-primary" disabled={loading || !submissionTargets.length} onClick={() => void fillForm(selectedProjectId || submissionTargets[0]?.id || '')}>New submission</button>
    </div>

    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <MetricCard label="Total submissions" value={metrics.total} icon={<FileText size={18} />} />
      <MetricCard label="Under review" value={metrics.underReview} icon={<Clock size={18} />} color="warning" />
      <MetricCard label="Changes required" value={metrics.changes} icon={<AlertTriangle size={18} />} color="secondary" />
      <MetricCard label="Approved / ready" value={metrics.approved} icon={<CheckCircle2 size={18} />} color="success" />
    </div>

    {error && <p className="text-sm text-error-600">{error}</p>}

    {filtered.length === 0 ? (
      <Card className="p-6">
        <EmptyState
          icon={<GraduationCap size={40} />}
          title="No solution submissions found"
          description="University submissions appear here as soon as a registered team creates a project and uploads a solution record for review."
        />
        <div className="mt-4">
          <button className="btn-primary" disabled={loading || !submissionTargets.length} onClick={() => void fillForm(selectedProjectId || submissionTargets[0]?.id || '')}>Create the first submission</button>
        </div>
      </Card>
    ) : (
      <div className="grid xl:grid-cols-[1.15fr_1.45fr] gap-5">
        <div className="space-y-3">
          {filtered.map((entry: any) => {
            const submissionId = entry.submissionId || entry.id;
            const status = String(entry.status || 'DRAFT').replace(/_/g, ' ');
            return (
              <button
                key={submissionId}
                type="button"
                onClick={() => setSelectedId(submissionId)}
                className={`w-full rounded-2xl border p-4 text-left transition ${selectedSubmission && (selectedSubmission.submissionId || selectedSubmission.id) === submissionId ? 'border-primary-300 bg-primary-50 shadow-sm' : 'border-neutral-200 bg-white hover:border-primary-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary-900">{entry.solutionTitle || entry.title || 'Solution submission'}</p>
                    <p className="text-xs text-neutral-500 mt-1">{entry.challengeTitle || 'Challenge solution'}</p>
                  </div>
                  <span className="badge bg-neutral-100 text-neutral-700">{status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-600">
                  <span className="badge bg-primary-50 text-primary-700">{entry.teamName || 'University team'}</span>
                  <span className="badge bg-secondary-50 text-secondary-700">{entry.projectTitle || 'Project record'}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-3">Updated {new Date(entry.updatedAt || entry.createdAt || Date.now()).toLocaleDateString('en-IN')}</p>
              </button>
            );
          })}
        </div>

        {selectedSubmission && (
          <Card className="p-5">
            <div className="flex flex-col gap-3 border-b pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Submission</p>
                  <h3 className="font-bold text-primary-900 text-xl mt-1">{selectedSubmission.solutionTitle || selectedSubmission.title || 'Solution'}</h3>
                </div>
                <span className="badge bg-success-50 text-success-700">{String(selectedSubmission.status || 'DRAFT').replace(/_/g, ' ')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary text-xs" onClick={() => void fillForm(selectedTarget?.id || selectedProjectId || submissionTargets[0]?.id || '', selectedSubmission)}>Edit & continue</button>
                <button className="btn-secondary text-xs" onClick={() => window.location.hash = `/dashboard/solution-submissions/${selectedSubmission.submissionId || selectedSubmission.id}`}>View details</button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wide text-neutral-500">Challenge</p><p className="text-sm font-semibold text-primary-900 mt-1">{selectedSubmission.challengeTitle || 'Challenge solution'}</p></div>
              <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wide text-neutral-500">Project</p><p className="text-sm font-semibold text-primary-900 mt-1">{selectedSubmission.projectTitle || selectedSubmission.projectId || 'No project linked yet'}</p></div>
              <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wide text-neutral-500">Team</p><p className="text-sm font-semibold text-primary-900 mt-1">{selectedSubmission.teamName || 'University team'}</p></div>
              <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wide text-neutral-500">Last updated</p><p className="text-sm font-semibold text-primary-900 mt-1">{new Date(selectedSubmission.updatedAt || selectedSubmission.createdAt || Date.now()).toLocaleDateString('en-IN')}</p></div>
            </div>

            <div className="mt-5 space-y-4">
              <section>
                <h4 className="font-semibold text-primary-900">Summary</h4>
                <p className="text-sm text-neutral-600 mt-2 leading-6">{selectedSubmission.summary || 'No summary added yet.'}</p>
              </section>

              <section>
                <h4 className="font-semibold text-primary-900">Approach</h4>
                <p className="text-sm text-neutral-600 mt-2 leading-6">{selectedSubmission.approach || 'No technical approach has been written yet.'}</p>
              </section>

              <section>
                <h4 className="font-semibold text-primary-900">Government feedback</h4>
                <div className="mt-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-600">
                  {selectedSubmission.governmentReview?.feedback || 'No formal government feedback has been posted yet.'}
                </div>
              </section>
            </div>
          </Card>
        )}
      </div>
    )}

    {formOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4">
        <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl border border-neutral-200">
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Solution submission</p>
              <h3 className="font-bold text-primary-900 text-xl">{form.solutionTitle || 'Prepare a solution record'}</h3>
            </div>
            <button className="btn-ghost" onClick={() => setFormOpen(false)}>Close</button>
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Problem statement</span>
              <select className="input" value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); void fillForm(event.target.value); }} disabled={saving || !submissionTargets.length}>
                {submissionTargets.map((target: any) => (
                  <option key={target.id} value={target.id}>{target.challengeTitle || target.problemTitle || target.title || 'Problem'}{target.teamName ? ` · ${target.teamName}` : target.isProblemOnly ? ' · No project linked yet' : ''}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Solution title</span>
              <input className="input" value={form.solutionTitle} onChange={(event) => setForm((current) => ({ ...current, solutionTitle: event.target.value }))} placeholder="Example: AI-powered flood alert dashboard for the district" />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Challenge title</span>
              <input className="input" value={form.challengeTitle} onChange={(event) => setForm((current) => ({ ...current, challengeTitle: event.target.value }))} />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Short summary</span>
              <textarea rows={4} className="input" value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} placeholder="Explain the solution outcome, scope and use case." />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Technical approach</span>
              <textarea rows={4} className="input" value={form.approach} onChange={(event) => setForm((current) => ({ ...current, approach: event.target.value }))} placeholder="Describe design, tooling, data sources, and implementation approach." />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Impact & readiness</span>
              <textarea rows={3} className="input" value={form.impact} onChange={(event) => setForm((current) => ({ ...current, impact: event.target.value }))} placeholder="Explain measurable impact and readiness for deployment." />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Evidence and links</span>
              <textarea rows={3} className="input" value={form.evidenceLinks} onChange={(event) => setForm((current) => ({ ...current, evidenceLinks: event.target.value }))} placeholder="Static links, documents, screenshots, demo URLs..." />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-neutral-700">Technical notes</span>
              <textarea rows={3} className="input" value={form.technicalNotes} onChange={(event) => setForm((current) => ({ ...current, technicalNotes: event.target.value }))} placeholder="Anything the review team needs to know before approval." />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button className="btn-secondary" disabled={saving} onClick={() => void handleSave('DRAFT')}>{saving ? 'Saving...' : 'Save draft'}</button>
            <button className="btn-primary" disabled={saving} onClick={() => void handleSave('SUBMITTED')}>{saving ? 'Submitting...' : 'Submit for review'}</button>
          </div>
        </div>
      </div>
    )}
  </div>;
}

export function SolutionSubmissionDetailPage({ submissionId }: { submissionId: string }) {
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const record = await api.solutionSubmission(submissionId);
        setSubmission(record);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [submissionId]);

  if (loading) {
    return <div className="civic-page"><LoadingState label="Loading submission details..." /></div>;
  }

  if (error || !submission) {
    return <div className="civic-page"><ErrorState title="Submission not found" description={error || 'The request could not be found.'} onRetry={() => window.location.hash = '/dashboard/solution-submissions'} /></div>;
  }

  return <div className="civic-page max-w-4xl space-y-5">
    <SectionHeader title={submission.solutionTitle || 'Solution submission'} subtitle={`Status: ${String(submission.status || 'DRAFT').replace(/_/g, ' ')}`} />

    <Card className="p-5 space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wide text-neutral-500">Challenge</p><p className="text-sm font-semibold text-primary-900 mt-1">{submission.challengeTitle}</p></div>
        <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wide text-neutral-500">Project</p><p className="text-sm font-semibold text-primary-900 mt-1">{submission.projectId}</p></div>
      </div>
      <div>
        <h4 className="font-semibold text-primary-900">Summary</h4>
        <p className="text-sm text-neutral-600 mt-2 leading-6">{submission.summary || 'No summary was added yet.'}</p>
      </div>
      <div>
        <h4 className="font-semibold text-primary-900">Approach</h4>
        <p className="text-sm text-neutral-600 mt-2 leading-6">{submission.approach || 'No technical approach was recorded yet.'}</p>
      </div>
      <div>
        <h4 className="font-semibold text-primary-900">Government feedback</h4>
        <div className="mt-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-600">
          {submission.governmentReview?.feedback || 'No government feedback has been recorded yet.'}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => window.location.hash = '/dashboard/solution-submissions'}>Back to submissions</button>
        <button className="btn-primary" onClick={() => window.location.hash = `/dashboard/solution-submissions?projectId=${encodeURIComponent(submission.projectId || '')}`}>Edit submission</button>
      </div>
    </Card>
  </div>;
}

export function GovernmentSolutionReviewPage() {
  const { profile } = useAuth();
  const { refresh: refreshPlatform } = usePlatform();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeToGovernmentSolutionSubmissions(items => {
    setRows(items);
    setLoading(false);
    setError('');
  }, error => {
    setError(error.message);
    setLoading(false);
  }), [profile?.id]);

  useEffect(() => {
    if (!selectedId && rows.length) setSelectedId(rows[0].submissionId || rows[0].id);
  }, [rows, selectedId]);

  useEffect(() => {
    if (!selectedId && rows.length) setSelectedId(rows[0].submissionId || rows[0].id);
  }, [rows, selectedId]);

  const selected = rows.find((entry: any) => (entry.submissionId || entry.id) === selectedId) || null;

  const action = async (status: 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED') => {
    if (!selected) return;
    if (['CHANGES_REQUESTED', 'REJECTED'].includes(status) && !feedback.trim()) {
      setError('Add review notes before requesting changes or rejecting this solution.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.updateSolutionSubmissionStatus(selected.submissionId || selected.id, status, feedback || selected.governmentReview?.feedback || '', profile?.id || 'government-reviewer');
      setFeedback('');
      if (status === 'APPROVED') await refreshPlatform();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="civic-page space-y-5">
    <SectionHeader title="Solution Review" subtitle="Government reviewers can approve, request changes, or reject university and industry solutions from the shared submission queue." />

    {error && <p className="text-sm text-error-600">{error}</p>}

    {loading ? <LoadingState label="Loading solution review queue..." /> : rows.length === 0 ? (
      <Card className="p-6"><EmptyState icon={<CheckCircle2 size={40} />} title="No solution submissions are awaiting review" description="University and industry proposals submitted for review will appear here." /></Card>
    ) : (
      <div className="grid xl:grid-cols-[1.15fr_1.4fr] gap-5">
        <div className="space-y-3">
          {rows.map((entry: any) => (
            <button key={entry.submissionId || entry.id} type="button" onClick={() => { setSelectedId(entry.submissionId || entry.id); setFeedback(''); setError(''); }} className={`w-full rounded-2xl border p-4 text-left transition ${selected && (selected.submissionId || selected.id) === (entry.submissionId || entry.id) ? 'border-primary-300 bg-primary-50 shadow-sm' : 'border-neutral-200 bg-white hover:border-primary-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary-900">{entry.solutionTitle || 'Solution submission'}</p>
                  <p className="text-xs text-neutral-500 mt-1">{entry.challengeTitle || 'Challenge title'}</p>
                </div>
                <span className="badge bg-neutral-100 text-neutral-700">{String(entry.status || 'SUBMITTED').replace(/_/g, ' ')}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-600">
                <span className="badge bg-primary-50 text-primary-700">{entry.organizationName || entry.universityName || entry.industryName || (entry.submitterRole === 'INDUSTRY' ? 'Industry partner' : 'University')}</span>
                <span className="badge bg-secondary-50 text-secondary-700">{entry.teamName || (entry.submitterRole === 'INDUSTRY' ? 'Industry' : 'Team')}</span>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <Card className="p-5">
            <div className="border-b pb-3">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Submission</p>
              <h3 className="font-bold text-primary-900 text-xl mt-1">{selected.solutionTitle || 'Solution record'}</h3>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wide text-neutral-500">{selected.submitterRole === 'INDUSTRY' ? 'Industry organization' : 'University'}</p><p className="text-sm font-semibold text-primary-900 mt-1">{selected.organizationName || selected.universityName || selected.industryName || 'Organization'}</p></div>
                <div className="rounded-xl bg-neutral-50 p-3"><p className="text-[11px] uppercase tracking-wide text-neutral-500">Status</p><p className="text-sm font-semibold text-primary-900 mt-1">{String(selected.status || 'SUBMITTED').replace(/_/g, ' ')}</p></div>
              </div>

              <section>
                <h4 className="font-semibold text-primary-900">Original problem</h4>
                <p className="text-sm text-neutral-600 mt-2 leading-6 whitespace-pre-wrap">{selected.problem || selected.originalProblem || selected.challengeDescription || 'No original problem description recorded.'}</p>
              </section>

              <section>
                <h4 className="font-semibold text-primary-900">Proposed solution</h4>
                <p className="text-sm text-neutral-600 mt-2 leading-6 whitespace-pre-wrap">{selected.solution || selected.summary || 'No proposed solution recorded.'}</p>
              </section>

              <section>
                <h4 className="font-semibold text-primary-900">Technical approach</h4>
                <p className="text-sm text-neutral-600 mt-2 leading-6">{selected.approach || 'No technical approach recorded yet.'}</p>
              </section>

              <section>
                <h4 className="font-semibold text-primary-900">Expected impact</h4>
                <p className="text-sm text-neutral-600 mt-2 leading-6 whitespace-pre-wrap">{selected.impact || selected.expectedImpact || 'No expected impact recorded.'}</p>
              </section>

              {(selected.technicalNotes || selected.evidenceLinks || selected.estimatedFunding != null || selected.progress != null) && <section className="grid sm:grid-cols-2 gap-3">
                {selected.technicalNotes && <div><h4 className="font-semibold text-primary-900">Technical notes</h4><p className="text-sm text-neutral-600 mt-2 whitespace-pre-wrap">{selected.technicalNotes}</p></div>}
                {selected.evidenceLinks && <div><h4 className="font-semibold text-primary-900">Evidence and links</h4><p className="text-sm text-neutral-600 mt-2 whitespace-pre-wrap break-all">{Array.isArray(selected.evidenceLinks) ? selected.evidenceLinks.join('\n') : selected.evidenceLinks}</p></div>}
                {selected.estimatedFunding != null && <div><h4 className="font-semibold text-primary-900">Estimated funding</h4><p className="text-sm text-neutral-600 mt-2">₹{Number(selected.estimatedFunding).toLocaleString('en-IN')}</p></div>}
                {selected.progress != null && <div><h4 className="font-semibold text-primary-900">Solution progress</h4><p className="text-sm text-neutral-600 mt-2">{selected.progress}%</p></div>}
              </section>}

              {selected.reviewHistory?.length > 0 && <section>
                <h4 className="font-semibold text-primary-900">Review history</h4>
                <div className="mt-2 space-y-2">{selected.reviewHistory.map((entry: any, index: number) => <div key={`${entry.status}-${entry.reviewedAt || index}`} className="rounded-lg bg-neutral-50 p-3"><div className="flex justify-between gap-3"><b className="text-sm">{String(entry.status || 'UPDATED').replace(/_/g, ' ')}</b><span className="text-xs text-neutral-500">{entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleString() : ''}</span></div>{entry.feedback && <p className="text-sm text-neutral-600 mt-1 whitespace-pre-wrap">{entry.feedback}</p>}</div>)}</div>
              </section>}

              {selected.reviewHistory?.length > 0 && <section>
                <h4 className="font-semibold text-primary-900">Review history</h4>
                <div className="mt-2 space-y-2">{selected.reviewHistory.map((entry: any, index: number) => <div key={`${entry.status}-${entry.reviewedAt || index}`} className="rounded-lg bg-neutral-50 p-3"><div className="flex justify-between gap-3"><b className="text-sm">{String(entry.status || 'UPDATED').replace(/_/g, ' ')}</b><span className="text-xs text-neutral-500">{entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleString() : ''}</span></div>{entry.feedback && <p className="text-sm text-neutral-600 mt-1 whitespace-pre-wrap">{entry.feedback}</p>}</div>)}</div>
              </section>}

              <section>
                <h4 className="font-semibold text-primary-900">Review notes</h4>
                <textarea rows={4} className="input mt-2" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Add feedback for the solution provider. Required for changes or rejection." />
              </section>

              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" disabled={busy} onClick={() => void action('UNDER_REVIEW')}>Start review</button>
                <button className="btn-secondary" disabled={busy} onClick={() => void action('CHANGES_REQUESTED')}>Request changes</button>
                <button className="btn-secondary" disabled={busy} onClick={() => void action('APPROVED')}>Approve</button>
                <button className="btn-ghost" disabled={busy} onClick={() => void action('REJECTED')}>Reject</button>
              </div>
            </div>
          </Card>
        )}
      </div>
    )}
  </div>;
}

export function FacultyPage(){return <SolutionSubmissionsPage />;}

export function TeamsPage(){const{students,faculty}=usePlatform();const rows=[...students.map((s:any)=>({...s,secondary:`${s.department} · Year ${s.year}`,chips:s.skills})),...faculty.map((f:any)=>({...f,secondary:`Faculty · ${f.department}`,chips:f.expertise}))];return <Directory title="Teams & Talent" subtitle="Students and faculty available for multidisciplinary innovation teams." icon={<Users/>} rows={rows}/>}
export function PartnersPage(){const{industry}=usePlatform();return <Directory title="Industry & CSR Capability Marketplace" subtitle="Verified partners offering manufacturing, mentorship, pilot support and funding capacity." icon={<HeartHandshake/>} rows={industry.map((x:any)=>({...x,secondary:`${x.type} · ${x.sector}`,chips:[...(x.expertise||[]),...(x.capabilities||[])]}))}/>}
export function TasksPage(){const{projects}=usePlatform();const tasks=projects.flatMap(p=>(p.tasks||[]).map(t=>({...t,project:p.title})));return <div className="civic-page"><SectionHeader title="My Tasks" subtitle="Tasks aggregated across the projects visible to your role."/>{tasks.length===0?<EmptyState icon={<CheckSquare size={40}/>} title="No tasks assigned" description="Tasks created in a project workspace will appear here."/>:<div className="grid md:grid-cols-2 gap-3">{tasks.map(t=><Card key={t.id} className="p-4"><div className="flex justify-between"><span className="badge bg-primary-50 text-primary-700">{t.status.replaceAll('_',' ')}</span><span className="text-xs text-neutral-400">{t.priority}</span></div><h3 className="font-semibold mt-2">{t.title}</h3><p className="text-xs text-neutral-500 mt-1">{t.project}</p></Card>)}</div>}</div>}
export function AdminUsersPage(){
  const[rows,setRows]=useState<any[]>([]),[requests,setRequests]=useState<any[]>([]),[msg,setMsg]=useState('');
  async function load(){try{const[u,r]=await Promise.all([api.adminUsers(),api.roleRequests()]);setRows(u);setRequests(r)}catch(e){setMsg((e as Error).message)}}
  useEffect(()=>{load()},[]);
  async function change(u:any,role:string){try{await api.updateUserRole(u.id,{role,district:u.district,organizationId:u.organizationId});await load()}catch(e){setMsg((e as Error).message)}}
  async function decide(r:any,decision:'APPROVE'|'REJECT'){const district=decision==='APPROVE'&&['PANCHAYAT_OFFICER','ULB_OFFICER','DISTRICT_OFFICER'].includes(r.requestedRole)?prompt('District scope (required for local government role):',r.district||'Ranchi')||undefined:r.district;const organizationId=decision==='APPROVE'&&['STUDENT','FACULTY','UNIVERSITY_ADMIN'].includes(r.requestedRole)?prompt('Verified institution ID:',r.organizationId||'u1')||undefined:r.organizationId;const note=decision==='REJECT'?prompt('Reason for rejection:')||'Verification requirements not met.':'Verified by platform administrator.';try{await api.decideRoleRequest(r.id,{decision,district,organizationId,note});await load()}catch(e){setMsg((e as Error).message)}}
  const pending=requests.filter(r=>r.status==='PENDING_VERIFICATION');
  return <div className="civic-page space-y-6"><SectionHeader title="User & Role Management" subtitle="Privileged signup roles enter a verification queue. Approved scope is synchronized to server RBAC and Firebase custom claims."/>{msg&&<p className="text-sm text-error-600">{msg}</p>}{pending.length>0&&<Card className="p-5"><h3 className="font-semibold">Pending role verification <span className="badge bg-amber-50 text-amber-700 ml-2">{pending.length}</span></h3><div className="mt-3 space-y-2">{pending.map(r=><div className="rounded-lg border p-3 flex flex-col md:flex-row md:items-center gap-3" key={r.id}><div className="flex-1"><b className="text-sm">{r.fullName}</b><p className="text-xs text-neutral-500">{r.email} · requests {r.requestedRole}{r.district?` · ${r.district}`:''}</p></div><button className="btn-secondary" onClick={()=>decide(r,'REJECT')}>Reject</button><button className="btn-primary" onClick={()=>decide(r,'APPROVE')}>Verify & approve</button></div>)}</div></Card>}<div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-neutral-50 text-left"><th className="p-3">User</th><th>Scope</th><th>Role</th></tr></thead><tbody>{rows.map(u=><tr key={u.id} className="border-t"><td className="p-3"><b>{u.name}</b><div className="text-xs text-neutral-400">{u.email}</div></td><td>{u.district||u.organizationId||'Statewide'}</td><td><select className="input max-w-[220px]" value={u.role} onChange={e=>change(u,e.target.value)}>{['CITIZEN','STUDENT','FACULTY','UNIVERSITY_ADMIN','INDUSTRY_PARTNER','STARTUP','MSME','CSR_PARTNER','RESEARCH_LAB','MENTOR','PANCHAYAT_OFFICER','ULB_OFFICER','DISTRICT_OFFICER','GOVERNMENT_OFFICER','PLATFORM_ADMIN'].map(r=><option key={r}>{r}</option>)}</select></td></tr>)}</tbody></table></div></div>
}
export function PlatformAdminDashboard({onNavigate}:{onNavigate?:(r:string)=>void}){
  const nav=(r:string)=>onNavigate?onNavigate(r):(window.location.hash=r);
  const[health,setHealth]=useState<any>(null),[flags,setFlags]=useState<any[]>([]),[requests,setRequests]=useState<any[]>([]),[msg,setMsg]=useState('');
  async function load(){try{const[h,f,r]=await Promise.all([api.systemHealth(),api.featureFlags(),api.roleRequests()]);setHealth(h);setFlags(f);setRequests(r.filter((x:any)=>x.status==='PENDING_VERIFICATION'));}catch(e){setMsg((e as Error).message)}}
  useEffect(()=>{load()},[]);
  async function toggle(flag:any){try{await api.setFeatureFlag(flag.key,{enabled:!flag.enabled});await load()}catch(e){setMsg((e as Error).message)}}
  async function decide(row:any,decision:'APPROVE'|'REJECT'){try{await api.decideRoleRequest(row.id,{decision,note:decision==='APPROVE'?'Approved by platform admin':'Rejected by platform admin'});await load()}catch(e){setMsg((e as Error).message)}}
  return <div className="civic-page space-y-6"><SectionHeader title="Platform Control Centre" subtitle="Approve identities, test operational services, and control production feature availability from one trusted workspace."/>{msg&&<p className="text-sm text-error-600">{msg}</p>}<div className="grid sm:grid-cols-3 gap-4"><button onClick={()=>nav('/dashboard/system-health')} className="card-hover p-4 text-left"><p className="text-xs text-neutral-500">Datastore</p><p className="text-xl font-semibold mt-1">{health?.datastore||'Checking'}</p><p className="text-xs text-neutral-500">Firebase {health?.firebase?'connected':'not detected'}</p></button><button onClick={()=>nav('/dashboard/users')} className="card-hover p-4 text-left"><p className="text-xs text-neutral-500">Pending approvals</p><p className="text-xl font-semibold mt-1">{requests.length}</p><span className="text-xs text-primary-700 font-semibold">Open queue →</span></button><button onClick={()=>nav('/dashboard/ai-jobs')} className="card-hover p-4 text-left"><p className="text-xs text-neutral-500">API status</p><p className="text-xl font-semibold mt-1">{health?'Healthy':'Checking'}</p><p className="text-xs text-neutral-500">Live service check</p></button></div><Card className="p-5"><SectionHeader title="Role approvals" subtitle="Every privileged signup is reviewed before permissions are activated."/>{requests.length===0?<p className="text-sm text-neutral-500">No pending requests.</p>:<div className="space-y-2">{requests.map((r:any)=><div key={r.id} className="border rounded-lg p-3 flex flex-wrap items-center gap-3"><div className="flex-1"><b>{r.fullName}</b><p className="text-xs text-neutral-500">{r.email} · {r.requestedRole} · {r.phone||'No phone'}</p></div><button className="btn-secondary" onClick={()=>decide(r,'REJECT')}>Reject</button><button className="btn-primary" onClick={()=>decide(r,'APPROVE')}>Approve</button></div>)}</div>}</Card><Card className="p-5"><SectionHeader title="Feature controls" subtitle="Disable a failing feature without taking the platform offline."/>{flags.length===0?<p className="text-sm text-neutral-500">No feature flags configured.</p>:<div className="grid sm:grid-cols-2 gap-2">{flags.map((f:any)=><button key={f.key} onClick={()=>toggle(f)} className="border rounded-lg p-3 text-left flex items-center justify-between"><span><b className="text-sm">{f.key}</b><span className="block text-xs text-neutral-500">{f.description||'Platform feature'}</span></span><span className={`badge ${f.enabled?'bg-success-50 text-success-700':'bg-neutral-100 text-neutral-500'}`}>{f.enabled?'Enabled':'Disabled'}</span></button>)}</div>}</Card></div>;
}

export function AuditPage(){const[rows,setRows]=useState<any[]>([]),[msg,setMsg]=useState('');useEffect(()=>{api.audit().then(setRows).catch(e=>setMsg(e.message))},[]);return <div className="civic-page"><SectionHeader title="Immutable Audit View" subtitle="Critical workflow actions are written by the trusted Node API, not editable by ordinary users."/>{msg&&<p className="text-sm text-error-600">{msg}</p>}<div className="space-y-2">{rows.slice(0,100).map(x=><Card className="p-3" key={x.id}><div className="flex justify-between"><b className="text-sm">{x.action}</b><span className="text-xs text-neutral-400">{new Date(x.timestamp).toLocaleString()}</span></div><p className="text-xs text-neutral-500">{x.entity} · {x.entityId} · actor {x.actor}</p></Card>)}</div></div>}
export function ModerationPage(){const[rows,setRows]=useState<any[]>([]);const load=()=>api.moderation().then(setRows).catch(()=>setRows([]));useEffect(()=>{load()},[]);return <div className="civic-page"><SectionHeader title="Moderation Queue" subtitle="Potential spam, external links and suspicious content are reviewed rather than automatically deleted."/><div className="space-y-3">{rows.map(x=><Card key={x.id} className="p-4 flex items-center gap-3"><div className="flex-1"><b className="text-sm">{x.reason}</b><p className="text-xs text-neutral-500">{x.entityType} · {x.entityId} · {x.severity}</p></div>{x.status==='OPEN'&&<><button className="btn-secondary" onClick={()=>api.moderate(x.id,'DISMISSED').then(load)}>Dismiss</button><button className="btn-primary" onClick={()=>api.moderate(x.id,'ACTIONED').then(load)}>Action</button></>}</Card>)}</div></div>}
export function SearchPage(){const[q,setQ]=useState(''),[data,setData]=useState<any>(null),[busy,setBusy]=useState(false);async function search(){if(q.trim().length<2)return;setBusy(true);try{setData(await api.search(q))}finally{setBusy(false)}}return <div className="civic-page max-w-6xl"><SectionHeader title="Global Search" subtitle="Search challenges, projects, institutions, faculty, industry and reusable solutions."/><div className="flex gap-2"><input className="input" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Search platform knowledge…"/><button className="btn-primary" onClick={search}><Search size={16}/> Search</button></div>{busy&&<p className="mt-3 text-sm">Searching…</p>}{data&&<div className="grid md:grid-cols-2 gap-4 mt-5">{Object.entries(data).map(([k,v])=><Card className="p-4" key={k}><h3 className="font-semibold capitalize">{k}</h3><div className="mt-2 space-y-2">{(v as any[]).length===0?<p className="text-sm text-neutral-400">No matches</p>:(v as any[]).map(x=><div className="rounded-lg bg-neutral-50 p-2 text-sm" key={x.id}>{x.title||x.name}</div>)}</div></Card>)}</div>}</div>}
type ChatTurn = AssistantMessage & { cards?: AssistantCard[]; sourceCount?: number };
export function CopilotPage(){
  const { profile } = useAuth();
  const { challenges } = usePlatform();
  const isCitizen = profile?.role === 'CITIZEN' || profile?.role === 'VOLUNTEER';
  const [q,setQ] = useState('');
  const [messages,setMessages] = useState<ChatTurn[]>([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const prompts = ['Show high-priority problems near me','What are the biggest community challenges?','Which problems need university support?','Which problems have industry support?','Summarize my reported problems'];
  async function ask(question = q){
    const text = question.trim();
    if (!text || busy) return;
    setQ('');
    setError('');
    setMessages(current => [...current, { role:'user', content:text }]);
    setBusy(true);
    try {
      const result = await askJanSamadhanAssistant(text, challenges, profile?.id, messages);
      setMessages(current => [...current, { role:'assistant', content:result.answer, cards:result.cards, sourceCount:result.sourceCount }]);
    } catch {
      setError('AI analysis is temporarily unavailable. Please try again.');
      setMessages(current => [...current, { role:'assistant', content:'Unable to retrieve UDBHAV data right now.' }]);
    } finally { setBusy(false); }
  }
  return <div className="civic-page max-w-4xl space-y-5">
    <SectionHeader title={isCitizen?'AI Community Analysis':'Government AI Copilot'} subtitle={isCitizen?'Ask any natural-language question about live UDBHAV problems and progress. Recommendations remain assistive and transparent.':'Ask any natural-language question using the live problem data available to your role.'}/>
    <Card className="p-5 civic-section-tint-violet">
      <div className="flex items-center gap-2 mb-3"><BrainCircuit size={19} className="text-[#705ab4]"/><span className="text-sm font-semibold text-primary-900">UDBHAV AI assistant</span></div>
      {messages.length > 0 && <div className="space-y-3 mb-4 max-h-[520px] overflow-y-auto pr-1">{messages.map((message,index)=><div key={`${message.role}-${index}`} className={`rounded-xl p-4 text-sm ${message.role==='user'?'ml-8 bg-primary-900 text-white':'mr-4 bg-white/75 border border-[#d9cff3] text-neutral-800'}`}><div className="text-[11px] font-semibold uppercase tracking-wide opacity-70 mb-1">{message.role==='user'?'You':'UDBHAV AI'}</div><p className="whitespace-pre-wrap leading-6">{message.content}</p>{message.cards&&message.cards.length>0&&<div className="grid md:grid-cols-2 gap-2 mt-3">{message.cards.map(card=><div key={card.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-xs"><b className="text-primary-900">{card.title}</b><p className="text-neutral-500 mt-1">{card.district} · {card.priority}</p><p className="text-neutral-600 mt-1">{card.status} · {card.stage} · {card.progress}% progress</p></div>)}</div>}{message.sourceCount!==undefined&&<p className="text-[11px] text-neutral-400 mt-3">Grounded in {message.sourceCount} live Firestore problem record{message.sourceCount===1?'':'s'}.</p>}</div>)}</div>}
      <textarea className="input" rows={4} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void ask();}}} placeholder="Ask anything about UDBHAV problems, progress, districts, support or next steps..."/>
      <div className="flex items-center justify-between gap-3 mt-3"><p className="text-xs text-neutral-500">Type any question. Press Ctrl+Enter to send.</p><FlowButton text={busy?'Analyzing UDBHAV data...':'Ask AI'} onClick={()=>void ask()} disabled={busy||!q.trim()} className="shrink-0"/></div>
      {error&&<p className="text-sm text-error-600 mt-3">{error}</p>}
    </Card>
    <div><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Try a question</p><div className="flex flex-wrap gap-2">{prompts.map(prompt=><button key={prompt} onClick={()=>setQ(prompt)} className="btn-secondary !py-2 !text-xs">{prompt}</button>)}</div></div>
  </div>;
}
export function SettingsPage(){
  const{profile}=useAuth();const[exported,setExported]=useState('');
  const[lite,setLite]=useState(()=>localStorage.getItem('jansetu-lite-mode')==='true');
  const[locationConsent,setLocationConsent]=useState(()=>localStorage.getItem('jansetu-location-consent')!=='false');
  const[mediaConsent,setMediaConsent]=useState(()=>localStorage.getItem('jansetu-media-consent')!=='false');
  const[analyticsConsent,setAnalyticsConsent]=useState(()=>localStorage.getItem('jansetu-analytics-consent')!=='false');
  function persist(key:string,value:boolean){localStorage.setItem(key,String(value));}
  function toggleLite(value:boolean){setLite(value);persist('jansetu-lite-mode',value);document.documentElement.classList.toggle('lite-mode',value)}
  async function exportData(){const x=await api.accountExport();setExported(JSON.stringify(x,null,2));}
  return <div className="civic-page max-w-4xl"><SectionHeader title="Privacy & Platform Settings" subtitle="Consent choices remain local to this browser; account export is generated by the trusted API."/><Card className="p-5"><div className="flex items-center gap-3"><Settings className="text-primary-600"/><div><b>{profile?.full_name}</b><p className="text-xs text-neutral-500">{profile?.role}</p></div></div><div className="grid sm:grid-cols-2 gap-3 mt-5"><label className="flex justify-between rounded-lg border p-3 text-sm">Location consent<input type="checkbox" checked={locationConsent} onChange={e=>{setLocationConsent(e.target.checked);persist('jansetu-location-consent',e.target.checked)}}/></label><label className="flex justify-between rounded-lg border p-3 text-sm">Media consent<input type="checkbox" checked={mediaConsent} onChange={e=>{setMediaConsent(e.target.checked);persist('jansetu-media-consent',e.target.checked)}}/></label><label className="flex justify-between rounded-lg border p-3 text-sm">Anonymous analytics<input type="checkbox" checked={analyticsConsent} onChange={e=>{setAnalyticsConsent(e.target.checked);persist('jansetu-analytics-consent',e.target.checked)}}/></label><label className="flex justify-between rounded-lg border p-3 text-sm">Low-data / Lite mode<input type="checkbox" checked={lite} onChange={e=>toggleLite(e.target.checked)}/></label></div><p className="text-xs text-neutral-500 mt-3">Lite mode suppresses animations and hides nonessential decorative media. Core challenge, validation and project workflows remain available.</p><button onClick={exportData} className="btn-secondary mt-4">Export my data</button>{exported&&<pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-100">{exported}</pre>}</Card></div>
}

function Directory({title,subtitle,icon,rows}:{title:string;subtitle:string;icon:any;rows:any[]}){
  const[q,setQ]=useState('');
  const filtered=useMemo(()=>rows.filter(r=>(`${r.name||''} ${r.secondary||''} ${(r.chips||[]).join(' ')}`).toLowerCase().includes(q.toLowerCase())),[rows,q]);
  return <div className="civic-page"><SectionHeader title={title} subtitle={subtitle}/><div className="relative mb-4 max-w-lg"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input className="input pl-10" value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter directory…"/></div>{filtered.length===0?<EmptyState icon={<Search size={38}/>} title="No matching profiles" description="Try a different expertise, institution or capability."/>:<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map(r=><Card key={r.id} className="p-4"><div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">{icon}</div><h3 className="font-semibold mt-3">{r.name}</h3><p className="text-sm text-neutral-500">{r.secondary}</p><div className="flex flex-wrap gap-1 mt-3">{(r.chips||[]).slice(0,8).map((x:string)=><span className="badge bg-neutral-100 text-neutral-600" key={x}>{x}</span>)}</div></Card>)}</div>}</div>
}
