import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { challengeFromApi } from '@/lib/adapters';
import { mainRoleFor, type Challenge } from '@/types';

export const GOVERNMENT_ROLE_VALUES = ['PANCHAYAT_OFFICER', 'ULB_OFFICER', 'DISTRICT_OFFICER', 'GOVERNMENT_OFFICER', 'DEPARTMENT_ADMIN', 'PROJECT_OFFICER', 'FINANCE_OFFICER', 'ANALYTICS_OFFICER'];
export const COLLABORATION_TYPES = ['UNIVERSITY', 'INDUSTRY', 'UNIVERSITY_AND_INDUSTRY', 'GOVERNMENT_COMMUNITY'] as const;
export type CollaborationType = typeof COLLABORATION_TYPES[number];

export function canVerifyProblem(role?: string) {
  if (!role) return false;
  const normalized = String(role).trim();
  if (normalized === 'GOVERNMENT') return true;
  return GOVERNMENT_ROLE_VALUES.includes(normalized) || mainRoleFor(normalized as any) === 'GOVERNMENT';
}

/**
 * Single source of truth for "the Government routed this verified challenge to Industry".
 * Shared by the Industry Challenges page, the Industry Projects page and the Industry
 * Solutions page so the accepted-project list cannot drift between tabs.
 */
export function isGovernmentRoutedToIndustry(problem: Challenge) {
  const isVerified = String(problem.governmentVerificationStatus || '').toUpperCase() === 'VERIFIED' ||
    String(problem.currentStage || '').toUpperCase() === 'GOVERNMENT_VERIFIED' ||
    ['VALIDATED', 'OPEN_FOR_INSTITUTIONS', 'ASSIGNED', 'INDUSTRY_ASSIGNED'].includes(String(problem.status || '').toUpperCase());

  if (!problem.source || problem.source !== 'firestore' || !isVerified) return false;

  const collaboration = String(problem.collaborationType || problem.aiRecommendedCollaboration || '').toUpperCase();
  const stage = String(problem.currentStage || '').toUpperCase();
  const status = String(problem.status || '').toUpperCase();
  const isPublished = Boolean(problem.isPublished);
  const industryAssignment = Boolean(problem.industryPartnerId || problem.industryPartnerName) &&
    (stage.includes('INDUSTRY') || status.includes('INDUSTRY'));

  const industryRoute = isPublished && ['INDUSTRY', 'UNIVERSITY_AND_INDUSTRY'].includes(collaboration) &&
    (Boolean(problem.collaborationConfirmedBy) || stage === 'GOVERNMENT_VERIFIED');

  return industryRoute || industryAssignment;
}

export type ProblemStage =
  | 'REPORTED'
  | 'AI_ANALYSIS'
  | 'GOVERNMENT_VERIFIED'
  | 'UNIVERSITY_ASSIGNED'
  | 'FACULTY_MENTOR_ASSIGNED'
  | 'INDUSTRY_MENTOR_ASSIGNED'
  | 'SOLUTION_DEVELOPMENT'
  | 'PROTOTYPE'
  | 'FIELD_TESTING'
  | 'DEPLOYMENT'
  | 'DEPLOYED'
  | 'CITIZEN_VERIFICATION'
  | 'RESOLVED';

export interface ProblemRecord {
  id: string;
  createdBy: string;
  title: string;
  description: string;
  originalText?: string;
  originalLanguage?: string;
  translatedText?: string;
  translationLanguage?: string;
  category?: string;
  subcategory?: string;
  priority?: string;
  aiSummary?: string;
  aiKeyIssues?: string[];
  affectedGroup?: string;
  suggestedExpertise?: string[];
  suggestedUniversityDomain?: string;
  suggestedIndustryExpertise?: string[];
  recommendedAction?: string;
  duplicateStatus?: string;
  similarProblemIds?: string[];
  location?: { latitude?: number; longitude?: number; address?: string; district?: string; state?: string };
  impact?: { affectedPeople?: number; urgency?: string; affectedGroup?: string; healthImpact?: boolean; safetyImpact?: boolean; frequency?: string };
  evidence?: any[];
  voiceRecordingUrl?: string;
  governmentVerificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CLARIFICATION_REQUIRED';
  governmentDepartment?: string | null;
  governmentRemarks?: string | null;
  governmentVerifiedBy?: string | null;
  universityId?: string | null;
  universityName?: string | null;
  studentTeamId?: string | null;
  studentTeamName?: string | null;
  facultyMentorId?: string | null;
  facultyMentorName?: string | null;
  industryPartnerId?: string | null;
  industryPartnerName?: string | null;
  industryMentorId?: string | null;
  industryMentorName?: string | null;
  currentStage: ProblemStage;
  progress: number;
  communitySupportCount: number;
  communityCommentCount: number;
  citizenVerificationStatus: 'PENDING' | 'VERIFIED';
  isPublished: boolean;
  publishedAt?: unknown;
  publishedBy?: string | null;
  challengeStatus: 'DRAFT' | 'OPEN' | 'OPEN_FOR_COLLABORATION' | 'UNIVERSITY_ASSIGNED' | 'INDUSTRY_ASSIGNED' | 'SOLUTION_DEVELOPMENT' | 'FIELD_TESTING' | 'DEPLOYMENT' | 'DEPLOYED' | 'CITIZEN_VERIFICATION' | 'RESOLVED';
  aiRecommendedCollaboration?: CollaborationType | null;
  aiSuggestedUniversityDomain?: string[];
  aiSuggestedIndustryDomain?: string[];
  aiRequiredExpertise?: string[];
  aiRecommendedAction?: string | null;
  aiReasoning?: string | null;
  collaborationType?: CollaborationType | null;
  collaborationConfirmedBy?: string | null;
  collaborationConfirmedAt?: unknown;
  resolvedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
}

const problemsCollection = () => {
  if (!db) throw new Error('Firebase is not configured. Add VITE_FIREBASE_* variables.');
  return collection(db, 'problems');
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

export function problemToChallenge(id: string, raw: DocumentData): Challenge {
  const location = raw.location || raw.coordinates || {};
  const impact = raw.impact || {};
  const createdBy = raw.createdBy || raw.created_by || raw.userId || raw.uid || raw.citizenId || raw.submittedBy || '';
  const category = raw.category || raw.domain || raw.issueCategory || raw.suggestedUniversityDomain || 'Other';
  const priority = String(raw.priority || raw.aiPriority || raw.priorityLevel || 'MEDIUM').toUpperCase();
  const score = raw.priority_score ?? raw.priorityScore ?? ({ CRITICAL: 92, HIGH: 78, MEDIUM: 55, LOW: 30 }[priority] || 45);
  return challengeFromApi({
    id,
    source: 'firestore',
    challenge_code: raw.challengeCode || `PR-${id.slice(0, 8).toUpperCase()}`,
    title: raw.title || raw.problemTitle || raw.name || 'Untitled Community Problem',
    description: raw.description || raw.originalText || '',
    domain: category,
    subdomain: raw.subcategory,
    issue_type: raw.issueType || 'INNOVATION_OPPORTUNITY',
    status: String(raw.currentStage || '').toUpperCase() === 'DEPLOYED' ? 'DEPLOYED' : String(raw.currentStage || '').toUpperCase() === 'RESOLVED' ? 'ASSIGNED' : (raw.governmentVerificationStatus || raw.governmentStatus) === 'VERIFIED' ? 'OPEN_FOR_INSTITUTIONS' : raw.status || 'PENDING_VALIDATION',
    priority_score: score,
    priority_level: priority || undefined,
    submitted_by: createdBy,
    submitted_by_name: raw.createdByName || 'Citizen',
    district: location.district || raw.district || raw.locationDistrict || location.address || raw.address || 'Location unavailable',
    block: location.block || raw.block,
    village: location.village || raw.village,
    ward: location.ward || raw.ward,
    latitude: location.latitude ?? location.lat ?? raw.latitude,
    longitude: location.longitude ?? location.lng ?? location.lon ?? raw.longitude,
    address: location.address,
    affected_population: impact.affectedPeople ?? raw.affectedPeople ?? 0,
    frequency: impact.frequency || raw.frequency,
    has_safety_concern: Boolean(impact.safetyImpact ?? raw.safetyConcern),
    ai_title: raw.title,
    ai_description: raw.aiSummary || raw.description,
    ai_domain: raw.suggestedUniversityDomain || raw.category,
    ai_required_expertise: raw.suggestedExpertise || raw.suggestedIndustryExpertise || [],
    tags: raw.tags || [],
    evidence: raw.evidence || [],
    evidence_urls: (raw.evidence || []).map((item: any) => typeof item === 'string' ? item : item.url).filter(Boolean),
    imageUrl: raw.imageUrl || raw.image_url,
    assigned_organization_id: raw.universityId,
    created_at: raw.createdAt,
    updated_at: raw.updatedAt,
    currentStage: raw.currentStage,
    progress: raw.progress,
    governmentVerificationStatus: raw.governmentVerificationStatus || raw.governmentStatus,
    governmentDepartment: raw.governmentDepartment,
    universityName: raw.universityName,
    studentTeamName: raw.studentTeamName,
    facultyMentorName: raw.facultyMentorName,
    industryPartnerId: raw.industryPartnerId,
    industryPartnerName: raw.industryPartnerName,
    industryMentorName: raw.industryMentorName,
    communitySupportCount: raw.communitySupportCount,
    communityCommentCount: raw.communityCommentCount,
    impact: raw.impact,
    clarificationRequest: raw.clarificationRequest,
    verifiedAt: raw.verifiedAt || raw.governmentVerifiedAt,
    verifiedBy: raw.verifiedBy || raw.governmentVerifiedBy,
    isPublished: Boolean(raw.isPublished),
    publishedAt: raw.publishedAt,
    publishedBy: raw.publishedBy,
    challengeStatus: raw.challengeStatus || (raw.isPublished ? 'OPEN' : 'DRAFT'),
    aiRecommendedCollaboration: raw.aiRecommendedCollaboration,
    aiSuggestedUniversityDomain: raw.aiSuggestedUniversityDomain || [],
    aiSuggestedIndustryDomain: raw.aiSuggestedIndustryDomain || [],
    aiRequiredExpertise: raw.aiRequiredExpertise || raw.suggestedExpertise || [],
    aiRecommendedAction: raw.aiRecommendedAction,
    aiReasoning: raw.aiReasoning,
    collaborationType: raw.collaborationType,
    collaborationConfirmedBy: raw.collaborationConfirmedBy,
    collaborationConfirmedAt: raw.collaborationConfirmedAt,
  });
}

export async function createProblem(data: Omit<ProblemRecord, 'id'>): Promise<ProblemRecord> {
  if (!auth?.currentUser) throw new Error('You must be signed in to submit a problem.');
  const payload = withoutUndefined({
    ...data,
    createdBy: auth.currentUser.uid,
    public: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }) as Record<string, unknown>;
  const created = await addDoc(problemsCollection(), payload);
  return { id: created.id, ...data, createdBy: auth.currentUser.uid } as ProblemRecord;
}

export async function updateProblem(id: string, changes: Record<string, unknown>) {
  if (!db || !auth?.currentUser) throw new Error('You must be signed in to update a problem.');
  await updateDoc(doc(db, 'problems', id), withoutUndefined({ ...changes, updatedAt: serverTimestamp() }) as Record<string, unknown>);
}

function industryAcceptanceAlreadyHeld(problem: DocumentData | undefined, organizationId: string) {
  if (!problem) throw new Error('This challenge is no longer available.');
  const routedToIndustry = problem.isPublished === true &&
    problem.governmentVerificationStatus === 'VERIFIED' &&
    Boolean(problem.collaborationConfirmedBy) &&
    ['INDUSTRY', 'UNIVERSITY_AND_INDUSTRY'].includes(String(problem.collaborationType || '').toUpperCase());
  if (!routedToIndustry) throw new Error('This challenge is not currently routed to Industry by the Government.');
  const assignedOrganizationId = String(problem.industryPartnerId || '');
  if (assignedOrganizationId && assignedOrganizationId !== organizationId) {
    throw new Error('This challenge has already been accepted by another organization.');
  }
  return assignedOrganizationId === organizationId;
}

function isPermissionDeniedError(error: unknown) {
  const code = String((error as { code?: string })?.code || '').toUpperCase();
  return code.includes('PERMISSION') || /insufficient permissions/i.test((error as Error)?.message || '');
}

export async function acceptIndustryChallenge(id: string, organizationId: string, organizationName: string) {
  if (!db || !auth?.currentUser) throw new Error('You must be signed in to accept a challenge.');
  if (!organizationId) throw new Error('Your Industry organization is not configured.');

  const reference=doc(db,'problems',id);
  const acceptanceFields=(withChallengeStatus:boolean)=>({
    industryPartnerId:organizationId,
    industryPartnerName:organizationName,
    industrySupportType:'Industry challenge accepted',
    currentStage:'INDUSTRY_ASSIGNED',
    ...(withChallengeStatus?{challengeStatus:'INDUSTRY_ASSIGNED'}:{}),
    updatedAt:serverTimestamp(),
  });
  const commit=async(withChallengeStatus:boolean)=>runTransaction(db,async transaction=>{
    const snapshot=await transaction.get(reference);
    if(industryAcceptanceAlreadyHeld(snapshot.exists()?snapshot.data():undefined,organizationId))return;
    transaction.update(reference,acceptanceFields(withChallengeStatus));
  });

  try{
    await commit(true);
  }catch(error){
    if(!isPermissionDeniedError(error))throw error;
    console.warn('Industry challenge acceptance retried without challengeStatus because Firestore denied the write.',error);
    await commit(false);
  }
}

export function subscribeToProblems(onChange: (items: Challenge[]) => void, onError: (error: Error) => void, options?: { createdBy?: string; publicOnly?: boolean }): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const source = options?.publicOnly
    ? query(problemsCollection(), where('public', '==', true))
    : options?.createdBy
      ? query(problemsCollection(), where('createdBy', '==', options.createdBy))
      : problemsCollection();
  return onSnapshot(source, snapshot => {
    onChange(snapshot.docs.map(item => problemToChallenge(item.id, item.data())));
  }, error => onError(error));
}

export function subscribeToCitizenProblems(userId: string, onChange: (items: Challenge[]) => void, onError: (error: Error) => void): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const records = new Map<string, Challenge>();
  let publicReady = false;
  let ownReady = false;
  const emit = () => {
    if (!publicReady || !ownReady) return;
    onChange([...records.values()]);
  };
  const publicUnsubscribe = subscribeToProblems(items => {
    items.forEach(item => records.set(item.id, item));
    publicReady = true;
    emit();
  }, error => {
    publicReady = true;
    onError(error);
    emit();
  }, { publicOnly: true });
  const ownUnsubscribe = subscribeToProblems(items => {
    items.forEach(item => records.set(item.id, item));
    ownReady = true;
    emit();
  }, error => {
    ownReady = true;
    onError(error);
    emit();
  }, { createdBy: userId });
  return () => {
    publicUnsubscribe();
    ownUnsubscribe();
  };
}

export function buildGovernmentVerificationUpdate(verifiedByUserId: string, extraChanges: Record<string, unknown> = {}) {
  const verificationTimestamp = serverTimestamp();
  return withoutUndefined({
    ...extraChanges,
    status: 'VALIDATED',
    currentStage: 'GOVERNMENT_VERIFIED',
    governmentVerificationStatus: 'VERIFIED',
    governmentVerifiedAt: verificationTimestamp,
    governmentVerifiedBy: verifiedByUserId,
    verifiedAt: verificationTimestamp,
    verifiedBy: verifiedByUserId,
    governmentStatus: 'VERIFIED',
    progress: 0,
  }) as Record<string, unknown>;
}

export async function markOwnedProblemPublic(id: string) {
  await updateProblem(id, { public: true });
}

function includesAny(text: string, values: string[]) {
  return values.some(value => text.includes(value));
}

export function recommendCollaboration(input: { category?: string; subcategory?: string; title?: string; description?: string; affectedGroup?: string; suggestedExpertise?: string[]; suggestedIndustryExpertise?: string[] }): {
  aiRecommendedCollaboration: CollaborationType;
  aiSuggestedUniversityDomain: string[];
  aiSuggestedIndustryDomain: string[];
  aiRequiredExpertise: string[];
  aiRecommendedAction: string;
  aiReasoning: string;
} {
  const text = [input.category, input.subcategory, input.title, input.description, input.affectedGroup, ...(input.suggestedExpertise || []), ...(input.suggestedIndustryExpertise || [])].filter(Boolean).join(' ').toLowerCase();
  const lighting = includesAny(text, ['street light', 'solar', 'microgrid', 'electricity', 'energy', 'iot']);
  const digital = includesAny(text, ['digital literacy', 'training', 'education', 'school', 'student']);
  const civic = includesAny(text, ['complaint', 'certificate', 'pension', 'simple local', 'civic service']);
  if (civic && !lighting && !digital) return {
    aiRecommendedCollaboration: 'GOVERNMENT_COMMUNITY',
    aiSuggestedUniversityDomain: [], aiSuggestedIndustryDomain: [], aiRequiredExpertise: ['Community operations'],
    aiRecommendedAction: 'Coordinate a local government and community response.',
    aiReasoning: 'The problem is best addressed through a direct civic service response rather than technical collaboration.',
  };
  if (digital) return {
    aiRecommendedCollaboration: 'UNIVERSITY',
    aiSuggestedUniversityDomain: ['Computer Science', 'Education', 'Social Work'], aiSuggestedIndustryDomain: [], aiRequiredExpertise: ['Digital inclusion', 'Training design', 'Community facilitation'],
    aiRecommendedAction: 'Design and deliver a community-led digital literacy programme.',
    aiReasoning: 'The problem needs research, curriculum design, and community facilitation that universities are well placed to provide.',
  };
  if (lighting) return {
    aiRecommendedCollaboration: 'UNIVERSITY_AND_INDUSTRY',
    aiSuggestedUniversityDomain: ['Electrical Engineering', 'Renewable Energy', 'IoT'], aiSuggestedIndustryDomain: ['Solar Energy', 'IoT Monitoring', 'Smart Infrastructure'], aiRequiredExpertise: ['Electrical Engineering', 'Renewable Energy', 'IoT'],
    aiRecommendedAction: 'Prototype an energy-efficient solution and prepare it for field deployment.',
    aiReasoning: 'The problem requires university-led technical research and prototyping together with industry deployment expertise.',
  };
  return {
    aiRecommendedCollaboration: 'UNIVERSITY_AND_INDUSTRY',
    aiSuggestedUniversityDomain: input.suggestedExpertise?.length ? input.suggestedExpertise : ['Applied Research', 'Systems Design'],
    aiSuggestedIndustryDomain: input.suggestedIndustryExpertise?.length ? input.suggestedIndustryExpertise : ['Implementation', 'Technical Support'],
    aiRequiredExpertise: [...new Set([...(input.suggestedExpertise || []), ...(input.suggestedIndustryExpertise || [])])].slice(0, 8),
    aiRecommendedAction: 'Develop, test, and deploy a solution with academic and industry partners.',
    aiReasoning: 'The available problem context indicates that research and implementation capabilities are both useful.',
  };
}

export function buildGovernmentPublishUpdate(userId: string, input: Parameters<typeof recommendCollaboration>[0], extraChanges: Record<string, unknown> = {}) {
  const recommendation = recommendCollaboration(input);
  return withoutUndefined({
    ...extraChanges,
    isPublished: true,
    publishedAt: serverTimestamp(),
    publishedBy: userId,
    challengeStatus: 'OPEN',
    currentStage: 'OPEN_FOR_COLLABORATION',
    ...recommendation,
  }) as Record<string, unknown>;
}

export function buildCollaborationConfirmationUpdate(userId: string, collaborationType: CollaborationType) {
  return { collaborationType, collaborationConfirmedBy: userId, collaborationConfirmedAt: serverTimestamp() };
}