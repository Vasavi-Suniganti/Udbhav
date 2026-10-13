import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { isGovernmentRoutedToIndustry } from '@/lib/problems';
import type { Challenge, Profile } from '@/types';

export const INDUSTRY_ROLES = ['INDUSTRY_PARTNER', 'PARTNER', 'STARTUP', 'MSME', 'CSR_PARTNER', 'RESEARCH_LAB'];

export function isIndustryRole(role?: string | null): boolean {
  return INDUSTRY_ROLES.includes(String(role || ''));
}

/**
 * Every identifier this Industry account can own work under.
 * An organization may be recorded as `organization_id`/`organizationId`; the
 * user id is kept as a fallback so a solo Industry account is never orphaned.
 */
export function industryOrganizationIds(profile: Pick<Profile, 'id' | 'organization_id'> | null | undefined): string[] {
  if (!profile) return [];
  return [...new Set([profile.organization_id, profile.id].filter(Boolean).map(String))];
}

export function industryOrganizationName(profile: Record<string, unknown> | null | undefined): string {
  const extras = (profile || {}) as Record<string, unknown>;
  return String(extras.organization_name || extras.organizationName || extras.full_name || '');
}

export function dedupeIndustryCollaborations(records: Record<string, any>[]): Record<string, any>[] {
  const unique = new Map<string, Record<string, any>>();
  for (const record of records) {
    const requestType = String(record.requestType || 'SUPPORT').toUpperCase();
    const hasIdentity = Boolean(record.universityId && record.projectId && record.requestedBy);
    const signature = hasIdentity ? [
      requestType,
      record.universityId,
      record.projectId,
      record.requestedBy,
      String(record.topic || '').trim().toLowerCase(),
      [...(record.requestedExpertise || [])].map(String).sort().join(','),
      [...(record.supportTypes || [])].map(String).sort().join(','),
      String(record.requirement || '').trim().toLowerCase(),
      String(record.blocker || '').trim().toLowerCase(),
    ].join('|') : String(record.id || JSON.stringify(record));
    const existing = unique.get(signature);
    const existingDate = new Date(String(existing?.updatedAt || existing?.createdAt || '')).getTime() || 0;
    const recordDate = new Date(String(record.updatedAt || record.createdAt || '')).getTime() || 0;
    if (!existing || recordDate >= existingDate) unique.set(signature, record);
  }
  return [...unique.values()];
}

export function universityCollaborationMatches(
  record: Record<string, any>,
  universityIds: string[],
  userId?: string,
): boolean {
  const scopedIds = new Set(universityIds.filter(Boolean).map(String));
  const recordUniversityIds = [record.universityId, record.university_id, record.organizationId, record.organization_id]
    .filter(Boolean).map(String);
  if (recordUniversityIds.some(id => scopedIds.has(id))) return true;
  const requesterIds = [record.requestedBy, record.requestedById, record.ownerId, record.createdBy].filter(Boolean).map(String);
  return Boolean(userId && requesterIds.includes(String(userId)));
}

export function subscribeToIndustryCollaborations(
  onChange: (records: Record<string, any>[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(collection(db, 'industryCollaborations'), snapshot => {
    onChange(snapshot.docs.map(item => {
      const record = item.data();
      return {
        ...record,
        id: item.id,
        createdAt: stamp(record.createdAt) || record.createdAt,
        updatedAt: stamp(record.updatedAt) || record.updatedAt,
      };
    }));
  }, onError);
}

/** A challenge counts as an Industry project only once THIS organization accepted it. */
export function isAcceptedByIndustry(challenge: Challenge, organizationIds: string[]): boolean {
  return Boolean(challenge.industryPartnerId) && organizationIds.includes(String(challenge.industryPartnerId));
}

/**
 * The canonical Industry project list: every Government-routed challenge this
 * organization has accepted. Shared by Overview, Projects, Solutions, Mentorship,
 * Prototype Reviews and Industry Support so the tabs cannot drift apart.
 */
export function industryAcceptedProjects(challenges: Challenge[], organizationIds: string[]): Challenge[] {
  if (!organizationIds.length) return [];
  return challenges.filter(challenge => isGovernmentRoutedToIndustry(challenge) && isAcceptedByIndustry(challenge, organizationIds));
}

/** Government-routed Industry challenges that no organization has accepted yet. */
export function industryOpenOpportunities(challenges: Challenge[], organizationIds: string[]): Challenge[] {
  if (!organizationIds.length) return [];
  return challenges.filter(challenge => isGovernmentRoutedToIndustry(challenge) && !challenge.industryPartnerId);
}

// ---------------------------------------------------------------------------
// Persistent Industry records
//
// These reuse the existing top-level collections. Firestore security rules
// already cover them through the authenticated catch-all
// (`allow read: if signedIn(); create: if signedIn(); update/delete: isAdmin() || ownedByUser()`),
// so every write here stamps `ownerId` and reads are scoped to the caller's
// organization ids. No security rule is weakened or added.
// ---------------------------------------------------------------------------

function requireDb() {
  if (!db) throw new Error('Firebase is not configured. Add VITE_FIREBASE_* variables.');
  return db;
}

function requireUser() {
  if (!auth?.currentUser) throw new Error('You must be signed in to continue.');
  return auth.currentUser.uid;
}

export const MENTORSHIP_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED'] as const;
export type MentorshipStatus = (typeof MENTORSHIP_STATUSES)[number];

export interface IndustryMentorship {
  id: string;
  challengeId: string;
  challengeTitle: string;
  organizationId: string;
  organizationName: string;
  requestedExpertise: string[];
  message: string;
  status: MentorshipStatus;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IndustryMentorMeeting {
  id: string;
  mentorshipId: string;
  challengeId: string;
  organizationId: string;
  agenda: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl?: string;
  ownerId: string;
  createdAt?: string;
}

export interface IndustryPrototypeReview {
  id: string;
  challengeId: string;
  challengeTitle: string;
  organizationId: string;
  organizationName: string;
  prototypeId?: string;
  prototypeVersion?: string;
  decision: string;
  architecture: number;
  technology: number;
  scalability: number;
  industryReadiness: number;
  feedback: string;
  ownerId: string;
  createdAt?: string;
}

export interface IndustrySupportOffer {
  id: string;
  organizationId: string;
  organizationName: string;
  supportTypes: string[];
  description: string;
  capacity: string;
  status: string;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

const stamp = (value: unknown): string | undefined => {
  const raw = (value as { toDate?: () => Date })?.toDate ? (value as { toDate: () => Date }).toDate() : value;
  if (!raw) return undefined;
  const parsed = new Date(raw as string);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

function listOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(entry => typeof entry === 'string') : [];
}

function withoutUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter(entry => entry !== undefined).map(entry => withoutUndefined(entry)) as T;
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, withoutUndefined(entry)]),
    ) as T;
  }
  return value;
}

/** Subscribes to a collection for every organization id this account can own. */
function subscribeScoped<T>(
  collectionName: string,
  organizationIds: string[],
  map: (id: string, data: Record<string, unknown>) => T,
  onChange: (items: T[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const ids = [...new Set(organizationIds.filter(Boolean).map(String))];
  if (!db || !ids.length) {
    onChange([]);
    return () => undefined;
  }
  const byOrg: Record<string, T[]> = {};
  const emit = () => onChange([...new Map(Object.values(byOrg).flat().map(item => [(item as { id: string }).id, item])).values()]);
  const unsubscribers = ids.map(id => onSnapshot(
    query(collection(requireDb(), collectionName), where('organizationId', '==', id)),
    snapshot => {
      byOrg[id] = snapshot.docs.map(item => map(item.id, item.data()));
      emit();
    },
    error => onError(error),
  ));
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

export function subscribeToIndustryMentorships(organizationIds: string[], onChange: (items: IndustryMentorship[]) => void, onError: (error: Error) => void): Unsubscribe {
  return subscribeScoped<IndustryMentorship>('mentorships', organizationIds, (id, data) => ({
    id,
    challengeId: String(data.challengeId || ''),
    challengeTitle: String(data.challengeTitle || ''),
    organizationId: String(data.organizationId || ''),
    organizationName: String(data.organizationName || ''),
    requestedExpertise: listOf(data.requestedExpertise),
    message: String(data.message || ''),
    status: (MENTORSHIP_STATUSES as readonly string[]).includes(String(data.status)) ? String(data.status) as MentorshipStatus : 'PENDING',
    ownerId: String(data.ownerId || ''),
    createdAt: stamp(data.createdAt),
    updatedAt: stamp(data.updatedAt),
  }), onChange, onError);
}

export function subscribeToIndustryMentorMeetings(organizationIds: string[], onChange: (items: IndustryMentorMeeting[]) => void, onError: (error: Error) => void): Unsubscribe {
  return subscribeScoped<IndustryMentorMeeting>('mentorMeetings', organizationIds, (id, data) => ({
    id,
    mentorshipId: String(data.mentorshipId || ''),
    challengeId: String(data.challengeId || ''),
    organizationId: String(data.organizationId || ''),
    agenda: String(data.agenda || ''),
    scheduledAt: String(data.scheduledAt || ''),
    durationMinutes: Number(data.durationMinutes || 45),
    meetingUrl: data.meetingUrl ? String(data.meetingUrl) : undefined,
    ownerId: String(data.ownerId || ''),
    createdAt: stamp(data.createdAt),
  }), onChange, onError);
}

export function subscribeToIndustryPrototypeReviews(organizationIds: string[], onChange: (items: IndustryPrototypeReview[]) => void, onError: (error: Error) => void): Unsubscribe {
  return subscribeScoped<IndustryPrototypeReview>('prototypeReviews', organizationIds, (id, data) => ({
    id,
    challengeId: String(data.challengeId || ''),
    challengeTitle: String(data.challengeTitle || ''),
    organizationId: String(data.organizationId || ''),
    organizationName: String(data.organizationName || ''),
    prototypeId: data.prototypeId ? String(data.prototypeId) : undefined,
    prototypeVersion: data.prototypeVersion ? String(data.prototypeVersion) : undefined,
    decision: String(data.decision || 'REQUIRES_CHANGES'),
    architecture: Number(data.architecture || 0),
    technology: Number(data.technology || 0),
    scalability: Number(data.scalability || 0),
    industryReadiness: Number(data.industryReadiness || 0),
    feedback: String(data.feedback || ''),
    ownerId: String(data.ownerId || ''),
    createdAt: stamp(data.createdAt),
  }), onChange, onError);
}

export function subscribeToIndustrySupportOffers(organizationIds: string[], onChange: (items: IndustrySupportOffer[]) => void, onError: (error: Error) => void): Unsubscribe {
  return subscribeScoped<IndustrySupportOffer>('supportOffers', organizationIds, (id, data) => ({
    id,
    organizationId: String(data.organizationId || ''),
    organizationName: String(data.organizationName || ''),
    supportTypes: listOf(data.supportTypes),
    description: String(data.description || ''),
    capacity: String(data.capacity || ''),
    status: String(data.status || 'AVAILABLE'),
    ownerId: String(data.ownerId || ''),
    createdAt: stamp(data.createdAt),
    updatedAt: stamp(data.updatedAt),
  }), onChange, onError);
}

export async function updateMentorshipStatus(mentorship: IndustryMentorship, status: MentorshipStatus): Promise<void> {
  requireUser();
  await updateDoc(doc(requireDb(), 'mentorships', mentorship.id), { status, updatedAt: serverTimestamp() });
}

export async function createMentorMeeting(input: Omit<IndustryMentorMeeting, 'id' | 'ownerId' | 'createdAt'>): Promise<void> {
  const ownerId = requireUser();
  const payload = withoutUndefined({ ...input, ownerId, createdAt: serverTimestamp() });
  await addDoc(collection(requireDb(), 'mentorMeetings'), payload as Record<string, unknown>);
}

export async function createIndustryPrototypeReview(input: Omit<IndustryPrototypeReview, 'id' | 'ownerId' | 'createdAt'>): Promise<void> {
  const ownerId = requireUser();
  const payload = withoutUndefined({ ...input, ownerId, createdAt: serverTimestamp() });
  await addDoc(collection(requireDb(), 'prototypeReviews'), payload as Record<string, unknown>);
}

export async function createIndustrySupportOffer(input: Omit<IndustrySupportOffer, 'id' | 'ownerId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const ownerId = requireUser();
  const payload = withoutUndefined({ ...input, ownerId, status: 'AVAILABLE', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await addDoc(collection(requireDb(), 'supportOffers'), payload as Record<string, unknown>);
}



export function industryLocation(challenge: Challenge): string {
  return [challenge.district, challenge.block, challenge.village].filter(Boolean).join(' · ') || 'Not available';
}

export function industryProblemText(challenge: Challenge): string {
  return challenge.description?.trim() || 'Not available';
}
