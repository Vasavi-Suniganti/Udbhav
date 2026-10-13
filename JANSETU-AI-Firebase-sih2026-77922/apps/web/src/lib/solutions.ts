import { addDoc, collection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createNotification } from '@/lib/notificationService';

/**
 * Prototype-level Industry solution store.
 *
 * A solution is always linked to a Government-routed challenge that the Industry
 * organization accepted (challengeId), never to a detached record. Documents live in
 * the existing `solutions` collection, which is already covered by the deployed
 * Firestore rules (`allow read: if signedIn() || canReadPublic(); allow write: if signedIn();`).
 */

export const SOLUTION_STAGES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type SolutionStage = (typeof SOLUTION_STAGES)[number];

export type SolutionStageSection = 'prototype' | 'testing' | 'implementation' | 'deployment';

const SECTION_STAGE_LABELS: Record<SolutionStageSection, Record<SolutionStage, string>> = {
  prototype: { NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Development', COMPLETED: 'Ready for Testing' },
  testing: { NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' },
  implementation: { NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed' },
  deployment: { NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Rollout', COMPLETED: 'Deployed' },
};

export function stageLabel(section: SolutionStageSection, stage: SolutionStage): string {
  return SECTION_STAGE_LABELS[section][stage];
}

export interface IndustrySolution {
  id: string;
  /** Government-routed challenge accepted by the Industry organization. */
  challengeId: string;
  /** Same value as challengeId for Industry projects; kept for existing project links. */
  projectId: string;
  organizationId: string;
  organizationName: string;
  challengeTitle: string;
  /** Original problem text copied once from the accepted challenge for traceability. */
  problem: string;
  title: string;
  solution: string;
  approach: string;
  expectedImpact: string;
  domains: string[];
  districts: string[];
  /** Only present when the Industry organization recorded a funding figure. */
  estimatedFunding?: number;
  /** Only present when the Industry organization recorded a progress value. */
  progress?: number;
  prototypeStatus: SolutionStage;
  testingStatus: SolutionStage;
  implementationStatus: SolutionStage;
  deploymentStatus: SolutionStage;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CanonicalSolutionSubmission = {
  id: string;
  submissionId: string;
  solutionId: string;
  projectId: string;
  problemId: string;
  challengeId: string;
  submittedBy: string;
  submitterId: string;
  submitterRole: string;
  organizationId: string;
  organizationName: string;
  universityId?: string;
  industryId?: string;
  teamId?: string;
  title?: string;
  solutionTitle?: string;
  challengeTitle?: string;
  summary?: string;
  approach?: string;
  impact?: string;
  technicalNotes?: string;
  evidenceLinks?: string;
  status: string;
  governmentReview?: { status: string; feedback?: string; reviewerId?: string | null; submittedAt?: string | unknown; reviewedAt?: string | unknown };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

export function mergeUniversitySolutionProjects(
  overviewProjects: Record<string, any>[] = [],
  availableProjects: Record<string, any>[] = [],
  teams: Record<string, any>[] = [],
  universityId = '',
) {
  const projectId = (project: Record<string, any>) => String(project.id || project.projectId || project.project_id || '').trim();
  const overviewIds = new Set(overviewProjects.map(projectId).filter(Boolean));
  const teamIds = new Set(teams.flatMap(team => [team.id, team.teamId, team.team_id]).filter(Boolean).map(String));
  const teamProjectIds = new Set(teams.flatMap(team => [team.projectId, team.project_id]).filter(Boolean).map(String));
  const merged = new Map<string, Record<string, any>>();

  for (const project of [...overviewProjects, ...availableProjects]) {
    const id = projectId(project);
    if (!id) continue;
    const ownerId = String(project.universityId || project.university_id || project.organizationId || project.organization_id || '').trim();
    const linkedTeamId = String(project.teamId || project.team_id || '').trim();
    const belongsToUniversity = overviewIds.has(id)
      || Boolean(universityId && ownerId === universityId)
      || Boolean(linkedTeamId && teamIds.has(linkedTeamId))
      || teamProjectIds.has(id);
    if (!belongsToUniversity) continue;

    const existing = merged.get(id);
    merged.set(id, existing ? { ...project, ...existing } : project);
  }

  return [...merged.values()];
}

export function universityRoutedSolutionProblems(challenges: Record<string, any>[] = []) {
  const seen = new Set<string>();
  return challenges.filter(problem => {
    const id = String(problem.id || problem.problemId || problem.problem_id || '').trim();
    const isUniversityRouted = ['UNIVERSITY', 'UNIVERSITY_AND_INDUSTRY'].includes(String(problem.collaborationType || problem.aiRecommendedCollaboration || ''));
    if (!id || seen.has(id) || problem.source !== 'firestore' || problem.isPublished !== true || !isUniversityRouted) return false;
    seen.add(id);
    return true;
  });
}

export function buildUniversitySolutionTargets(projects: Record<string, any>[] = [], problems: Record<string, any>[] = []) {
  const keysFor = (record: Record<string, any>) => [
    record.id,
    record.projectId,
    record.project_id,
    record.problemId,
    record.problem_id,
    record.challengeId,
    record.challenge_id,
  ].filter(Boolean).map(String);
  const targets: Record<string, any>[] = projects.map(project => {
    const id = String(project.id || project.projectId || project.project_id || '').trim();
    const problemId = String(project.problemId || project.problem_id || project.challengeId || project.challenge_id || '').trim();
    return {
      ...project,
      id,
      linkedProjectId: id,
      problemId,
      challengeId: String(project.challengeId || project.challenge_id || problemId).trim(),
      challengeTitle: project.challengeTitle || project.problemTitle || project.title || 'Untitled problem',
      isProblemOnly: false,
    };
  }).filter(project => project.id);
  const targetByKey = new Map<string, typeof targets[number]>();

  for (const target of targets) {
    for (const key of keysFor(target)) targetByKey.set(key, target);
  }

  const seenProblemIds = new Set<string>();
  for (const problem of problems) {
    const problemId = String(problem.id || problem.problemId || problem.problem_id || problem.challengeId || problem.challenge_id || '').trim();
    if (!problemId || seenProblemIds.has(problemId)) continue;
    seenProblemIds.add(problemId);

    const linkedTarget = keysFor(problem).map(key => targetByKey.get(key)).find(Boolean);
    const challengeTitle = problem.title || problem.challengeTitle || problem.problemTitle || 'Untitled problem';
    if (linkedTarget) {
      linkedTarget.problemId = problemId;
      linkedTarget.challengeId = String(problem.challengeId || problem.challenge_id || problemId);
      linkedTarget.challengeTitle = challengeTitle;
      linkedTarget.teamId = linkedTarget.teamId || problem.studentTeamId || problem.student_team_id || '';
      linkedTarget.teamName = linkedTarget.teamName || problem.studentTeamName || problem.student_team_name || '';
      continue;
    }

    const id = `problem:${problemId}`;
    const target = {
      ...problem,
      id,
      linkedProjectId: '',
      problemId,
      challengeId: String(problem.challengeId || problem.challenge_id || problemId),
      challengeTitle,
      teamId: problem.studentTeamId || problem.student_team_id || '',
      teamName: problem.studentTeamName || problem.student_team_name || '',
      isProblemOnly: true,
    };
    targets.push(target);
    for (const key of keysFor(problem)) targetByKey.set(key, target);
    targetByKey.set(id, target);
  }

  return targets;
}

export type IndustrySolutionInput = Omit<IndustrySolution, 'id' | 'createdAt' | 'updatedAt'>;

export type IndustrySolutionStatus = 'NOT_STARTED' | 'IN_DEVELOPMENT' | 'READY' | 'DEPLOYED';

export const SOLUTION_STATUS_LABELS: Record<IndustrySolutionStatus, string> = {
  NOT_STARTED: 'Solution Not Started',
  IN_DEVELOPMENT: 'Solution In Development',
  READY: 'Solution Ready',
  DEPLOYED: 'Solution Deployed',
};

export const SOLUTION_STATUS_STYLES: Record<IndustrySolutionStatus, string> = {
  NOT_STARTED: 'bg-neutral-100 text-neutral-600',
  IN_DEVELOPMENT: 'bg-amber-50 text-amber-700',
  READY: 'bg-primary-50 text-primary-700',
  DEPLOYED: 'bg-success-50 text-success-700',
};

const solutionsCollection = () => {
  if (!db) throw new Error('Firebase is not configured. Add VITE_FIREBASE_* variables.');
  return collection(db, 'solutions');
};

function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.filter(entry => entry !== undefined).map(withoutUndefined);
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, withoutUndefined(entry)]),
    );
  }
  return value;
}

function stamp(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return undefined;
}

function asStage(value: unknown): SolutionStage {
  const normalized = String(value || '').toUpperCase();
  return (SOLUTION_STAGES as readonly string[]).includes(normalized) ? (normalized as SolutionStage) : 'NOT_STARTED';
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}


function asTextList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(entry => String(entry)).filter(Boolean);
  return [];
}

export function solutionFromDoc(id: string, raw: Record<string, unknown>): IndustrySolution {
  return {
    id,
    challengeId: String(raw.challengeId || raw.challenge_id || raw.projectId || ''),
    projectId: String(raw.projectId || raw.project_id || raw.challengeId || ''),
    organizationId: String(raw.organizationId || raw.organization_id || ''),
    organizationName: asText(raw.organizationName || raw.organization_name),
    challengeTitle: asText(raw.challengeTitle || raw.challenge_title),
    problem: asText(raw.problem),
    title: asText(raw.title),
    solution: asText(raw.solution),
    approach: asText(raw.approach || raw.technology),
    expectedImpact: asText(raw.expectedImpact || raw.expected_impact),
    domains: asTextList(raw.domains),
    districts: asTextList(raw.districts),
    estimatedFunding: asOptionalNumber(raw.estimatedFunding ?? raw.estimated_funding),
    progress: asOptionalNumber(raw.progress),
    prototypeStatus: asStage(raw.prototypeStatus || raw.prototype_status),
    testingStatus: asStage(raw.testingStatus || raw.testing_status),
    implementationStatus: asStage(raw.implementationStatus || raw.implementation_status),
    deploymentStatus: asStage(raw.deploymentStatus || raw.deployment_status),
    createdBy: asText(raw.createdBy || raw.created_by),
    createdAt: stamp(raw.createdAt || raw.created_at),
    updatedAt: stamp(raw.updatedAt || raw.updated_at),
  };
}

/** One solution per accepted challenge per organization. */
async function findExistingSolution(challengeId: string, organizationId: string) {
  const snapshot = await getDocs(query(solutionsCollection(), where('challengeId', '==', challengeId)));
  const match = snapshot.docs.find(item => String(item.data().organizationId || item.data().organization_id || '') === organizationId);
  return match ? match.id : null;
}

export function normalizeSolutionSubmissionRecord(raw: Record<string, any> = {}): CanonicalSolutionSubmission {
  const submissionId = String(raw.submissionId || raw.id || raw.solutionId || `submission-${Date.now()}`);
  const solutionId = String(raw.solutionId || raw.submissionId || raw.id || submissionId);
  const projectId = String(raw.projectId || raw.project_id || raw.project || '');
  const problemId = String(raw.problemId || raw.problem_id || raw.challengeId || raw.challenge_id || '');
  const challengeId = String(raw.challengeId || raw.challenge_id || raw.problemId || raw.problem_id || projectId || '');
  const submitterId = String(raw.submittedBy || raw.submitterId || raw.ownerId || raw.userId || auth?.currentUser?.uid || '');
  const submitterRole = String(raw.submitterRole || raw.submitter_role || raw.role || (raw.universityId ? 'UNIVERSITY' : raw.industryId ? 'INDUSTRY' : 'UNIVERSITY')).toUpperCase();
  const organizationId = String(raw.organizationId || raw.organization_id || raw.universityId || raw.industryId || '');
  const organizationName = String(raw.organizationName || raw.organization_name || raw.universityName || raw.industryName || '');
  const status = String(raw.status || raw.governmentReview?.status || 'DRAFT').toUpperCase();
  return {
    id: submissionId,
    submissionId,
    solutionId,
    projectId,
    problemId,
    challengeId,
    submittedBy: submitterId,
    submitterId,
    submitterRole,
    organizationId,
    organizationName,
    universityId: raw.universityId || (submitterRole === 'UNIVERSITY' ? organizationId : ''),
    industryId: raw.industryId || (submitterRole === 'INDUSTRY' ? organizationId : ''),
    teamId: raw.teamId || raw.team_id || '',
    title: raw.title || raw.solutionTitle || 'Solution submission',
    solutionTitle: raw.solutionTitle || raw.title || 'Solution submission',
    challengeTitle: raw.challengeTitle || raw.projectTitle || raw.challenge_name || '',
    summary: raw.summary || raw.description || '',
    approach: raw.approach || raw.technicalApproach || raw.technical_notes || '',
    impact: raw.impact || raw.expectedImpact || '',
    technicalNotes: raw.technicalNotes || raw.notes || '',
    evidenceLinks: raw.evidenceLinks || raw.evidence || '',
    status,
    governmentReview: raw.governmentReview || { status: 'PENDING', feedback: raw.feedback || '', reviewerId: null, submittedAt: raw.submittedAt || raw.createdAt || new Date().toISOString(), reviewedAt: null },
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
    ...raw,
  };
}

export function buildIndustrySolutionSubmissionRecord(
  input: IndustrySolutionInput,
  submissionId: string,
  submittedBy: string,
  submittedAt = new Date().toISOString(),
): CanonicalSolutionSubmission {
  return normalizeSolutionSubmissionRecord({
    id: submissionId,
    submissionId,
    solutionId: submissionId,
    projectId: input.projectId || input.challengeId,
    problemId: input.challengeId,
    challengeId: input.challengeId,
    submittedBy,
    submitterId: submittedBy,
    submitterRole: 'INDUSTRY',
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    industryId: input.organizationId,
    industryName: input.organizationName,
    challengeTitle: input.challengeTitle,
    problem: input.problem,
    solution: input.solution.trim(),
    solutionTitle: input.title.trim(),
    title: input.title.trim(),
    summary: input.solution.trim(),
    approach: input.approach.trim(),
    impact: input.expectedImpact.trim(),
    status: 'SUBMITTED',
    governmentReview: { status: 'PENDING', feedback: '', reviewerId: null, submittedAt, reviewedAt: null },
    reviewHistory: [{ status: 'SUBMITTED', feedback: '', reviewerId: null, reviewedAt: submittedAt }],
    submittedAt,
    createdAt: submittedAt,
    updatedAt: submittedAt,
  });
}

export function buildDeploymentReadyProject(submission: Record<string, any>, projectId: string) {
  const organizationId = String(submission.organizationId || submission.industryId || submission.universityId || '');
  return {
    id: projectId,
    projectId,
    projectCode: `PRJ-${projectId.slice(-8).toUpperCase()}`,
    projectName: submission.solutionTitle || submission.title || 'Approved solution project',
    title: submission.solutionTitle || submission.title || 'Approved solution project',
    description: submission.solution || submission.summary || '',
    challengeId: String(submission.challengeId || submission.problemId || ''),
    challengeTitle: String(submission.challengeTitle || 'Approved challenge'),
    problemId: String(submission.problemId || submission.challengeId || ''),
    solutionSubmissionId: String(submission.submissionId || submission.id || ''),
    solutionTitle: String(submission.solutionTitle || submission.title || ''),
    solution: String(submission.solution || submission.summary || ''),
    approach: String(submission.approach || ''),
    expectedImpact: String(submission.impact || submission.expectedImpact || ''),
    organizationId,
    organization_name: String(submission.organizationName || submission.industryName || submission.universityName || ''),
    organization_name_lowercase: String(submission.organizationName || submission.industryName || submission.universityName || ''),
    universityId: String(submission.universityId || ''),
    universityName: String(submission.universityName || ''),
    industryId: String(submission.industryId || ''),
    industryPartnerId: String(submission.industryId || ''),
    industryPartnerName: String(submission.industryName || submission.organizationName || ''),
    teamId: String(submission.teamId || ''),
    teamName: String(submission.teamName || ''),
    ownerId: String(submission.submittedBy || submission.submitterId || ''),
    createdBy: String(submission.submittedBy || submission.submitterId || ''),
    status: 'DEPLOYMENT_READY',
    currentPhase: 'DEPLOYMENT_READY',
    progress: Number(submission.progress || 0),
    beneficiaries: Number(submission.beneficiaries || 0),
    milestones: [],
    tasks: [],
  };
}

export function isDeploymentOperationalStatus(status: unknown) {
  return ['DEPLOYED', 'OPERATIONAL'].includes(String(status || '').toUpperCase());
}

export function deploymentNotificationRecipientIds(reporterId: unknown, submission: Record<string, any> = {}, project: Record<string, any> = {}) {
  return [...new Set([
    reporterId,
    submission.submittedBy,
    submission.submitterId,
    project.createdBy,
    project.ownerId,
    ...(project.team_members || []).map((member: Record<string, any>) => member.userId || member.uid),
  ].filter(Boolean).map(String))];
}

export function isGovernmentReviewSubmission(record: Record<string, any>) {
  return Boolean(record.submissionId || record.id) && String(record.status || '').toUpperCase() !== 'DRAFT';
}

export function solutionSubmissionBelongsToUniversity(record: Record<string, any>, universityIds: string[], userId?: string) {
  const ids = new Set(universityIds.filter(Boolean).map(String));
  const owners = [record.universityId, record.university_id, record.organizationId, record.organization_id]
    .filter(Boolean).map(String);
  return owners.some(ownerId => ids.has(ownerId)) || Boolean(userId && String(record.submittedBy || record.submitterId || '') === String(userId));
}

export function subscribeToUniversitySolutionSubmissions(
  universityIds: string[],
  onChange: (submissions: CanonicalSolutionSubmission[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const ids = [...new Set(universityIds.filter(Boolean).map(String))];
  if (!db || !ids.length) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(collection(db, 'solutionSubmissions'), snapshot => {
    const submissions = snapshot.docs
      .map(item => normalizeSolutionSubmissionRecord({ ...item.data(), id: item.id, submissionId: item.id }))
      .filter(record => solutionSubmissionBelongsToUniversity(record, ids, auth?.currentUser?.uid))
      .sort((left, right) => new Date(String(right.updatedAt || right.createdAt || '')).getTime() - new Date(String(left.updatedAt || left.createdAt || '')).getTime());
    onChange(submissions);
  }, onError);
}

export function subscribeToGovernmentSolutionSubmissions(
  onChange: (submissions: CanonicalSolutionSubmission[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(collection(db, 'solutionSubmissions'), snapshot => {
    const submissions = snapshot.docs
      .map(item => normalizeSolutionSubmissionRecord({ ...item.data(), id: item.id, submissionId: item.id }))
      .filter(isGovernmentReviewSubmission)
      .sort((left, right) => new Date(String(right.updatedAt || right.createdAt || '')).getTime() - new Date(String(left.updatedAt || left.createdAt || '')).getTime());
    onChange(submissions);
  }, onError);
}

export async function saveIndustrySolution(input: IndustrySolutionInput): Promise<IndustrySolution> {
  if (!db || !auth?.currentUser) throw new Error('You must be signed in to save a solution.');
  if (!input.challengeId) throw new Error('The solution must stay linked to the accepted challenge.');
  if (!input.organizationId) throw new Error('Your Industry organization is not configured.');
  if (!input.title.trim()) throw new Error('Add a solution title before saving.');
  if (!input.solution.trim()) throw new Error('Describe the proposed solution before saving.');

  const existingSubmissionSnapshot = await getDocs(query(
    collection(db, 'solutionSubmissions'),
    where('problemId', '==', input.challengeId),
  ));
  const existingSubmission = existingSubmissionSnapshot.docs.find(item => {
    const record = item.data();
    return String(record.industryId || record.organizationId || record.organization_id || '') === input.organizationId
      && String(record.submitterRole || record.submitter_role || '').toUpperCase() === 'INDUSTRY';
  });
  const requestIdentity = `${input.challengeId}|${input.organizationId}`;
  let identityHash = 2166136261;
  for (let index = 0; index < requestIdentity.length; index += 1) {
    identityHash = Math.imul(identityHash ^ requestIdentity.charCodeAt(index), 16777619);
  }
  const docId = existingSubmission?.id || `industry-submission-${(identityHash >>> 0).toString(36)}`;
  const submittedAt = new Date().toISOString();
  const canonical = buildIndustrySolutionSubmissionRecord(input, docId, auth.currentUser.uid, submittedAt);
  const existingCreatedAt = existingSubmission?.data().createdAt;
  await setDoc(doc(db, 'solutionSubmissions', docId), {
    ...canonical,
    id: docId,
    submissionId: docId,
    createdAt: existingCreatedAt || serverTimestamp(),
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    governmentReview: { ...canonical.governmentReview, submittedAt: serverTimestamp(), reviewedAt: null },
  }, { merge: true });

  const reviewerRoles = ['PANCHAYAT_OFFICER', 'ULB_OFFICER', 'DISTRICT_OFFICER', 'GOVERNMENT_OFFICER', 'DEPARTMENT_ADMIN', 'PROJECT_OFFICER'];
  try {
    const reviewers = await getDocs(query(collection(db, 'users'), where('role', 'in', reviewerRoles)));
    await Promise.allSettled(reviewers.docs.map(reviewer => createNotification({
      recipientId: reviewer.id,
      recipientRole: String(reviewer.data().role || ''),
      type: 'SOLUTION_SUBMITTED',
      title: 'Industry solution submitted for review',
      message: `${input.organizationName} submitted ${input.title.trim()} for ${input.challengeTitle} for Government review.`,
      relatedProblemId: input.challengeId,
      relatedProjectId: input.projectId || input.challengeId,
      relatedPartnerId: input.organizationId,
      priority: 'HIGH',
      actionUrl: '/dashboard/solution-review',
    })));
  } catch {
    // A notification failure must not roll back a persisted review submission.
  }

  // Keep a legacy mirror for older industry pages that still read the `solutions` collection.
  const payload = withoutUndefined({
    challengeId: input.challengeId,
    projectId: input.projectId || input.challengeId,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    challengeTitle: input.challengeTitle,
    problem: input.problem,
    title: input.title.trim(),
    solution: input.solution.trim(),
    approach: input.approach.trim(),
    expectedImpact: input.expectedImpact.trim(),
    domains: input.domains,
    districts: input.districts,
    estimatedFunding: input.estimatedFunding,
    progress: input.progress,
    prototypeStatus: input.prototypeStatus,
    testingStatus: input.testingStatus,
    implementationStatus: input.implementationStatus,
    deploymentStatus: input.deploymentStatus,
    createdBy: auth.currentUser.uid,
  }) as Record<string, unknown>;

  const existingId = await findExistingSolution(input.challengeId, input.organizationId);
  if (existingId) {
    await updateDoc(doc(db, 'solutions', existingId), { ...payload, updatedAt: serverTimestamp() });
    return { ...input, id: existingId };
  }
  const created = await addDoc(solutionsCollection(), { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return { ...input, id: created.id };
}

export function subscribeToIndustrySolutions(
  organizationIds: string[],
  onChange: (items: IndustrySolution[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const ids = [...new Set(organizationIds.filter(Boolean).map(String))];
  if (!db || !ids.length) {
    onChange([]);
    return () => undefined;
  }
  const bySource: Record<string, IndustrySolution[]> = {};
  const emit = () => onChange([...new Map(Object.values(bySource).flat().map(item => [item.id, item])).values()]);
  const unsubscribers = ids.map(id => onSnapshot(
    query(solutionsCollection(), where('organizationId', '==', id)),
    snapshot => {
      bySource[id] = snapshot.docs.map(item => solutionFromDoc(item.id, item.data()));
      emit();
    },
    error => onError(error),
  ));
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

export type IndustrySolutionReview = {
  challengeId: string;
  status: string;
  feedback: string;
  updatedAt?: string;
};

export function subscribeToIndustrySolutionReviews(
  organizationIds: string[],
  onChange: (reviews: Record<string, IndustrySolutionReview>) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const ids = [...new Set(organizationIds.filter(Boolean).map(String))];
  if (!db || !ids.length) {
    onChange({});
    return () => undefined;
  }
  const recordsByOrganization: Record<string, IndustrySolutionReview[]> = {};
  const emit = () => {
    const reviews = Object.values(recordsByOrganization).flat();
    onChange(Object.fromEntries(reviews.map(review => [review.challengeId, review])));
  };
  const unsubscribers = ids.map(organizationId => onSnapshot(
    query(collection(db, 'solutionSubmissions'), where('industryId', '==', organizationId)),
    snapshot => {
      recordsByOrganization[organizationId] = snapshot.docs.map(item => {
        const record = item.data();
        return {
          challengeId: String(record.challengeId || record.problemId || ''),
          status: String(record.status || record.governmentReview?.status || 'DRAFT').toUpperCase(),
          feedback: String(record.governmentReview?.feedback || ''),
          updatedAt: stamp(record.updatedAt),
        };
      }).filter(review => review.challengeId);
      emit();
    },
    onError,
  ));
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

export function solutionStatusOf(solution?: IndustrySolution): IndustrySolutionStatus {
  if (!solution) return 'NOT_STARTED';
  if (solution.deploymentStatus === 'COMPLETED') return 'DEPLOYED';
  if (solution.prototypeStatus === 'COMPLETED' && solution.testingStatus === 'NOT_STARTED') return 'READY';
  return 'IN_DEVELOPMENT';
}

export function solutionReviewStatusLabel(status?: string): string | undefined {
  const normalized = String(status || '').toUpperCase();
  const labels: Record<string, string> = {
    SUBMITTED: 'Pending Government Review',
    PENDING: 'Pending Government Review',
    UNDER_REVIEW: 'Under Government Review',
    CHANGES_REQUESTED: 'Changes Requested',
    APPROVED: 'Government Approved',
    REJECTED: 'Not Approved',
  };
  return labels[normalized];
}

/**
 * Uses a recorded progress value when one exists (solution first, then the linked
 * challenge/project record). Returns null when nothing reliable is stored.
 */
export function resolveSolutionProgress(solution?: IndustrySolution, challengeProgress?: number): number | null {
  if (typeof solution?.progress === 'number') return Math.max(0, Math.min(100, Math.round(solution.progress)));
  if (typeof challengeProgress === 'number' && Number.isFinite(challengeProgress)) {
    return Math.max(0, Math.min(100, Math.round(challengeProgress)));
  }
  return null;
}
