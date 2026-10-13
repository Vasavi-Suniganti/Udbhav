import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Evidence } from '@jansetu/shared';
import {
  DEMO_CHALLENGES,
  DEMO_PROJECTS,
  DEMO_SOLUTIONS,
  DEMO_CLUSTERS,
  DEMO_IMPACT_METRICS,
  DEMO_UNIVERSITY_OVERVIEW,
  DEMO_COMMUNITY_FEEDBACK,
  DEMO_PROPOSAL,
  ORGANIZATIONS,
  JHARKHAND_DISTRICTS,
  DEMO_FACULTY,
  DEMO_STUDENTS,
  DEMO_NOTIFICATIONS,
} from '@/data/demo';
import { createProblem, problemToChallenge, updateProblem } from '@/lib/problems';
import { buildDemoUniversityOverview, demoUniversityIdForUser } from '@/lib/universityOverviewDemo';
import { calculatePriority, priorityFromScore } from '@/lib/constants';
import { mainRoleFor } from '@/types';
import { deleteNotification as deleteLiveNotification, markAllNotificationsRead as markAllLiveNotificationsRead, markNotificationRead as markLiveNotificationRead, createNotification } from '@/lib/notificationService';
import { buildDeploymentReadyProject, deploymentNotificationRecipientIds, isDeploymentOperationalStatus } from '@/lib/solutions';

export const apiBase = 'local://static-demo';
type AnyRecord = Record<string, any>;
const localCommunitySignals: Record<string, AnyRecord[]> = {};
const localCommunityComments: Record<string, AnyRecord[]> = {};

export function resolveProblemReporterId(problem: AnyRecord | null | undefined): string | undefined {
  if (!problem) return undefined;
  return problem.createdBy || problem.created_by || problem.submitted_by || problem.submittedBy || problem.userId || problem.reporterId || problem.citizenId || problem.ownerId;
}

export function summarizeCommunitySignals(signals: AnyRecord[] = [], currentUserId?: string) {
  const supportUserIds = new Set<string>();
  const affectedUserIds = new Set<string>();
  const incorrectReportUserIds = new Set<string>();

  for (const signal of signals) {
    const userId = String(signal.userId || signal.user_id || '').trim();
    if (!userId) continue;

    switch (signal.type) {
      case 'SUPPORT':
        supportUserIds.add(userId);
        break;
      case 'AFFECTED':
        affectedUserIds.add(userId);
        break;
      case 'INCORRECT_REPORT':
        incorrectReportUserIds.add(userId);
        break;
      default:
        break;
    }
  }

  return {
    supporters: supportUserIds.size,
    affectedConfirmations: affectedUserIds.size,
    incorrectReports: incorrectReportUserIds.size,
    mySignals: (signals || []).filter(signal => signal.userId === currentUserId),
  };
}

export function projectVisibilityMatches(project: AnyRecord, user: AnyRecord = {}) {
  const projectUniversityId = String(project.universityId || project.university_id || project.organizationId || project.organization_id || '').trim();
  const userUniversityId = String(user.organizationId || user.organization_id || '').trim();
  if (!projectUniversityId) return true;
  if (!userUniversityId) return true;
  return projectUniversityId === userUniversityId;
}

function stamp(value: any) { return value?.toDate ? value.toDate().toISOString() : value || new Date().toISOString(); }
function normalize(id: string, value: AnyRecord) { return { id, ...value, createdAt: stamp(value.createdAt || value.created_at), updatedAt: stamp(value.updatedAt || value.updated_at) }; }
async function read(name: string, constraints: any[] = []): Promise<AnyRecord[]> {
  if (!db) return [];
  try {
    const snapshot = await getDocs(query(collection(db, name), ...constraints));
    return snapshot.docs.map(item => normalize(item.id, item.data()));
  } catch {
    return [];
  }
}
async function readUniversityScoped(name: string, fields: string[], universityId: string): Promise<AnyRecord[]> {
  const rows = await Promise.all(fields.map(field => read(name, [where(field, '==', universityId)])));
  return [...new Map(rows.flat().map(item => [item.id, item])).values()];
}
const industryRoles = ['INDUSTRY_PARTNER', 'PARTNER', 'STARTUP', 'MSME', 'CSR_PARTNER', 'RESEARCH_LAB', 'MENTOR'];
const governmentRoles = ['PANCHAYAT_OFFICER', 'ULB_OFFICER', 'DISTRICT_OFFICER', 'GOVERNMENT_OFFICER', 'DEPARTMENT_ADMIN', 'PROJECT_OFFICER'];
async function notifyCollaborationRequest(record: AnyRecord) {
  const [industryUsers, governmentUsers] = await Promise.all([
    read('users', [where('role', 'in', industryRoles)]),
    read('users', [where('role', 'in', governmentRoles)]),
  ]);
  const targetedIndustryUsers = record.industryPartnerId
    ? industryUsers.filter(user => [user.id, user.organizationId, user.organization_id].some(id => id && String(id) === String(record.industryPartnerId)))
    : industryUsers;
  const recipients = [...new Map([...targetedIndustryUsers, ...governmentUsers]
    .filter(user => user.id)
    .map(user => [String(user.id), user])).values()];
  await Promise.all(recipients.map(user => createNotification({
    recipientId: String(user.id),
    recipientRole: String(user.role || ''),
    type: record.requestType === 'GUIDANCE' ? 'INDUSTRY_GUIDANCE_REQUEST' : 'INDUSTRY_COLLABORATION',
    title: record.requestType === 'GUIDANCE' ? 'New project guidance request' : 'New collaboration request received',
    message: `${record.universityName || 'A university'} requests ${record.requestedExpertise?.join(', ') || 'industry support'} for ${record.projectName || record.challengeTitle || 'a project'}.`,
    relatedProblemId: record.problemId || record.challengeId,
    relatedProjectId: record.projectId,
    relatedTeamId: record.teamId,
    relatedUniversityId: record.universityId,
    relatedPartnerId: record.industryPartnerId || undefined,
    priority: 'HIGH',
    actionUrl: '/dashboard/industry-collaboration',
  })));
  return { industry: targetedIndustryUsers.length, government: governmentUsers.length };
}
function collaborationDocumentId(requestKey: string) {
  let hash = 2166136261;
  for (let index = 0; index < requestKey.length; index += 1) {
    hash = Math.imul(hash ^ requestKey.charCodeAt(index), 16777619);
  }
  return `collaboration-${(hash >>> 0).toString(36)}`;
}
async function readOne(name: string, id: string): Promise<AnyRecord> {
  if (!db) return { id };
  try {
    const snapshot = await getDoc(doc(db, name, id));
    if (!snapshot.exists()) return { id };
    return normalize(snapshot.id, snapshot.data());
  } catch {
    return { id };
  }
}
async function create(name: string, value: AnyRecord) {
  if (db) {
    try {
      const record = { ...value, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      const result = await addDoc(collection(db, name), record);
      return normalize(result.id, { ...value, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    } catch (error) {
      if (db && auth?.currentUser) throw error;
    }
  }
  return normalize(`local-${Date.now()}`, { ...value, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}
async function update(name: string, id: string, value: AnyRecord) {
  if (db) {
    try {
      await updateDoc(doc(db, name, id), { ...value, updatedAt: serverTimestamp() });
      return readOne(name, id);
    } catch {}
  }
  return normalize(id, { ...value, updatedAt: new Date().toISOString() });
}
async function remove(name: string, id: string) {
  if (db) {
    try { await deleteDoc(doc(db, name, id)); } catch {}
  }
  return { id, deleted: true };
}

function challengeView(c: AnyRecord): AnyRecord {
  return {
    ...c,
    publicId: c.publicId || c.challenge_code || c.id,
    issueType: c.issueType || c.issue_type || 'INNOVATION_OPPORTUNITY',
    priority: c.priority || { total: c.priorityScore ?? c.priority_score ?? 0, factors: c.priorityBreakdown || c.priority_breakdown || {} },
    reporterId: c.reporterId || c.submitted_by || '',
    submittedByName: c.submittedByName || c.submitted_by_name || 'Citizen',
    affectedPeople: c.affectedPeople ?? c.affected_population ?? 0,
    seasonal: c.seasonal ?? c.is_seasonal,
    safetyConcern: c.safetyConcern ?? c.has_safety_concern,
    expertise: c.expertise || c.ai_required_expertise || [],
    createdAt: stamp(c.createdAt || c.created_at),
    updatedAt: stamp(c.updatedAt || c.updated_at)
  };
}

function projectView(p: AnyRecord) {
  return {
    ...p,
    projectCode: p.projectCode || p.project_code || `PRJ-${p.id.slice(0,8).toUpperCase()}`,
    challengeId: p.challengeId || p.challenge_id,
    irl: p.irl ?? p.irl_level ?? 1,
    universityId: p.universityId || p.organization_id,
    universityName: p.universityName || p.organization_name || 'Institution',
    team: p.team || p.team_members || [],
    milestones: (p.milestones || []).map((m: AnyRecord) => ({
      ...m,
      dueDate: m.dueDate || m.due_date,
      done: m.done ?? (m.status === 'COMPLETED')
    })),
    tasks: (p.tasks || []).map((t: AnyRecord) => ({
      ...t,
      dueDate: t.dueDate || t.due_date
    })),
    createdAt: stamp(p.createdAt || p.created_at),
    updatedAt: stamp(p.updatedAt || p.updated_at)
  };
}

export function buildGovernmentMentorshipRows(projects: AnyRecord[] = [], meetings: AnyRecord[] = []) {
  const rows = (projects || []).map((project: AnyRecord) => {
    const id = project.id || project.projectId || project.project_id || 'project';
    const projectId = String(project.projectId || project.project_id || id);
    const projectName = project.projectName || project.title || project.name || `Project ${projectId}`;
    const facultyMentorName = project.facultyMentorName || project.faculty_mentor_name || project.facultyMentor || 'Faculty mentor pending';
    const industryPartnerName = project.industryPartnerName || project.industry_partner_name || project.industryPartner || '';
    const industryMentorName = project.industryMentorName || project.industry_mentor_name || project.industryMentor || '';
    const currentStage = project.currentStage || project.current_phase || project.status || 'SOLUTION_DEVELOPMENT';
    const lastActivity = project.updatedAt || project.updated_at || project.createdAt || project.created_at || new Date().toISOString();
    const meetingCount = meetings.filter((meeting: AnyRecord) => {
      const matchId = String(meeting.projectId || meeting.project_id || meeting.projectID || '');
      return matchId === projectId || (meeting.challengeId && meeting.challengeId === (project.challengeId || project.challenge_id));
    }).length;
    const attentionRequired = !facultyMentorName || (!industryPartnerName && String(project.status || '').toUpperCase() !== 'DRAFT');
    return {
      id: `gov-mentor-${id}`,
      projectId,
      projectName,
      title: projectName,
      universityName: project.universityName || project.organization_name || project.university || 'University pending',
      facultyMentorName: facultyMentorName || 'Faculty mentor pending',
      industryPartnerName: industryPartnerName || 'Industry partner pending',
      industryMentorName: industryMentorName || 'Industry mentor pending',
      currentStage,
      status: project.status || 'SOLUTION_DEVELOPMENT',
      progress: Number(project.progress || 0),
      meetingCount,
      attentionRequired,
      lastActivity,
      updatedAt: lastActivity,
      partnerId: project.industryPartnerId || project.industry_partner_id || project.organizationId || project.partnerId || '',
      requestedExpertise: Array.isArray(project.requestedExpertise) ? project.requestedExpertise : [],
    };
  });

  return rows.sort((a, b) => new Date(String(b.lastActivity || 0)).getTime() - new Date(String(a.lastActivity || 0)).getTime());
}

export function normalizeAnnouncementRecord(input: AnyRecord, id = input.id || `ann-${Date.now()}`) {
  const title = String(input.title || '').trim();
  const body = String(input.body || input.details || '').trim();
  const category = String(input.category || 'GENERAL').toUpperCase();
  const publishedAt = input.publishedAt ? stamp(input.publishedAt) : new Date().toISOString();
  const expiresAt = input.expiresAt ? stamp(input.expiresAt) : undefined;
  return {
    id,
    title,
    body,
    category,
    publishedAt,
    ...(expiresAt ? { expiresAt } : {}),
    active: input.active !== false,
    createdAt: stamp(input.createdAt || publishedAt),
    updatedAt: stamp(input.updatedAt || publishedAt),
  };
}

export function buildAnnouncementAudienceUsers(users: AnyRecord[] = []) {
  const allowedRoles = new Set([
    'CITIZEN',
    'VOLUNTEER',
    'STUDENT',
    'FACULTY',
    'UNIVERSITY_ADMIN',
    'INDUSTRY_PARTNER',
    'STARTUP',
    'MSME',
    'CSR_PARTNER',
    'RESEARCH_LAB',
    'MENTOR',
    'PANCHAYAT_OFFICER',
    'ULB_OFFICER',
    'DISTRICT_OFFICER',
    'GOVERNMENT_OFFICER',
    'DEPARTMENT_ADMIN',
    'PROJECT_OFFICER',
    'FINANCE_OFFICER',
    'ANALYTICS_OFFICER',
    'PLATFORM_ADMIN',
    'SUPER_ADMIN',
  ]);

  return users.filter((user: AnyRecord) => {
    const role = String(user.role || '').toUpperCase();
    return allowedRoles.has(role) || role === 'GOVERNMENT';
  });
}

const api: Record<string, (...args: any[]) => Promise<any>> = {
  stats: async () => ({
    challenges: DEMO_CHALLENGES.length,
    projects: DEMO_PROJECTS.length,
    solutions: DEMO_SOLUTIONS.length,
    districts: JHARKHAND_DISTRICTS.length,
  }),
  challenges: async () => {
    const [firebaseChallenges, firebaseProblems] = await Promise.all([read('challenges'), read('problems')]);
    const firebaseRecords = [
      ...firebaseChallenges.map(challengeView),
      ...firebaseProblems.map(problem => challengeView(problemToChallenge(problem.id, problem))),
    ];
    const records = new Map(firebaseRecords.map(challenge => [challenge.id, challenge]));
    DEMO_CHALLENGES.forEach(challenge => {
      if (!records.has(challenge.id)) records.set(challenge.id, challengeView(challenge));
    });
    return [...records.values()];
  },
  challenge: async (id: string) => challengeView(DEMO_CHALLENGES.find(c => c.id === id || c.challenge_code === id) || DEMO_CHALLENGES[0]),
  createChallenge: async (body: AnyRecord) => {
    try {
      if (db && auth?.currentUser) {
        const structured = body.structured || {};
        const created = await createProblem({
          title: structured.title || body.title || 'Untitled Community Problem',
          description: structured.description || body.description || 'No description provided.',
          originalText: body.originalText,
          originalLanguage: body.originalLanguage,
          translatedText: body.translatedText,
          category: structured.domain || body.domain || 'Other',
          subcategory: structured.subdomain || body.subcategory,
          priority: body.priority || 'MEDIUM',
          aiSummary: structured.aiSummary,
          aiKeyIssues: body.aiKeyIssues,
          affectedGroup: body.affectedGroup,
          suggestedExpertise: structured.expertise || body.suggestedExpertise || [],
          suggestedUniversityDomain: structured.domain || body.suggestedUniversityDomain,
          suggestedIndustryExpertise: body.suggestedIndustryExpertise || [],
          location: body.location,
          impact: { affectedPeople: body.affectedPeople, urgency: body.urgency, frequency: body.frequency, affectedGroup: body.affectedGroup, safetyImpact: body.safetyConcern },
          evidence: body.evidence || [],
          voiceRecordingUrl: body.voiceRecordingUrl,
          governmentVerificationStatus: 'PENDING',
          currentStage: 'REPORTED',
          progress: 0,
          communitySupportCount: 0,
          communityCommentCount: 0,
          citizenVerificationStatus: 'PENDING',
          isPublished: false,
          publishedAt: null,
          publishedBy: null,
          challengeStatus: 'DRAFT',
          aiRecommendedCollaboration: null,
          aiSuggestedUniversityDomain: [],
          aiSuggestedIndustryDomain: [],
          aiRequiredExpertise: structured.expertise || body.suggestedExpertise || [],
          aiRecommendedAction: null,
          aiReasoning: null,
          collaborationType: null,
          collaborationConfirmedBy: null,
          collaborationConfirmedAt: null,
          district: body.district,
          block: body.block,
          village: body.village,
          ward: body.ward,
          address: body.address,
          latitude: body.latitude,
          longitude: body.longitude,
          tags: structured.tags || [],
          public: true,
        });
        return challengeView(problemToChallenge(created.id, created));
      }
    } catch (error) {
      if (db && auth?.currentUser) throw error;
    }
    const newId = `ch-${Date.now()}`;
    return challengeView({
      id: newId,
      challenge_code: `CH-JH-2026-${String(DEMO_CHALLENGES.length + 1).padStart(6, '0')}`,
      title: body.title || 'Community Challenge',
      description: body.description || '',
      domain: body.domain || 'Other',
      issue_type: body.issue_type || body.issueType || 'INNOVATION_OPPORTUNITY',
      status: 'PENDING_VALIDATION',
      priority_score: 75,
      priority_level: 'HIGH',
      submitted_by: auth?.currentUser?.uid || 'current-user',
      submitted_by_name: 'Citizen Submitter',
      district: body.district || 'Ranchi',
      block: body.block || '',
      village: body.village || '',
      affected_population: Number(body.affectedPeople || body.affected_population || 100),
      duration: body.duration || 'Ongoing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...body,
    });
  },
  updateChallenge: async (id: string, body: AnyRecord) => {
    try {
      if (db && auth?.currentUser) {
        await updateProblem(id, body);
        return challengeView({ id, ...body });
      }
    } catch {}
    return challengeView({ id, ...body });
  },
  challengePreview: async (body: AnyRecord) => ({
    title: body.title || String(body.description || '').split(/[.!?]/)[0].trim().slice(0, 120) || 'Untitled Community Problem',
    description: body.description || '',
    domain: body.domain || 'Other',
    issueType: 'INNOVATION_OPPORTUNITY',
    confidence: 0.92,
    priority: { total: 78 },
    duplicates: [],
  }),
  validate: async (id: string, body: AnyRecord) => {
    try {
      if (db && auth?.currentUser) {
        const verified = ['VALIDATED', 'OPEN_FOR_INSTITUTIONS'].includes(body.decision);
        const clarification = body.decision === 'NEEDS_INFORMATION';
        const changes: AnyRecord = {
          governmentVerificationStatus: verified ? 'VERIFIED' : clarification ? 'CLARIFICATION_REQUIRED' : body.decision === 'REJECTED' ? 'REJECTED' : 'PENDING',
          currentStage: verified ? 'GOVERNMENT_VERIFIED' : clarification ? 'REPORTED' : body.decision,
          verifiedAt: verified ? serverTimestamp() : undefined,
          verifiedBy: verified ? auth.currentUser.uid : undefined,
          governmentRemarks: body.note,
          clarificationRequest: clarification ? { message: body.note, requestedAt: serverTimestamp(), requestedBy: auth.currentUser.uid, status: 'OPEN' } : undefined,
        };
        await updateProblem(id, changes);
        return challengeView({ id, ...changes });
      }
    } catch {}
    const c = DEMO_CHALLENGES.find(x => x.id === id) || DEMO_CHALLENGES[0];
    return challengeView({ ...c, status: body.decision === 'REJECT' ? 'REJECTED' : body.decision });
  },
  challengeComment: async (id: string, body: AnyRecord) => {
    try {
      if (db) return await create(`challenges/${id}/comments`, { ...body, authorId: auth?.currentUser?.uid || '' });
    } catch {}
    return { id: `c-${Date.now()}`, authorId: auth?.currentUser?.uid || '', ...body, createdAt: new Date().toISOString() };
  },
  duplicates: async () => [],
  analyseEvidence: async () => ({ summary: 'Evidence analysis is ready.', confidence: 0.94 }),
  matches: async () => ORGANIZATIONS.filter(x => x.type === 'UNIVERSITY'),
  teamRecommendation: async () => ({ faculty: DEMO_FACULTY, students: DEMO_STUDENTS }),
  clusters: async () => DEMO_CLUSTERS,
  refreshClusters: async () => DEMO_CLUSTERS,
  universities: async () => ORGANIZATIONS.filter(x => x.type === 'UNIVERSITY'),
  university: async (id: string) => ORGANIZATIONS.find(x => x.id === id) || ORGANIZATIONS[0],
  faculty: async () => DEMO_FACULTY,
  universityFacultyPortal: async () => {
    if (!auth?.currentUser || !db) return { universityId: '', faculty: [], teams: [], projects: [] };
    const user = await readOne('users', auth.currentUser.uid);
    const universityId = user.organizationId || user.organization_id;
    if (!universityId) return { universityId: '', faculty: [], teams: [], projects: [] };
    const faculty = await read('facultyMentors', [where('universityId', '==', universityId)]);
    const legacyFaculty = faculty.length ? faculty : await read('faculty', [where('universityId', '==', universityId)]);
    const teams = await read('teams', [where('universityId', '==', universityId)]);
    const projects = await read('projects', [where('universityId', '==', universityId)]);
    return { universityId, faculty: legacyFaculty, teams, projects: projects.map(projectView) };
  },
  students: async () => DEMO_STUDENTS,
  industry: async () => ORGANIZATIONS.filter(x => ['INDUSTRY', 'STARTUP', 'MSME', 'CSR_PARTNER', 'RESEARCH_LAB'].includes(x.type)),
  industryCollaborations: async () => read('industryCollaborations'),
  industryCollaboration: async (id: string) => readOne('industryCollaborations', id),
  createIndustryCollaboration: async (payload: AnyRecord) => {
    const requestKey = [
      payload.requestType || 'SUPPORT', payload.universityId || '', payload.projectId || '', payload.requestedBy || '',
      [...(payload.requestedExpertise || [])].map(String).sort().join(','),
      [...(payload.supportTypes || [])].map(String).sort().join(','),
      String(payload.requirement || '').trim().toLowerCase(), String(payload.blocker || '').trim().toLowerCase(),
      payload.industryPartnerId || '',
    ].join('|');
    const existing = (await read('industryCollaborations')).find(item =>
      String(item.status || '').toUpperCase() === 'PENDING'
      && (item.requestKey === requestKey || (
        String(item.requestType || 'SUPPORT') === String(payload.requestType || 'SUPPORT')
        && String(item.universityId || '') === String(payload.universityId || '')
        && String(item.projectId || '') === String(payload.projectId || '')
        && String(item.requestedBy || '') === String(payload.requestedBy || '')
        && String(item.requirement || '').trim().toLowerCase() === String(payload.requirement || '').trim().toLowerCase()
        && String(item.blocker || '').trim().toLowerCase() === String(payload.blocker || '').trim().toLowerCase()
        && JSON.stringify([...(item.supportTypes || [])].map(String).sort()) === JSON.stringify([...(payload.supportTypes || [])].map(String).sort())
        && JSON.stringify([...(item.requestedExpertise || [])].map(String).sort()) === JSON.stringify([...(payload.requestedExpertise || [])].map(String).sort())
      )));
    if (existing) return existing;
    const normalizedPayload = {
      ...payload,
      requestKey,
      requestedExpertise: payload.requestedExpertise || payload.requested_expertise || [],
      supportTypes: payload.supportTypes || payload.support_types || [],
      status: payload.status || 'PENDING',
      mentorStatus: payload.mentorStatus || 'NOT_ASSIGNED',
      progress: Number(payload.progress || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const collaborationId = collaborationDocumentId(requestKey);
    let savedRecord: AnyRecord;
    let created = false;
    if (db && auth?.currentUser) {
      const reference = doc(db, 'industryCollaborations', collaborationId);
      await runTransaction(db, async transaction => {
        created = false;
        const snapshot = await transaction.get(reference);
        if (snapshot.exists()) {
          savedRecord = normalize(snapshot.id, snapshot.data() as AnyRecord);
          return;
        }
        transaction.set(reference, {
          ...normalizedPayload,
          id: collaborationId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        savedRecord = { id: collaborationId, ...normalizedPayload };
        created = true;
      });
    } else {
      savedRecord = await create('industryCollaborations', normalizedPayload);
      created = true;
    }
    if (!created) return savedRecord!;
    const notificationDelivery = await notifyCollaborationRequest(savedRecord!);
    return { ...savedRecord!, notificationDelivery };
  },
  updateIndustryCollaboration: async (id: string, patch: AnyRecord) => update('industryCollaborations', id, patch),
  industryGuidanceRequests: async (collaborationId: string) => {
    const [nested, collaboration] = await Promise.all([
      read(`industryCollaborations/${collaborationId}/guidanceRequests`),
      readOne('industryCollaborations', collaborationId),
    ]);
    if (collaboration.requestType !== 'GUIDANCE') return nested;
    return [collaboration, ...nested.filter(item => item.id !== collaboration.id)];
  },
  createIndustryGuidanceRequest: async (collaborationId: string, payload: AnyRecord) => {
    if (!auth?.currentUser || !db) throw new Error('Sign in with Firebase before requesting guidance.');
    const collaboration = await readOne('industryCollaborations', collaborationId);
    if (!collaboration.id || collaboration.id === 'undefined') throw new Error('The collaboration could not be found.');
    const saved = await create(`industryCollaborations/${collaborationId}/guidanceRequests`, {
      ...payload,
      requestedBy: auth.currentUser.uid,
      requestedByRole: (await readOne('users', auth.currentUser.uid)).role || 'UNIVERSITY_ADMIN',
    });
    await notifyCollaborationRequest({ ...collaboration, ...payload, requestType: 'GUIDANCE' });
    return saved;
  },
  acceptIndustryGuidance: async (collaborationId: string) => {
    if (!auth?.currentUser || !db) throw new Error('You must be signed in with Firebase to accept guidance requests.');
    const collaboration = await readOne('industryCollaborations', collaborationId);
    if (!collaboration.id || collaboration.id === 'undefined') throw new Error('This guidance request no longer exists.');
    if (collaboration.requestType !== 'GUIDANCE' || String(collaboration.status).toUpperCase() !== 'PENDING') throw new Error('This guidance request is no longer available.');
    const user = await readOne('users', auth.currentUser.uid);
    if (!industryRoles.includes(String(user.role || '').toUpperCase())) throw new Error('Only an industry partner can accept a guidance request.');
    const industryPartnerId = user.organizationId || user.organization_id || auth.currentUser.uid;
    const assignedPartnerId = String(collaboration.industryPartnerId || collaboration.industry_partner_id || '');
    if (assignedPartnerId && ![String(industryPartnerId), auth.currentUser.uid].includes(assignedPartnerId)) {
      throw new Error('This guidance request was assigned to another industry partner.');
    }
    const industryPartnerName = user.organization_name || user.organizationName || user.full_name || 'Industry partner';
    const acceptedAt = new Date().toISOString();
    const patch = {
      status: 'ACCEPTED',
      mentorStatus: 'ASSIGNED',
      industryPartnerId,
      industryPartnerName,
      acceptedBy: auth.currentUser.uid,
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, 'industryCollaborations', collaborationId), patch);
    const notificationTargets = new Map<string, { recipientId: string; recipientRole: string }>();
    const requesterId = String(collaboration.requestedBy || collaboration.requestedById || '');
    if (requesterId) notificationTargets.set(requesterId, { recipientId: requesterId, recipientRole: String(collaboration.requestedByRole || 'UNIVERSITY_ADMIN') });
    const governmentUsers = await read('users', [where('role', 'in', governmentRoles)]);
    for (const governmentUser of governmentUsers) {
      if (governmentUser.id) notificationTargets.set(String(governmentUser.id), { recipientId: String(governmentUser.id), recipientRole: String(governmentUser.role || '') });
    }
    const notificationResults = await Promise.allSettled([...notificationTargets.values()].map(target => createNotification({
      ...target,
      type: 'INDUSTRY_GUIDANCE_ACCEPTED',
      title: 'Industry accepted your guidance request',
      message: `${industryPartnerName} accepted the request to guide ${collaboration.teamName || 'your team'} on ${collaboration.projectName || collaboration.challengeTitle || 'the project'}.`,
      relatedProblemId: collaboration.problemId || collaboration.challengeId,
      relatedProjectId: collaboration.projectId,
      relatedTeamId: collaboration.teamId,
      relatedUniversityId: collaboration.universityId,
      relatedPartnerId: String(industryPartnerId),
      priority: 'HIGH',
      actionUrl: `/university/industry-collaboration/${collaborationId}`,
    })));
    const notificationDelivery = {
      sent: notificationResults.filter(result => result.status === 'fulfilled').length,
      failed: notificationResults.filter(result => result.status === 'rejected').length,
    };
    return { ...collaboration, ...patch, acceptedAt, notificationDelivery };
  },
  projects: async () => {
    const live = await read('projects');
    const user = auth?.currentUser ? await readOne('users', auth.currentUser.uid) : {};
    const universityId = import.meta.env.DEV ? demoUniversityIdForUser(user) : user.organizationId || user.organization_id;
    if (!live.length) {
      if (import.meta.env.DEV && user.role === 'UNIVERSITY_ADMIN' && universityId) {
        return buildDemoUniversityOverview(universityId, user.organization_name || user.organizationName).projects.map(projectView);
      }
      return DEMO_PROJECTS.map(projectView);
    }
    const userRole = String(user.role || '').toUpperCase();
    if (['PANCHAYAT_OFFICER', 'ULB_OFFICER', 'DISTRICT_OFFICER', 'GOVERNMENT_OFFICER', 'DEPARTMENT_ADMIN', 'PROJECT_OFFICER', 'FINANCE_OFFICER', 'ANALYTICS_OFFICER', 'PLATFORM_ADMIN', 'SUPER_ADMIN', 'GOVERNMENT'].includes(userRole)
      || mainRoleFor(userRole as any) === 'GOVERNMENT') {
      return live.map(projectView);
    }
    const universityProjects = live.filter((project: AnyRecord) => projectVisibilityMatches(project, user)).map(projectView);
    if (import.meta.env.DEV && user.role === 'UNIVERSITY_ADMIN' && !universityProjects.length) {
      const overview = await api.universityOverview();
      if (overview.projects?.length) return overview.projects;
    }
    return universityProjects.length ? universityProjects : live.map(projectView);
  },
  registeredTeams: async () => {
    const teams = await read('teams');
    if (!auth?.currentUser) return teams;
    const user = await readOne('users', auth.currentUser.uid);
    const universityId = user.organizationId || user.organization_id;
    return universityId ? teams.filter(team => team.universityId === universityId) : teams;
  },
  registerTeam: async (payload: AnyRecord) => {
    if (!db || !auth?.currentUser) throw new Error('You must be signed in to register a team.');

    const universityId = payload.universityId || payload.university_id || auth.currentUser.uid;
    const challengeId = payload.challengeId || payload.challenge_id;
    if (!challengeId) throw new Error('Challenge information is missing.');
    if (!universityId) throw new Error('University information is missing.');

    const existingTeams = await read('teams');
    const existingTeam = existingTeams.find(team => team.challengeId === challengeId && team.universityId === universityId);
    if (existingTeam) {
      const existingProject = (await read('projects')).find(project => project.challengeId === challengeId && project.universityId === universityId);
      return { team: existingTeam, project: existingProject, duplicate: true, teamId: existingTeam?.id, projectId: existingProject?.id };
    }

    const existingMentors = await read('facultyMentors', [where('universityId', '==', universityId), where('facultyId', '==', payload.facultyMentorId)]);
    if (!existingMentors.length) {
      await create('facultyMentors', {
        universityId,
        name: payload.facultyMentorDetails?.name || payload.facultyMentorName || 'Faculty mentor',
        facultyId: payload.facultyMentorId,
        department: payload.facultyMentorDetails?.department || payload.department || 'University',
        email: payload.facultyMentorDetails?.email || payload.facultyMentorEmail || '',
        status: 'ACTIVE',
      });
    }

    const teamId = `team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const defaultInitialPlan = payload.initialSolutionPlan || {
      problemUnderstanding: 'The team has reviewed the challenge and will define the solution approach during project development.',
      solutionConcept: 'Solution concept to be refined in the project workspace and proposal stage.',
      targetOutcome: 'Deliver a validated solution aligned with the challenge objective and community impact.',
      requiredTechnologies: 'To be finalized by the project team and faculty mentor.',
      expectedImpact: 'To be measured through prototype output, field testing, and deployment readiness.',
    };
    const teamPayload = {
      ...payload,
      id: teamId,
      teamId,
      challengeId,
      universityId,
      universityName: payload.universityName || 'University',
      department: payload.department || 'University',
      teamName: payload.teamName?.trim(),
      students: payload.students || [],
      studentIds: payload.studentIds || (payload.students || []).map((student: AnyRecord) => student.studentId || ''),
      facultyMentorId: payload.facultyMentorId,
      facultyMentorName: payload.facultyMentorDetails?.name || payload.facultyMentorName || 'Faculty mentor',
      teamStatus: 'SOLUTION_DEVELOPMENT',
      status: 'SOLUTION_DEVELOPMENT',
      initialSolutionPlan: defaultInitialPlan,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const teamRef = doc(collection(db, 'teams'));
    await setDoc(teamRef, {
      ...teamPayload,
      id: teamRef.id,
      teamId: teamRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const projectId = `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const projectName = payload.projectName || payload.initialSolutionPlan?.projectName || `${payload.teamName?.trim() || 'University team'} · ${payload.challengeTitle || 'Challenge'}`;
    const projectPayload = {
      id: projectId,
      projectId,
      projectName,
      title: projectName,
      challengeId,
      problemId: payload.problemId || challengeId,
      challengeTitle: payload.challengeTitle || 'Challenge',
      challengeLocation: payload.challengeLocation || '',
      challengeCategory: payload.challengeCategory || payload.challengeCategory || 'Other',
      challengeDescription: payload.challengeDescription || '',
      ownerId: auth.currentUser.uid,
      createdBy: auth.currentUser.uid,
      universityId,
      universityName: payload.universityName || 'University',
      department: payload.department || 'University',
      teamId: teamRef.id,
      teamName: payload.teamName?.trim() || 'University team',
      team: payload.students || [],
      team_members: payload.students || [],
      facultyMentorId: payload.facultyMentorId,
      facultyMentorName: payload.facultyMentorDetails?.name || payload.facultyMentorName || 'Faculty mentor',
      status: 'SOLUTION_DEVELOPMENT',
      currentPhase: 'SOLUTION_DEVELOPMENT',
      progress: 0,
      milestones: payload.milestones || [],
      initialSolutionPlan: payload.initialSolutionPlan || {
        problemUnderstanding: 'The team has reviewed the challenge and will define the solution approach during project development.',
        solutionConcept: 'Solution concept to be refined in the project workspace and proposal stage.',
        targetOutcome: 'Deliver a validated solution aligned with the challenge objective and community impact.',
        requiredTechnologies: 'To be finalized by the project team and faculty mentor.',
        expectedImpact: 'To be measured through prototype output, field testing, and deployment readiness.',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const projectRef = doc(collection(db, 'projects'));
    await setDoc(projectRef, {
      ...projectPayload,
      id: projectRef.id,
      projectId: projectRef.id,
      teamId: teamRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const completeTeam = { ...teamPayload, id: teamRef.id, teamId: teamRef.id };
    const completeProject = { ...projectPayload, id: projectRef.id, projectId: projectRef.id, teamId: teamRef.id };

    await updateProblem(challengeId, {
      universityId,
      universityName: payload.universityName || 'University',
      universityDepartment: payload.department || 'University',
      universityInterest: {
        universityId: universityId,
        universityName: payload.universityName || 'University',
        department: payload.department || 'University',
        interestedAt: new Date(),
        interestedBy: auth.currentUser.uid,
        teamId: teamRef.id,
        status: 'REGISTERED',
      },
      studentTeamId: teamRef.id,
      studentTeamName: payload.teamName?.trim() || 'University team',
      facultyMentorId: payload.facultyMentorId,
      facultyMentorName: payload.facultyMentorDetails?.name || payload.facultyMentorName || 'Faculty mentor',
      currentStage: 'SOLUTION_DEVELOPMENT',
      challengeStatus: 'SOLUTION_DEVELOPMENT',
      progress: 0,
    });

    const governmentUsers = await read('users', [where('role', 'in', ['PANCHAYAT_OFFICER', 'ULB_OFFICER', 'DISTRICT_OFFICER', 'GOVERNMENT_OFFICER', 'DEPARTMENT_ADMIN', 'PROJECT_OFFICER'])]);
    await Promise.all(governmentUsers.map(user => createNotification({
      recipientId: user.id,
      recipientRole: user.role,
      type: 'TEAM_REGISTERED',
      title: 'University team registered',
      message: `${payload.teamName?.trim() || 'University team'} started solution development for ${payload.challengeTitle || 'this challenge'}.`,
      relatedProblemId: challengeId,
      relatedProjectId: projectRef.id,
      relatedTeamId: teamRef.id,
      relatedUniversityId: universityId,
      priority: 'NORMAL',
      actionUrl: '/dashboard/projects',
    })));

    return { team: completeTeam, project: completeProject, duplicate: false, teamId: teamRef.id, projectId: projectRef.id };
  },
  project: async (id: string) => {
    const live = await readOne('projects', id);
    // Never fall back to "the first project". The previous implementation ended
    // with `|| DEMO_PROJECTS[0]`, so opening an unknown or foreign project id
    // silently returned an unrelated organization's project.
    const match = Object.keys(live).length > 1
      ? live
      : (DEMO_UNIVERSITY_OVERVIEW.projects.find((x: AnyRecord) => x.id === id || x.project_code === id) || DEMO_PROJECTS.find(x => x.id === id || x.project_code === id) || null) as AnyRecord | null;
    if (!match) throw new Error(`Project ${id} was not found.`);
    const raw: AnyRecord = match;
    const project = projectView(raw);
    const relatedFeedback = DEMO_COMMUNITY_FEEDBACK.filter(f => f.project_id === raw.id);
    const relatedImpact = DEMO_IMPACT_METRICS.filter(m => m.project_id === raw.id).map(m => ({
      ...m,
      projectId: m.project_id,
      metric: m.metric_name,
      before: m.before_value,
      after: m.after_value,
      unit: m.metric_unit,
      verified: true,
      verifiedAt: '2026-09-01T00:00:00Z',
    }));
    const relatedSolutions = DEMO_SOLUTIONS.filter(s => s.project_id === raw.id);

    return {
      project,
      tasks: (raw.tasks || await read(`projects/${id}/tasks`)).map((t: any) => ({ ...t, dueDate: t.due_date || t.dueDate })),
      milestones: (raw.milestones || await read(`projects/${id}/milestones`)).map((m: any) => ({ ...m, dueDate: m.due_date || m.dueDate, done: m.done ?? m.status === 'COMPLETED' })),
      funding: [
        { id: 'f-1', requestedAmount: raw.funding_required || 850000, approvedAmount: raw.funding_received || 600000, releasedAmount: raw.funding_received || 600000, spentAmount: 420000, purpose: 'Telemetry sensor deployment and field instrumentation', status: 'APPROVED' }
      ],
      prototypes: [
        { id: 'proto-1', version: 'v0.2', description: 'LoRaWAN multi-parameter telemetry sensor unit with solar backup', cost: 4500, knownIssues: 'Battery life drops during extended overcast', media: [] }
      ],
      tests: [
        { id: 't-1', type: 'LAB', name: 'pH & Turbidity Calibration', metric: 'Accuracy', expected: '±0.1 pH', actual: '±0.08 pH', passed: true, evidence: [] },
        { id: 't-2', type: 'FIELD', name: 'Telemetry Range Test', metric: 'Range over forest terrain', expected: '3 km', actual: '3.4 km', passed: true, evidence: [] }
      ],
      pilots: [
        { id: 'pilot-1', site: 'Angara Block', community: 'Hutwa & Silli villages', beneficiaries: raw.beneficiaries || 4500, installedUnits: 3, status: 'ACTIVE', startDate: '2026-06-01', endDate: '2026-11-30', evidence: [] }
      ],
      feedback: relatedFeedback.length ? relatedFeedback : DEMO_COMMUNITY_FEEDBACK,
      impact: relatedImpact.length ? relatedImpact : DEMO_IMPACT_METRICS.map(m => ({ ...m, projectId: m.project_id, metric: m.metric_name, before: m.before_value, after: m.after_value, unit: m.metric_unit, verified: true })),
      solutions: relatedSolutions.length ? relatedSolutions : DEMO_SOLUTIONS,
      messages: [
        { id: 'msg-1', authorName: 'Dr. Rajesh Kumar', text: 'Baseline water testing samples from Hutwa open wells completed.', createdAt: '2026-08-15T10:00:00Z' },
        { id: 'msg-2', authorName: 'Priya Sharma', text: 'MQTT telemetry pipeline live and streaming data to Grafana.', createdAt: '2026-08-20T14:30:00Z' }
      ],
      collaborations: [
        { id: 'collab-1', partnerName: 'Tata Steel CSR', contributionType: 'TESTING & FUNDING', status: 'ACTIVE' }
      ],
      proposal: DEMO_PROPOSAL,
      patents: [],
      startups: [],
      technologyTransfers: [],
      blockers: await read(`projects/${id}/blockers`),
      guidanceRequests: await api.guidanceRequests(id),
    };
  },
  blockers: async (projectId: string) => read(`projects/${projectId}/blockers`),
  createBlocker: async (projectId: string, body: AnyRecord) => create(`projects/${projectId}/blockers`, body),
  resolveBlocker: async (projectId: string, blockerId: string) => update(`projects/${projectId}/blockers`, blockerId, { status: 'RESOLVED', resolvedAt: serverTimestamp() }),
  guidanceRequests: async (projectId: string) => {
    const [nested, collaborations] = await Promise.all([
      read(`projects/${projectId}/guidanceRequests`),
      read('industryCollaborations'),
    ]);
    const guidance = collaborations.filter(item => item.requestType === 'GUIDANCE' && String(item.projectId || '') === String(projectId));
    return [...nested, ...guidance.filter(item => !nested.some(request => request.id === item.id || request.collaborationId === item.id))];
  },
  createGuidanceRequest: async (projectId: string, body: AnyRecord) => {
    if (!auth?.currentUser || !db) throw new Error('Sign in with Firebase before requesting project guidance.');
    const project = await readOne('projects', projectId);
    if (Object.keys(project).length <= 1) throw new Error('The project could not be found.');
    const user = await readOne('users', auth.currentUser.uid);
    const universityId = project.universityId || project.university_id || project.organizationId || project.organization_id || user.organizationId || user.organization_id;
    if (!universityId) throw new Error('The project is not linked to a university.');
    const problemId = project.problemId || project.problem_id || project.challengeId || project.challenge_id || '';
    const requestedExpertise = String(body.expertise || '').split(/[,+]/).map((item: string) => item.trim()).filter(Boolean);
    return api.createIndustryCollaboration({
      requestType: 'GUIDANCE',
      projectId,
      projectName: project.title || project.projectName || 'University project',
      problemId,
      challengeId: project.challengeId || project.challenge_id || problemId,
      challengeTitle: project.challengeTitle || project.title || 'Project challenge',
      teamId: project.teamId || project.team_id || project.team?.[0]?.id || '',
      teamName: project.teamName || project.projectTeamName || 'Registered university team',
      universityId,
      universityName: user.organization_name || user.organizationName || project.universityName || project.organization_name || 'University',
      requestedBy: auth.currentUser.uid,
      requestedByRole: user.role || 'UNIVERSITY_ADMIN',
      requestedByName: user.full_name || user.name || auth.currentUser.displayName || 'University team member',
      topic: body.supportType || body.topic || 'Technical Guidance',
      expertise: body.expertise || requestedExpertise.join(', '),
      description: body.description || '',
      priority: body.priority || 'Medium',
      requestedExpertise,
      supportTypes: [body.supportType || 'Technical Guidance'],
      requirement: body.description || '',
      blocker: body.blocker || '',
      expectedSupport: body.blocker || body.description || '',
      preferredCollaboration: body.supportType || 'Technical Guidance',
      status: 'PENDING',
      mentorStatus: 'NOT_ASSIGNED',
      progress: 0,
      ownerId: auth.currentUser.uid,
    });
  },
  projectStatus: async (id: string, status: string) => {
    try {
      if (db) {
        const payload: AnyRecord = { status };
        if (['FIELD_TESTING', 'DEPLOYMENT', 'COMPLETED'].includes(String(status).toUpperCase())) payload.currentPhase = status;
        return projectView(await update('projects', id, payload));
      }
    } catch {}
    // Never fall back to DEMO_PROJECTS[0]: an unknown id must not silently be
    // reported as "the first project" with the requested status applied.
    const p = DEMO_PROJECTS.find(x => x.id === id);
    if (!p) throw new Error(`Project ${id} was not found.`);
    return projectView({ ...p, status });
  },
  solutionSubmissions: async () => {
    const rows = await read('solutionSubmissions');
    return rows.map((item: AnyRecord) => ({
      ...item,
      id: item.submissionId || item.id,
      submissionId: item.submissionId || item.id,
      status: item.status || 'DRAFT',
      governmentReview: item.governmentReview || { status: 'PENDING', feedback: '', reviewerId: null, submittedAt: item.submittedAt || item.createdAt || new Date().toISOString(), reviewedAt: null }
    }));
  },
  solutionSubmissionsForUniversity: async (universityId?: string) => {
    const rows = await read('solutionSubmissions');
    const uid = universityId || auth?.currentUser && (await readOne('users', auth.currentUser.uid)).organizationId || auth?.currentUser && (await readOne('users', auth.currentUser.uid)).organization_id;
    return rows.filter((item: AnyRecord) => item.universityId === uid).map((item: AnyRecord) => ({
      ...item,
      id: item.submissionId || item.id,
      submissionId: item.submissionId || item.id,
      status: item.status || 'DRAFT',
      governmentReview: item.governmentReview || { status: 'PENDING', feedback: '', reviewerId: null, submittedAt: item.submittedAt || item.createdAt || new Date().toISOString(), reviewedAt: null }
    }));
  },
  solutionSubmissionByProject: async (projectId: string, universityId?: string) => {
    const rows = await read('solutionSubmissions');
    const match = rows.find((item: AnyRecord) => {
      const ownerId = String(item.universityId || item.university_id || '');
      const belongsToUniversity = !universityId || ownerId === universityId;
      const matchesTarget = item.projectId === projectId || item.problemId === projectId || item.challengeId === projectId;
      return belongsToUniversity && matchesTarget;
    });
    if (!match) return null;
    return { ...match, id: match.submissionId || match.id, submissionId: match.submissionId || match.id, status: match.status || 'DRAFT', governmentReview: match.governmentReview || { status: 'PENDING', feedback: '', reviewerId: null, submittedAt: match.submittedAt || match.createdAt || new Date().toISOString(), reviewedAt: null } };
  },
  solutionSubmission: async (submissionId: string) => {
    const docRecord = await readOne('solutionSubmissions', submissionId);
    if (!docRecord || !Object.keys(docRecord).length || !docRecord.id || docRecord.id === 'undefined') {
      return null;
    }
    return { ...docRecord, id: docRecord.submissionId || docRecord.id, submissionId: docRecord.submissionId || docRecord.id, status: docRecord.status || 'DRAFT', governmentReview: docRecord.governmentReview || { status: 'PENDING', feedback: '', reviewerId: null, submittedAt: docRecord.submittedAt || docRecord.createdAt || new Date().toISOString(), reviewedAt: null } };
  },
  saveSolutionSubmission: async (payload: AnyRecord) => {
    if (!auth?.currentUser) throw new Error('You must be signed in to save a solution submission.');
    const submissionId = payload.submissionId || payload.id || `submission-${Date.now()}`;
    const record = {
      ...payload,
      submissionId,
      id: submissionId,
      universityId: payload.universityId || auth.currentUser.uid,
      status: 'DRAFT',
      governmentReview: payload.governmentReview || { status: 'PENDING', feedback: '', reviewerId: null, submittedAt: payload.submittedAt || new Date().toISOString(), reviewedAt: null },
      updatedAt: serverTimestamp(),
    };
    if (db) {
      await setDoc(doc(db, 'solutionSubmissions', submissionId), record, { merge: true });
      return { ...record, createdAt: payload.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    }
    return { ...record, createdAt: payload.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  },
  submitSolutionSubmission: async (payload: AnyRecord) => {
    if (!auth?.currentUser) throw new Error('You must be signed in to submit a solution.');
    const submissionId = payload.submissionId || payload.id || `submission-${Date.now()}`;
    const record = {
      ...payload,
      submissionId,
      id: submissionId,
      universityId: payload.universityId || auth.currentUser.uid,
      status: 'SUBMITTED',
      governmentReview: {
        status: 'PENDING',
        feedback: payload.governmentReview?.feedback || '',
        reviewerId: payload.governmentReview?.reviewerId || null,
        submittedAt: serverTimestamp(),
        reviewedAt: null,
      },
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (db) {
      await setDoc(doc(db, 'solutionSubmissions', submissionId), record, { merge: true });
      const governmentUsers = await read('users', [where('role', 'in', ['PANCHAYAT_OFFICER', 'ULB_OFFICER', 'DISTRICT_OFFICER', 'GOVERNMENT_OFFICER', 'DEPARTMENT_ADMIN', 'PROJECT_OFFICER'])]);
      await Promise.all(governmentUsers.map((user: AnyRecord) => createNotification({
        recipientId: user.id,
        recipientRole: user.role,
        type: 'SOLUTION_SUBMITTED',
        title: 'New solution submitted for review',
        message: `${payload.universityName || 'A university'} submitted a solution for ${payload.challengeTitle || 'review'}.`,
        relatedProjectId: payload.projectId,
        relatedProblemId: payload.problemId,
        relatedTeamId: payload.teamId,
        relatedUniversityId: payload.universityId,
        priority: 'HIGH',
        actionUrl: '/dashboard/solution-review',
      })));
      return { ...record, createdAt: payload.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    }
    return { ...record, createdAt: payload.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  },
  governmentSolutionSubmissions: async () => {
    const rows = await read('solutionSubmissions');
    return rows.filter((item: AnyRecord) => String(item.status || '').toUpperCase() !== 'DRAFT').map((item: AnyRecord) => ({
      ...item,
      id: item.submissionId || item.id,
      submissionId: item.submissionId || item.id,
      status: item.status || 'SUBMITTED',
      governmentReview: item.governmentReview || { status: 'PENDING', feedback: '', reviewerId: null, submittedAt: item.submittedAt || item.createdAt || new Date().toISOString(), reviewedAt: null }
    }));
  },
  updateSolutionSubmissionStatus: async (submissionId: string, status: string, feedback?: string, reviewerId?: string) => {
    if (!db || !auth?.currentUser) throw new Error('You must be signed in with Firebase to review a solution.');
    const existing = await readOne('solutionSubmissions', submissionId);
    if (!existing.id || existing.id === 'undefined' || Object.keys(existing).length <= 1) throw new Error('This solution submission could not be found.');
    const reviewer = reviewerId || auth.currentUser.uid;
    const reviewFeedback = feedback?.trim() || existing.governmentReview?.feedback || '';
    const reviewStatus = status === 'UNDER_REVIEW' || status === 'CHANGES_REQUESTED' || status === 'APPROVED' || status === 'REJECTED' ? status : 'PENDING';
    const historyEntry = { status: reviewStatus, feedback: reviewFeedback, reviewerId: reviewer, reviewedAt: new Date().toISOString() };
    const review = {
      ...(existing.governmentReview || {}),
      status: reviewStatus,
      feedback: reviewFeedback,
      reviewerId: reviewer,
      reviewedAt: serverTimestamp(),
      submittedAt: existing.governmentReview?.submittedAt || existing.submittedAt || serverTimestamp(),
    };
    await updateDoc(doc(db, 'solutionSubmissions', submissionId), {
      status: reviewStatus,
      governmentReview: review,
      reviewHistory: arrayUnion(historyEntry),
      updatedAt: serverTimestamp(),
    });

    let approvedProjectId = String(existing.projectId || '');
    if (reviewStatus === 'APPROVED') {
      const linkedProject = approvedProjectId ? await readOne('projects', approvedProjectId) : {};
      if (Object.keys(linkedProject).length > 1) {
        await updateDoc(doc(db, 'projects', approvedProjectId), { status: 'DEPLOYMENT_READY', currentPhase: 'DEPLOYMENT_READY', updatedAt: serverTimestamp() });
      } else {
        approvedProjectId = `solution-project-${submissionId}`;
        const generatedProject = await readOne('projects', approvedProjectId);
        if (Object.keys(generatedProject).length > 1) {
          await updateDoc(doc(db, 'projects', approvedProjectId), { status: 'DEPLOYMENT_READY', currentPhase: 'DEPLOYMENT_READY', updatedAt: serverTimestamp() });
        } else {
          await setDoc(doc(db, 'projects', approvedProjectId), {
            ...buildDeploymentReadyProject(existing, approvedProjectId),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        await updateDoc(doc(db, 'solutionSubmissions', submissionId), {
          projectId: approvedProjectId,
          projectTitle: existing.solutionTitle || existing.title || 'Approved solution project',
          updatedAt: serverTimestamp(),
        });
      }
      const problemId = String(existing.problemId || existing.challengeId || '');
      if (problemId) {
        const linkedProblem = await readOne('problems', problemId);
        const assignedOrganizationId = String(linkedProblem.industryPartnerId || '');
        if (Object.keys(linkedProblem).length > 1 && (!existing.industryId || assignedOrganizationId === String(existing.industryId))) {
          await updateProblem(problemId, { currentStage: 'DEPLOYMENT', challengeStatus: 'DEPLOYMENT' });
        }
      }
    }

    const recipientId = String(existing.submittedBy || existing.submitterId || existing.ownerId || '');
    const submitterRole = String(existing.submitterRole || existing.submitter_role || (existing.industryId ? 'INDUSTRY' : 'UNIVERSITY')).toUpperCase();
    const recipientRole = submitterRole === 'INDUSTRY' ? 'INDUSTRY_PARTNER' : String(existing.universityId ? 'UNIVERSITY_ADMIN' : submitterRole);
    const relatedUniversityId = existing.universityId || existing.organizationId || existing.organization_id || '';
    const relatedIndustryId = existing.industryId || (submitterRole === 'INDUSTRY' ? existing.organizationId : '') || '';
    const providerRoute = submitterRole === 'INDUSTRY' ? '/dashboard/solutions' : '/dashboard/solution-submissions';
    const notification = {
      recipientId,
      recipientRole,
      relatedProjectId: approvedProjectId || existing.projectId,
      relatedProblemId: existing.problemId || existing.challengeId,
      relatedTeamId: existing.teamId,
      relatedUniversityId,
      relatedPartnerId: relatedIndustryId,
      actionUrl: providerRoute,
    };
    const notificationByStatus: Record<string, { type: string; title: string; message: string; priority: 'NORMAL' | 'HIGH' }> = {
      UNDER_REVIEW: { type: 'SOLUTION_UNDER_REVIEW', title: 'Your solution is now under Government review', message: 'Your submitted solution is now under Government review.', priority: 'NORMAL' },
      CHANGES_REQUESTED: { type: 'SOLUTION_CHANGES_REQUESTED', title: 'Government requested changes to your solution', message: reviewFeedback || 'Government has requested changes to your submitted solution.', priority: 'HIGH' },
      APPROVED: { type: 'SOLUTION_APPROVED', title: 'Your solution is approved for deployment', message: 'Government approved your solution and moved the linked project to the deployment-ready phase.', priority: 'HIGH' },
      REJECTED: { type: 'SOLUTION_REJECTED', title: 'Your solution was not approved', message: reviewFeedback || 'Government has rejected your submitted solution.', priority: 'HIGH' },
    };
    const notificationDetails = notificationByStatus[reviewStatus];
    if (recipientId && notificationDetails) {
      await Promise.allSettled([createNotification({ ...notification, ...notificationDetails })]);
    }
    return { ...existing, id: submissionId, submissionId, projectId: approvedProjectId || existing.projectId, status: reviewStatus, governmentReview: review, reviewHistory: [...(existing.reviewHistory || []), historyEntry] };
  },
  milestone: async (projectId: string, id: string, body: AnyRecord) => {
    try {
      if (db) return await update(`projects/${projectId}/milestones`, id, body);
    } catch {}
    return { id, projectId, ...body };
  },
  task: async (projectId: string, body: AnyRecord) => {
    try {
      if (db) return await create(`projects/${projectId}/tasks`, body);
    } catch {}
    return { id: `task-${Date.now()}`, projectId, ...body, createdAt: new Date().toISOString() };
  },
  updateTask: async (projectId: string, id: string, body: AnyRecord) => {
    try {
      if (db) return await update(`projects/${projectId}/tasks`, id, body);
    } catch {}
    return { id, projectId, ...body };
  },
  taskComment: async (projectId: string, taskId: string, body: AnyRecord) => {
    try {
      if (db) return await create(`projects/${projectId}/tasks/${taskId}/comments`, body);
    } catch {}
    return { id: `tc-${Date.now()}`, projectId, taskId, ...body, authorName: 'Team Member', createdAt: new Date().toISOString() };
  },
  taskComments: async (projectId: string, taskId: string) => [],
  solutions: async () => DEMO_SOLUTIONS,
  similarChallenges: async () => [
    { challengeId: 'ch-002', publicId: 'CH-JH-2026-000002', title: 'Unsafe road crossing near primary school', similarity: 0.82, district: 'Dhanbad', locationDistanceKm: 42, status: 'VALIDATED' }
  ],
  refreshReplication: async () => [],
  requestReuse: async (id: string, body: AnyRecord) => ({ id: `reuse-${Date.now()}`, solutionId: id, ...body }),
  analytics: async () => ({
    totalChallenges: DEMO_CHALLENGES.length,
    projects: DEMO_PROJECTS.length,
    validated: DEMO_CHALLENGES.filter(x => ['VALIDATED', 'ASSIGNED'].includes(x.status)).length,
    highPriority: DEMO_CHALLENGES.filter(x => (x.priority_score || 0) >= 70).length,
    citizensImpacted: DEMO_PROJECTS.reduce((sum, x) => sum + Number(x.beneficiaries || 0), 0),
    universities: ORGANIZATIONS.filter(x => x.type === 'UNIVERSITY').length,
    districts: JHARKHAND_DISTRICTS.map(d => ({
      name: d.name,
      value: DEMO_CHALLENGES.filter(c => c.district === d.name).length || d.challenge_count || 0
    }))
  }),
  hotspots: async () => DEMO_CLUSTERS,
  analyticsCopilot: async () => ({
    answer: 'Analytics overview: Water Resources and Agriculture represent the highest volume of community challenges across Ranchi and Dhanbad districts. 2 active multidisciplinary projects are currently in prototyping and field-testing stages.'
  }),
  notifications: async () => {
    if (db && auth?.currentUser) {
      const live = await read('notifications', [where('recipientId', '==', auth.currentUser.uid)]);
      return live;
    }
    return DEMO_NOTIFICATIONS;
  },
  markNotificationRead: async (id: string) => {
    if (db && auth?.currentUser) await markLiveNotificationRead(id);
    return { id, read: true };
  },
  markAllNotificationsRead: async (ids: string[]) => {
    if (db && auth?.currentUser) await markAllLiveNotificationsRead(ids);
    return { read: true };
  },
  deleteNotification: async (id: string) => {
    if (db && auth?.currentUser) await deleteLiveNotification(id);
    return { id, deleted: true };
  },
  updateUserPreferences: async (preferences: AnyRecord) => {
    if (!db || !auth?.currentUser) return preferences;
    await setDoc(doc(db, 'users', auth.currentUser.uid), preferences, { merge: true });
    return preferences;
  },
  registerDeviceToken: async (token: string) => {
    try {
      if (db) return await setDoc(doc(db, 'users', auth?.currentUser?.uid || 'anonymous', 'devices', token), { token, createdAt: serverTimestamp() });
    } catch {}
  },
  search: async (term: string) => {
    const q = term.toLowerCase();
    return {
      challenges: DEMO_CHALLENGES.filter((x: AnyRecord) => `${x.title} ${x.description}`.toLowerCase().includes(q)),
      projects: DEMO_PROJECTS.filter((x: AnyRecord) => x.title?.toLowerCase().includes(q)),
      organizations: ORGANIZATIONS.filter((x: AnyRecord) => x.name?.toLowerCase().includes(q)),
      solutions: DEMO_SOLUTIONS.filter((x: AnyRecord) => x.title?.toLowerCase().includes(q))
    };
  },
  autocomplete: async () => [],
  studentDashboard: async () => ({
    projects: DEMO_PROJECTS.map(projectView),
    tasks: DEMO_PROJECTS[0]?.tasks || [],
    applications: [{ id: 'app-1', title: DEMO_CHALLENGES[0].title, status: 'ACCEPTED' }],
    recommendedChallenges: DEMO_CHALLENGES.map(challengeView),
    contribution: { completedTasks: 2 }
  }),
  facultyDashboard: async () => ({
    mentorCapacity: 3,
    projects: DEMO_PROJECTS.map(projectView),
    pendingProposalReviews: [{ id: 'rev-1', title: 'Water Quality Monitoring System v2.1', department: 'Environmental Science' }],
    mentorshipInvitations: [],
    profile: { name: 'Dr. Rajesh Kumar', email: 'faculty@jansetu.demo' }
  }),
  universityDashboard: async () => ({
    capacity: { activeProjects: DEMO_PROJECTS.length, configured: 6 },
    faculty: DEMO_FACULTY,
    students: DEMO_STUDENTS,
    labs: [{ id: 'l-1', name: 'IoT Sensor Network Lab' }, { id: 'l-2', name: 'Water Quality Testing Lab' }],
    recommendedChallenges: DEMO_CHALLENGES.map(challengeView),
    projects: DEMO_PROJECTS.map(projectView),
    applications: []
  }),
  universityOrganization: async () => {
    if (!auth?.currentUser || !db) return '';
    const user = await readOne('users', auth.currentUser.uid);
    const universityId = import.meta.env.DEV ? demoUniversityIdForUser(user) : user.organizationId || user.organization_id;
    const organization = universityId ? await readOne('organizations', universityId) : {};
    return user.organization_name || user.organizationName || organization.name || organization.organization_name || (import.meta.env.DEV ? ORGANIZATIONS.find(item => item.id === universityId)?.name : '') || '';
  },
  universityOverview: async () => {
    const empty = { universityId: '', university: null, teams: [], projects: [], faculty: [], milestones: [], collaborations: [], attention: [], activity: [], challenges: [], submissions: [], impactRecords: [] };
    if (!auth?.currentUser || !db) return empty;
    const user = await readOne('users', auth.currentUser.uid);
    const universityId = import.meta.env.DEV ? demoUniversityIdForUser(user) : user.organizationId || user.organization_id;
    if (!universityId) return { ...empty, university: { name: user.organization_name || user.organizationName || '' } };
    const [university, teams, rawProjects, problems, submissions, collaborations, impactRecords] = await Promise.all([
      readOne('organizations', universityId),
      readUniversityScoped('teams', ['universityId', 'university_id', 'organizationId', 'organization_id'], universityId),
      readUniversityScoped('projects', ['universityId', 'university_id', 'organizationId', 'organization_id'], universityId),
      readUniversityScoped('problems', ['universityId', 'assignedOrganizationId', 'assigned_organization_id', 'organizationId', 'organization_id'], universityId),
      readUniversityScoped('solutionSubmissions', ['universityId', 'university_id'], universityId),
      readUniversityScoped('industryCollaborations', ['universityId', 'university_id'], universityId),
      readUniversityScoped('impactMetrics', ['universityId', 'university_id'], universityId),
    ]);
    if (import.meta.env.DEV && universityId === 'org-bit-mesra' && !teams.length && !rawProjects.length && !problems.length && !submissions.length && !collaborations.length && !impactRecords.length) {
      return buildDemoUniversityOverview(universityId, user.organization_name || user.organizationName);
    }
    const projects: AnyRecord[] = rawProjects.map(projectView) as AnyRecord[];
    const milestones = projects.flatMap(project => (project.milestones || []).map((milestone: AnyRecord) => ({ ...milestone, projectId: project.id, projectTitle: project.title, date: milestone.completedAt || milestone.updatedAt || project.updatedAt })));
    const projectIds = new Set(projects.map(project => project.id));
    const scopedSubmissions = submissions.filter((item: AnyRecord) => projectIds.has(item.projectId));
    const linkedImpact = await Promise.all(projects.map(async project => {
      const [flatRows, nestedRows] = await Promise.all([
        readUniversityScoped('impactMetrics', ['projectId', 'project_id'], project.id),
        read(`projects/${project.id}/impactMetrics`),
      ]);
      const inline = project.impactRecords || project.impactMetrics || project.impact;
      const inlineRows = Array.isArray(inline) ? inline : inline && typeof inline === 'object' ? Object.entries(inline).map(([metric, value]) => ({ metric, value })) : [];
      return [...flatRows, ...nestedRows, ...inlineRows.map((item: AnyRecord) => ({ ...item, projectId: item.projectId || item.project_id || project.id }))];
    }));
    const scopedImpact = [...new Map([...impactRecords, ...linkedImpact.flat()].filter((item: AnyRecord) => projectIds.has(item.projectId || item.project_id) || item.universityId === universityId).map((item: AnyRecord) => [item.id || `${item.projectId || item.project_id}-${item.metric_name || item.metric}-${item.metric_value || item.value || item.after}`, item])).values()];
    const scopedCollaborations = collaborations.filter((item: AnyRecord) => projectIds.has(item.projectId) || item.universityId === universityId);
    const activity = [...teams.map(team => ({ id: `team-${team.id}`, title: `Team ${team.teamName || 'registered'}`, projectTitle: team.challengeTitle || team.problemId, date: team.createdAt })), ...projects.map(project => ({ id: `project-${project.id}`, title: `Project ${project.title} updated`, projectTitle: project.title, date: project.updatedAt }))].sort((a, b) => new Date(String(b.date || '')).getTime() - new Date(String(a.date || '')).getTime()).slice(0, 8);
    return { universityId, university, teams, projects, faculty: [], milestones, collaborations: scopedCollaborations, attention: [], activity, challenges: problems, submissions: scopedSubmissions, impactRecords: scopedImpact };
  },
  districtDashboard: async () => ({
    district: 'Ranchi',
    challenges: DEMO_CHALLENGES.map(challengeView),
    criticalClusters: DEMO_CLUSTERS,
    projects: DEMO_PROJECTS.map(projectView),
    pilots: [{ id: 'pil-1', site: 'Angara Block', status: 'ACTIVE' }],
    alerts: [{ id: 'alt-1', title: 'Seasonal Contamination Risk', severity: 'HIGH' }],
    domainDistribution: []
  }),
  marketplace: async () => DEMO_CHALLENGES.map(challengeView),
  applications: async () => [],
  applyToChallenge: async (id: string, body: AnyRecord) => ({ id: `app-${Date.now()}`, challengeId: id, applicantId: auth?.currentUser?.uid || '', ...body, status: 'SUBMITTED' }),
  updateApplication: async (id: string, status: string) => ({ id, status }),
  invitations: async () => [],
  answerInvitation: async (id: string, status: string) => ({ id, status }),
  csrMarketplace: async () => DEMO_PROJECTS.map((project: AnyRecord) => ({
    project: projectView(project),
    funding: [
      { id: `f-${project.id}`, requestedAmount: project.funding_required || 850000, purpose: 'Sensors, solar kits, and village field deployment' }
    ]
  })),
  knowledgeGraph: async () => ({
    nodes: [
      ...ORGANIZATIONS.map(o => ({ id: o.id, label: o.name, type: o.type })),
      ...DEMO_CHALLENGES.map(c => ({ id: c.id, label: c.title, type: 'CHALLENGE' })),
      ...DEMO_PROJECTS.map(p => ({ id: p.id, label: p.title, type: 'PROJECT' })),
      ...DEMO_FACULTY.map(f => ({ id: f.id, label: f.name, type: 'FACULTY' }))
    ],
    edges: [
      { id: 'e1', from: 'org-bit-mesra', to: 'ch-001', relation: 'ASSIGNED_TO' },
      { id: 'e2', from: 'proj-001', to: 'ch-001', relation: 'ADDRESSES' },
      { id: 'e3', from: 'org-bit-mesra', to: 'proj-001', relation: 'HOSTS' },
      { id: 'e4', from: 'fac-1', to: 'proj-001', relation: 'MENTORS' },
      { id: 'e5', from: 'org-nit-jamshedpur', to: 'ch-005', relation: 'ASSIGNED_TO' },
      { id: 'e6', from: 'proj-002', to: 'ch-005', relation: 'ADDRESSES' }
    ]
  }),
  community: async (id: string) => {
    const localSignals = localCommunitySignals[id] || [];
    const localComments = localCommunityComments[id] || [];
    if (db) {
      const signals = await read(`problems/${id}/communitySignals`);
      const comments = await read(`problems/${id}/communityComments`);
      const userId = auth?.currentUser?.uid;
      const summary = summarizeCommunitySignals(signals, userId);
      const problem = await readOne('problems', id);
      const baseScore = Number(problem.priority_score ?? problem.priorityScore ?? ({ CRITICAL: 92, HIGH: 78, MEDIUM: 55, LOW: 30 }[String(problem.priority || 'MEDIUM').toUpperCase()] || 45));
      const communityPriority = Math.min(100, baseScore + summary.supporters * 2 + summary.affectedConfirmations * 3);
      return {
        communityPriority,
        priorityLevel: priorityFromScore(communityPriority),
        supporters: summary.supporters,
        affectedConfirmations: summary.affectedConfirmations,
        commentCount: comments.length,
        evidenceCount: 0,
        incorrectReports: summary.incorrectReports,
        mySignals: summary.mySignals,
        myCommentsCount: comments.filter(comment => (comment.userId || comment.authorId) === userId).length,
        comments,
      };
    }

    const summary = summarizeCommunitySignals(localSignals, auth?.currentUser?.uid);
    const problem = await readOne('problems', id);
    const baseScore = Number(problem.priority_score ?? problem.priorityScore ?? ({ CRITICAL: 92, HIGH: 78, MEDIUM: 55, LOW: 30 }[String(problem.priority || 'MEDIUM').toUpperCase()] || 45));
    const communityPriority = Math.min(100, baseScore + summary.supporters * 2 + summary.affectedConfirmations * 3);
    return {
      communityPriority,
      priorityLevel: priorityFromScore(communityPriority),
      supporters: summary.supporters,
      affectedConfirmations: summary.affectedConfirmations,
      commentCount: localComments.length,
      evidenceCount: 0,
      incorrectReports: summary.incorrectReports,
      mySignals: summary.mySignals,
      myCommentsCount: localComments.filter(comment => (comment.userId || comment.authorId) === auth?.currentUser?.uid).length,
      comments: localComments,
    };
  },
  communitySignal: async (id: string, body: AnyRecord) => {
    if (db && auth?.currentUser) {
      const existingSignals = await read(`problems/${id}/communitySignals`);
      const existing = existingSignals.find(signal => signal.userId === auth.currentUser.uid && signal.type === body.type);
      if (existing) return existing;
      return create(`problems/${id}/communitySignals`, { ...body, challengeId: id, userId: auth.currentUser.uid });
    }
    const signal = { id: `sig-${Date.now()}`, challengeId: id, userId: auth?.currentUser?.uid || '', ...body };
    localCommunitySignals[id] = [...(localCommunitySignals[id] || []), signal];
    return signal;
  },
  removeCommunitySignal: async (id: string, type: string) => {
    if (db && auth?.currentUser) {
      const signals = await read(`problems/${id}/communitySignals`);
      const mine = signals.find(signal => signal.userId === auth.currentUser?.uid && signal.type === type);
      if (mine) await remove(`problems/${id}/communitySignals`, mine.id);
    } else {
      localCommunitySignals[id] = (localCommunitySignals[id] || []).filter(signal => !(signal.userId === auth?.currentUser?.uid && signal.type === type));
    }
    return { deleted: true };
  },
  communityComment: async (id: string, body: AnyRecord) => {
    if (db && auth?.currentUser) return create(`problems/${id}/communityComments`, { ...body, challengeId: id, userId: auth.currentUser.uid, authorId: auth.currentUser.uid, authorName: body.authorName || 'Citizen' });
    const comment = { id: `comment-${Date.now()}`, challengeId: id, userId: auth?.currentUser?.uid || '', authorName: body.authorName || 'Citizen', ...body };
    localCommunityComments[id] = [...(localCommunityComments[id] || []), comment];
    return comment;
  },
  citizenBadges: async () => [
    { id: 'badge-1', code: 'COMMUNITY_REPORTER', label: 'Community Problem Reporter', reason: 'Submitted verified societal challenge in Ranchi district', awardedAt: '2026-02-15T00:00:00Z' },
    { id: 'badge-2', code: 'PROBLEM_VALIDATOR', label: 'Civic Field Validator', reason: 'Confirmed ground-level conditions for rural water problem', awardedAt: '2026-03-01T00:00:00Z' }
  ],
  volunteerDashboard: async () => {
    if (db && auth?.currentUser) {
      const records: AnyRecord[] = await Promise.all((await read('problems', [where('createdBy', '==', auth.currentUser.uid)])).map(async problem => {
        const report = challengeView(problemToChallenge(problem.id, problem));
        const signals = await read(`problems/${problem.id}/communitySignals`);
        const summary = summarizeCommunitySignals(signals, auth.currentUser.uid);
        const baseScore = Number(report.priority_score ?? report.priority?.total ?? 0);
        return { ...report, communityPriority: Math.min(100, baseScore + summary.supporters * 2 + summary.affectedConfirmations * 3), supporters: summary.supporters, affectedConfirmations: summary.affectedConfirmations } as AnyRecord;
      }));
      const verified = records.filter(report => String(report.governmentVerificationStatus || '').toUpperCase() === 'VERIFIED').length;
      const communities = new Set(records.map(report => [report.district, report.block, report.village].filter(Boolean).join('|')).filter(Boolean)).size;
      return {
        reports: records,
        verified,
        communities,
        stats: { citizensContacted: records.length, problemsCollected: records.length, verified },
        needsVerification: records.filter(report => !['VERIFIED', 'REJECTED'].includes(String(report.governmentVerificationStatus || '').toUpperCase())),
      };
    }
    return {
      reports: DEMO_CHALLENGES.map(challengeView),
      verified: DEMO_CHALLENGES.filter(challenge => ['VALIDATED', 'ASSIGNED'].includes(challenge.status)).length,
      communities: new Set(DEMO_CHALLENGES.map(challenge => [challenge.district, challenge.block, challenge.village].filter(Boolean).join('|'))).size,
      stats: { citizensContacted: DEMO_CHALLENGES.length, problemsCollected: DEMO_CHALLENGES.length, verified: DEMO_CHALLENGES.filter(challenge => ['VALIDATED', 'ASSIGNED'].includes(challenge.status)).length },
      needsVerification: DEMO_CHALLENGES.slice(0, 3).map(challengeView),
    };
  },
  volunteerReport: async (body: AnyRecord) => {
    const priority = calculatePriority(body);
    if (db && auth?.currentUser) {
      const created = await createProblem({
        title: body.title || 'Volunteer Field Report',
        description: body.description || 'No description provided.',
        category: body.domain || 'Other',
        priority: priority.level,
        priority_score: priority.score,
        priority_level: priority.level,
        priority_breakdown: { affectedPeople: body.affectedPeople || 0, severity: body.severity || 'MEDIUM', safetyConcern: Boolean(body.safetyConcern) },
        issueType: body.safetyConcern ? 'CRITICAL_SAFETY' : 'INNOVATION_OPPORTUNITY',
        location: { latitude: body.latitude, longitude: body.longitude, address: body.address, district: body.district, block: body.block, village: body.village },
        impact: { affectedPeople: body.affectedPeople, safetyImpact: body.safetyConcern, frequency: body.seasonal ? 'SEASONAL' : undefined },
        evidence: body.evidence || [],
        governmentVerificationStatus: 'PENDING',
        currentStage: 'REPORTED',
        progress: 0,
        communitySupportCount: 0,
        communityCommentCount: 0,
        citizenVerificationStatus: 'PENDING',
        isPublished: false,
        challengeStatus: 'DRAFT',
        createdByName: body.createdByName,
        citizen_name: body.consent ? body.citizenName : undefined,
        citizen_contact: body.consent ? body.citizenContact : undefined,
        duration: body.duration,
        seasonal: body.seasonal,
        safetyConcern: body.safetyConcern,
        notes: body.notes,
        communityRepresentatives: body.communityRepresentatives,
      } as any);
      return challengeView(problemToChallenge(created.id, created));
    }
    return challengeView({ id: `vol-${Date.now()}`, challenge_code: `VOL-JH-${Date.now().toString().slice(-4)}`, title: 'Volunteer Field Report', ...body, priority_score: priority.score, priority_level: priority.level, status: 'PENDING_VALIDATION' });
  },
  volunteerReportById: async (id: string) => {
    if (db && auth?.currentUser) {
      const record = await readOne('problems', id);
      if (record.createdBy && record.createdBy !== auth.currentUser.uid) throw new Error('You do not have access to this report.');
      return challengeView(problemToChallenge(id, record));
    }
    return challengeView(DEMO_CHALLENGES.find(challenge => challenge.id === id) || DEMO_CHALLENGES[0]);
  },
  notifyProblemReporter: async (problemId: string, title: string, message: string, type = 'PROBLEM_VERIFIED') => {
    if (!db) return;
    const problem = await readOne('problems', problemId);
    const recipientId = resolveProblemReporterId(problem);
    if (!recipientId) return;
    await createNotification({
      recipientId,
      recipientRole: 'VOLUNTEER',
      type,
      title,
      message,
      relatedProblemId: problemId,
      priority: 'HIGH',
      actionUrl: `/dashboard/volunteer/reports?challenge=${encodeURIComponent(problemId)}`,
    });
  },
  governmentCitizens: async () => {
    const demo = DEMO_CHALLENGES.map(challengeView).reduce((rows: AnyRecord[], challenge: AnyRecord, index) => {
      const id = challenge.reporterId || `demo-citizen-${index + 1}`;
      const existing = rows.find(row => row.id === id);
      const problem = {
        ...challenge,
        createdAt: challenge.createdAt || new Date().toISOString(),
        updatedAt: challenge.updatedAt || challenge.createdAt || new Date().toISOString(),
      };
      if (existing) existing.problems.push(problem);
      else rows.push({ id, name: challenge.submittedByName || 'Citizen', email: '', district: challenge.district, role: 'CITIZEN', joinedAt: problem.createdAt, problems: [problem] });
      return rows;
    }, []);
    if (!db) return demo;
    const [users, rawProblems] = await Promise.all([read('users'), read('problems')]);
    const grouped = new Map<string, AnyRecord>();
    users.filter(user => ['CITIZEN', 'VOLUNTEER'].includes(String(user.role || '').toUpperCase())).forEach(user => grouped.set(user.id, {
      id: user.id,
      name: user.full_name || user.displayName || user.email?.split('@')[0] || 'Citizen',
      email: user.email || '',
      avatarUrl: user.avatar_url || user.photoURL,
      district: user.district || '',
      block: user.block || '',
      village: user.village || '',
      role: String(user.role || 'CITIZEN').toUpperCase(),
      joinedAt: stamp(user.created_at || user.createdAt),
      problems: [],
    }));
    rawProblems.forEach(raw => {
      const challenge = challengeView(problemToChallenge(raw.id, raw));
      const id = resolveProblemReporterId(raw) || challenge.reporterId || raw.createdBy || raw.userId || raw.citizenId || raw.ownerId;
      if (!id) return;
      const userProfile = users.find(user => user.id === id);
      const role = userProfile ? String(userProfile.role || 'CITIZEN').toUpperCase() : (String((raw as AnyRecord).role || '').toUpperCase() === 'VOLUNTEER' ? 'VOLUNTEER' : 'CITIZEN');
      const person = grouped.get(id) || {
        id,
        name: raw.createdByName || challenge.submittedByName || userProfile?.full_name || 'Citizen',
        email: userProfile?.email || '',
        avatarUrl: userProfile?.avatar_url || userProfile?.photoURL,
        district: challenge.district || userProfile?.district || '',
        block: challenge.block || userProfile?.block || '',
        village: challenge.village || userProfile?.village || '',
        role,
        joinedAt: stamp(raw.createdAt || userProfile?.created_at || userProfile?.createdAt),
        problems: [],
      };
      person.problems.push(challenge);
      person.district ||= challenge.district || userProfile?.district || '';
      person.block ||= challenge.block || userProfile?.block || '';
      person.village ||= challenge.village || userProfile?.village || '';
      person.role = role;
      grouped.set(id, person);
    });
    return grouped.size ? [...grouped.values()] : demo;
  },
  governmentEcosystem: async () => {
    const [organizations, faculty, students, users, rawProblems, projects] = await Promise.all([
      read('organizations'), read('faculty'), read('students'), read('users'), read('problems'), read('projects'),
    ]);
    const liveOrganizations = organizations.length ? organizations : ORGANIZATIONS;
    const liveFaculty = faculty.length ? faculty : DEMO_FACULTY;
    const liveStudents = students.length ? students : DEMO_STUDENTS;
    const liveProblems = rawProblems.length ? rawProblems.map(problem => challengeView(problemToChallenge(problem.id, problem))) : DEMO_CHALLENGES.map(challengeView);
    const liveProjects = projects.length ? projects.map(projectView) : DEMO_PROJECTS.map(projectView);
    const universities = liveOrganizations.filter(item => String(item.type).toUpperCase() === 'UNIVERSITY');
    const industry = liveOrganizations.filter(item => ['INDUSTRY', 'STARTUP', 'MSME', 'CSR_PARTNER', 'RESEARCH_LAB'].includes(String(item.type).toUpperCase()));
    const funding = liveOrganizations.filter(item => ['CSR_PARTNER', 'FOUNDATION', 'FUNDING_PARTNER'].includes(String(item.type).toUpperCase()));
    const volunteers = users.filter(user => user.role === 'VOLUNTEER');
    const industryMentors = users.filter(user => ['MENTOR', 'INDUSTRY_MENTOR'].includes(String(user.role).toUpperCase()));
    const government = users.filter(user => mainRoleFor(user.role || 'CITIZEN') === 'GOVERNMENT');
    const collaborations = liveProblems.filter(problem => problem.universityName || problem.industryPartnerName || problem.assigned_organization_id || problem.project_id).map(problem => ({
      id: problem.id,
      problem,
      university: problem.universityName || liveOrganizations.find(org => org.id === problem.assigned_organization_id)?.name,
      industry: problem.industryPartnerName,
      faculty: problem.facultyMentorName,
      industryMentor: problem.industryMentorName,
    }));
    const activities = liveProblems.slice().sort((a, b) => new Date(String(b.updatedAt || b.createdAt)).getTime() - new Date(String(a.updatedAt || a.createdAt)).getTime()).slice(0, 6).map(problem => ({
      id: problem.id, title: problem.title, date: problem.updatedAt || problem.createdAt, stage: problem.currentStage || problem.challengeStatus || 'REPORTED',
    }));
    return { universities, industry, funding, faculty: liveFaculty, industryMentors, students: liveStudents, volunteers, government, problems: liveProblems, projects: liveProjects, collaborations, activities };
  },
  governmentMentorship: async () => {
    const [projects, mentorMeetings] = await Promise.all([
      read('projects'),
      read('mentorMeetings'),
    ]);
    const rows = buildGovernmentMentorshipRows(projects.length ? projects.map(projectView) : DEMO_PROJECTS.map(projectView), mentorMeetings);
    return rows;
  },
  governmentAlerts: async () => [
    { id: 'alt-1', title: 'Severe Monsoon Water Contamination Cluster', severity: 'HIGH', message: '14 related reports in Angara block require priority intervention.', createdAt: '2026-09-10T00:00:00Z' }
  ],
  announcements: async () => {
    const rows = await read('announcements');
    if (rows.length) return rows.map((row: AnyRecord) => normalizeAnnouncementRecord(row, row.id || row.announcementId));
    return [
      { id: 'ann-1', title: 'Jharkhand State Innovation Challenge Grant 2026', body: 'Grants up to ₹15 Lakhs available for higher education institutions working on verified rural challenges.', category: 'FUNDING', publishedAt: '2026-09-01T00:00:00Z', active: true }
    ];
  },
  createAnnouncement: async (payload: AnyRecord) => {
    const title = String(payload.title || '').trim();
    const body = String(payload.body || payload.details || '').trim();
    if (!title || !body) throw new Error('Title and announcement details are required.');
    const category = String(payload.category || 'GENERAL').toUpperCase();
    const validCategories = new Set(['GENERAL', 'CHALLENGE', 'DEADLINE', 'FUNDING', 'PROGRAM', 'WORKSHOP', 'HACKATHON', 'POLICY']);
    if (!validCategories.has(category)) throw new Error('Please select a valid announcement category.');

    const announcementId = payload.id || payload.announcementId || `ann-${Date.now()}`;
    const announcement = normalizeAnnouncementRecord({
      ...payload,
      id: announcementId,
      title,
      body,
      category,
      publishedAt: payload.publishedAt || new Date().toISOString(),
      active: payload.active !== false,
      expiresAt: payload.expiresAt || undefined,
    }, announcementId);

    if (db) {
      await setDoc(doc(db, 'announcements', announcementId), {
        ...announcement,
        publishedAt: new Date(announcement.publishedAt),
        createdAt: new Date(announcement.createdAt || announcement.publishedAt),
        updatedAt: new Date(announcement.updatedAt || announcement.publishedAt),
      }, { merge: true });
    }

    const users = await read('users');
    const audience = buildAnnouncementAudienceUsers(users);
    const uniqueRecipients = [...new Map(audience.map((user: AnyRecord) => [String(user.id), user])).values()];
    await Promise.all(uniqueRecipients.map(async (user: AnyRecord) => {
      await createNotification({
        recipientId: String(user.id),
        recipientRole: String(user.role || 'CITIZEN'),
        type: 'GOVERNMENT_ANNOUNCEMENT',
        title: announcement.title,
        message: announcement.body,
        announcementId: announcement.id,
        relatedProjectId: payload.relatedProjectId,
        relatedProblemId: payload.relatedProblemId,
        relatedUniversityId: payload.relatedUniversityId,
        relatedPartnerId: payload.relatedPartnerId,
        actionUrl: `/dashboard/announcements/${announcement.id}`,
      });
    }));

    return announcement;
  },
  deployments: async () => {
    if (db) return read('deployments');
    return [{ id: 'dep-1', projectId: 'proj-001', site: 'Hutwa Panchayat Open Well', district: 'Ranchi', deploymentDate: '2026-06-15', status: 'OPERATIONAL', beneficiaries: 4500, installedUnits: 3 }];
  },
  createDeployment: async (projectId: string, payload: AnyRecord) => {
    if (!db || !auth?.currentUser) throw new Error('You must be signed in with Firebase to record a deployment.');
    if (!projectId) throw new Error('Select a project before recording its deployment.');
    const project = await readOne('projects', projectId);
    if (!project || Object.keys(project).length <= 1) throw new Error('The selected project could not be found.');

    const problemId = String(project.problemId || project.problem_id || project.challengeId || project.challenge_id || payload.problemId || '');
    const [problemRecord, submissions] = await Promise.all([
      problemId ? readOne('problems', problemId) : Promise.resolve({} as AnyRecord),
      read('solutionSubmissions'),
    ]);
    const problemCollection = Object.keys(problemRecord).length > 1 ? 'problems' : 'challenges';
    const problem = Object.keys(problemRecord).length > 1 || !problemId ? problemRecord : await readOne('challenges', problemId);
    const submission = submissions.find(item => String(item.projectId || '') === projectId || String(item.problemId || item.challengeId || '') === problemId);
    const status = String(payload.status || 'APPROVED').toUpperCase();
    const isDeployed = isDeploymentOperationalStatus(status);
    const deploymentRef = doc(collection(db, 'deployments'));
    const batch = writeBatch(db);
    batch.set(deploymentRef, {
      ...payload,
      id: deploymentRef.id,
      projectId,
      ...(problemId ? { problemId } : {}),
      ...((submission?.submissionId || submission?.id) ? { solutionSubmissionId: submission.submissionId || submission.id } : {}),
      status,
      ownerId: auth.currentUser.uid,
      createdBy: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (isDeployed) {
      batch.update(doc(db, 'projects', projectId), { status: 'DEPLOYED', currentPhase: 'DEPLOYED', deployedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      if (problemId && problemCollection === 'problems' && Object.keys(problem).length > 1) {
        batch.update(doc(db, 'problems', problemId), { currentStage: 'DEPLOYED', challengeStatus: 'DEPLOYED', updatedAt: serverTimestamp() });
      }
    }
    await batch.commit();

    if (isDeployed) {
      const reporterId = resolveProblemReporterId(problem);
      const recipients = deploymentNotificationRecipientIds(reporterId, submission || {}, project);
      const recipientProfiles = await Promise.all(recipients.map(async recipientId => ({ recipientId, user: await readOne('users', recipientId) })));
      await Promise.allSettled(recipientProfiles.map(({ recipientId, user }) => {
        const isReporter = recipientId === reporterId;
        return createNotification({
          recipientId,
          recipientRole: String(user.role || (isReporter ? 'CITIZEN' : submission?.submitterRole === 'INDUSTRY' ? 'INDUSTRY_PARTNER' : 'UNIVERSITY_ADMIN')),
          type: 'SOLUTION_DEPLOYED',
          title: isReporter ? 'A solution for your report has been deployed' : 'Your solution has been deployed',
          message: isReporter
            ? `The solution for ${problem.title || project.challengeTitle || project.title} is now operational at ${payload.site}.`
            : `${submission?.solutionTitle || project.title} is now operational at ${payload.site}.`,
          relatedProjectId: projectId,
          relatedProblemId: problemId || undefined,
          relatedPartnerId: submission?.industryId || undefined,
          relatedUniversityId: submission?.universityId || project.universityId || undefined,
          priority: 'HIGH',
          actionUrl: '/dashboard',
        });
      }));
    }
    return { id: deploymentRef.id, projectId, problemId, ...payload, status };
  },
  audit: async () => [
    { id: 'aud-1', action: 'CHALLENGE_VALIDATED', entity: 'Challenge', entityId: 'ch-001', actor: 'District Officer', timestamp: '2026-02-15T14:00:00Z' },
    { id: 'aud-2', action: 'PROJECT_ASSIGNED', entity: 'Project', entityId: 'proj-001', actor: 'Government Admin', timestamp: '2026-02-20T10:00:00Z' }
  ],
  roleRequests: async () => [],
  adminUsers: async () => [
    { id: 'u-1', name: 'Sunita Devi', email: 'citizen@jansetu.demo', role: 'CITIZEN', district: 'Ranchi' },
    { id: 'u-2', name: 'Dr. Rajesh Kumar', email: 'faculty@jansetu.demo', role: 'FACULTY', district: 'Ranchi', organizationId: 'org-bit-mesra' },
    { id: 'u-3', name: 'Priya Sharma', email: 'student@jansetu.demo', role: 'STUDENT', district: 'Ranchi', organizationId: 'org-bit-mesra' },
    { id: 'u-4', name: 'District Officer Ranchi', email: 'district@jansetu.demo', role: 'DISTRICT_OFFICER', district: 'Ranchi' }
  ],
  moderation: async () => [],
  featureFlags: async () => [
    { id: 'f-1', key: 'ENABLE_AI_VOICE_INTAKE', enabled: true, description: 'Allow voice recording for citizen challenge reporting' },
    { id: 'f-2', key: 'ENABLE_REPLICATION_ENGINE', enabled: true, description: 'Cross-district solution matching and replication suggestions' }
  ],
  systemHealth: async () => ({
    status: 'READY',
    mode: 'STATIC_DEMO',
    requests: { total: 1420 },
    uptimeSeconds: 7200,
    services: [
      { name: 'Static Demo Data Store', status: 'HEALTHY' },
      { name: 'Firebase Auth', status: 'HEALTHY' },
      { name: 'Local GIS & Mapping', status: 'HEALTHY' },
      { name: 'AI Simulation Pipeline', status: 'HEALTHY' }
    ]
  }),
  aiJobs: async () => [
    { id: 'job-1', type: 'CHALLENGE_PIPELINE', entityId: 'ch-001', attempts: 1, maxAttempts: 3, processingMs: 420, status: 'SUCCEEDED' },
    { id: 'job-2', type: 'CLUSTER_DETECTION', entityId: 'cluster-001', attempts: 1, maxAttempts: 3, processingMs: 650, status: 'SUCCEEDED' }
  ],
  accountExport: async () => ({
    profile: { email: auth?.currentUser?.email || 'citizen@jansetu.demo' },
    challenges: DEMO_CHALLENGES.filter(c => c.submitted_by === (auth?.currentUser?.uid || 'citizen-001'))
  }),
  deleteAccount: async () => ({ ok: true }),
  translate: async (text: string, targetLanguage = 'en', sourceLanguage = 'en') => {
    if (targetLanguage !== 'en' || sourceLanguage === 'en') return { text, translatedText: text, sourceLanguage, targetLanguage };
    const translationEndpoint = import.meta.env.VITE_TRANSLATION_API_URL as string | undefined;
    const translationSource = sourceLanguage === 'sat' || sourceLanguage === 'nag' ? 'auto' : sourceLanguage;
    if (translationEndpoint) {
      const response = await fetch(translationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLanguage: translationSource, targetLanguage }),
      });
      if (!response.ok) throw new Error('Translation service request failed.');
      const result = await response.json() as { translatedText?: string; text?: string };
      const translatedText = result.translatedText || result.text;
      if (!translatedText) throw new Error('Translation service returned no translation.');
      return { text: translatedText, translatedText, sourceLanguage, targetLanguage };
    }
    try {
      const remote = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(translationSource)}&tl=en&dt=t&q=${encodeURIComponent(text)}`);
      if (remote.ok) {
        const payload = await remote.json() as Array<Array<string>>;
        const translatedText = payload?.[0]?.map((part) => part?.[0] || '').join('').trim();
        if (translatedText && translatedText !== text.trim()) return { text: translatedText, translatedText, sourceLanguage, targetLanguage };
      }
    } catch {
      // Use the local prototype phrases below when the browser cannot reach the service.
    }
    const normalized = text.trim().replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const translations: Record<string, string> = {
      'हमारे गांव में पीने का पानी गंदा हो रहा है': 'The drinking water in our village is becoming contaminated.',
      'हमारे गांव में बारिश के समय पीने का पानी गंदा हो जाता है': 'During rain, the drinking water in our village becomes contaminated.',
      'पानी गंदा हो रहा है': 'The water is becoming contaminated.',
      'আমাদের গ্রামের পানীয় জল দূষিত হচ্ছে': 'The drinking water in our village is becoming contaminated.',
      'ہمارے گاؤں کا پینے کا پانی آلودہ ہو رہا ہے': 'The drinking water in our village is becoming contaminated.',
      'आम गांव में पीये के पानी गंदा होवत हे': 'The drinking water in our village is becoming contaminated.',
      'गांव में पानी की समस्या है': 'There is a water problem in the village.',
      'गांव में सड़क की समस्या है': 'There is a road problem in the village.',
    };
    let translatedText = translations[normalized];
    if (!translatedText && sourceLanguage === 'hi' && /पानी/.test(normalized) && /(गंद|दूषित|खराब)/.test(normalized)) {
      translatedText = /बारिश|बरसात|मानसून/.test(normalized)
        ? 'During rain, the drinking water in our village becomes contaminated.'
        : 'The drinking water in our village is becoming contaminated.';
    }
    if (!translatedText && sourceLanguage === 'hi' && /(सड़क|रास्ते)/.test(normalized)) translatedText = 'There is a road safety problem in the village.';
    if (!translatedText && sourceLanguage === 'bn' && /(পানি|জল)/.test(normalized)) translatedText = 'The drinking water in our village is becoming contaminated.';
    if (!translatedText && sourceLanguage === 'ur' && /(پانی|آلودہ)/.test(normalized)) translatedText = 'The drinking water in our village is becoming contaminated.';
    if (!translatedText) throw new Error('A translation service is not configured for this phrase yet.');
    return { text: translatedText, translatedText, sourceLanguage, targetLanguage };
  },
  tts: async () => { throw new Error('Text-to-speech demo fallback: Audio synthesizer is not configured.'); },
  transcribe: async () => ({ text: 'Water contamination during monsoon season causing health issues.' }),
  scanUpload: async () => ({ safe: true, status: 'SAFE' }),
  impactTemplates: async () => [],
  masterData: async () => JHARKHAND_DISTRICTS.map(d => ({ id: d.id, name: d.name, type: 'DISTRICT', code: d.id.toUpperCase() })),
  notificationTemplates: async () => []
};

const apiProxy = new Proxy(api, {
  get(target, property: string) {
    if (property in target) return target[property];
    return async (...args: any[]) => create('workflowEvents', { action: property, arguments: args, actorId: auth?.currentUser?.uid || '' });
  }
});

export { apiProxy as api };
export type { Evidence };
export const publicApi = {
  stats: apiProxy.stats,
  challenges: apiProxy.challenges,
  solutions: apiProxy.solutions,
  passport: async (publicId: string) => ({
    publicId,
    challenge: await apiProxy.challenge(publicId),
    project: null,
    solution: null,
    impact: []
  })
};
