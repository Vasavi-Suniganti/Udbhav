import {
  DEMO_CHALLENGES,
  DEMO_IMPACT_METRICS,
  DEMO_PROJECTS,
  DEMO_PROPOSAL,
  ORGANIZATIONS,
} from '@/data/demo';

type AnyRecord = Record<string, any>;

export function demoUniversityIdForUser(user: AnyRecord) {
  const savedId = user.organizationId || user.organization_id;
  if (savedId) return savedId;
  if (user.role !== 'UNIVERSITY_ADMIN') return '';

  const organizationName = String(user.organization_name || user.organizationName || '').toLowerCase();
  return ORGANIZATIONS.find(organization => organization.name.toLowerCase() === organizationName)?.id || 'org-bit-mesra';
}

export function buildDemoUniversityOverview(universityId: string, displayName?: string) {
  const organization = ORGANIZATIONS.find(item => item.id === universityId);
  const universityName = displayName || organization?.name || 'University';
  const projects: AnyRecord[] = DEMO_PROJECTS
    .filter((project: AnyRecord) => (project.organization_id || project.organizationId) === universityId)
    .map((project: AnyRecord): AnyRecord => ({ ...project, universityId, universityName }));
  const projectIds = new Set(projects.map((project: AnyRecord) => project.id));
  const teams = projects.map((project: AnyRecord) => {
    const members = project.team_members || project.team || [];
    return {
      id: `demo-team-${project.id}`,
      projectId: project.id,
      universityId,
      teamName: project.teamName || 'Project team',
      teamStatus: 'ACTIVE',
      studentCount: members.filter((member: AnyRecord) => !/faculty|mentor/i.test(String(member.role || ''))).length,
    };
  });
  const challenges = DEMO_CHALLENGES.filter((challenge: AnyRecord) =>
    challenge.assigned_organization_id === universityId && projectIds.has(challenge.project_id),
  );
  const submissions = DEMO_PROPOSAL.project_id && projectIds.has(DEMO_PROPOSAL.project_id)
    ? [{
      ...DEMO_PROPOSAL,
      projectId: DEMO_PROPOSAL.project_id,
      projectTitle: projects.find((project: AnyRecord) => project.id === DEMO_PROPOSAL.project_id)?.title,
      governmentReview: { status: DEMO_PROPOSAL.status },
    }]
    : [];
  const impactRecords = DEMO_IMPACT_METRICS
    .filter((record: AnyRecord) => projectIds.has(record.project_id))
    .map((record: AnyRecord) => ({ ...record, projectId: record.project_id, universityId, verified: false }));
  const milestones = projects.flatMap((project: AnyRecord) => (project.milestones || []).map((milestone: AnyRecord) => ({
    ...milestone,
    projectId: project.id,
    projectTitle: project.title,
    date: milestone.completedAt || milestone.updatedAt || project.updated_at,
  })));

  return {
    universityId,
    university: { ...(organization || {}), id: universityId, name: universityName },
    teams,
    projects,
    faculty: [],
    milestones,
    collaborations: [],
    attention: [],
    activity: projects.map(project => ({ id: `project-${project.id}`, title: `Project ${project.title} updated`, projectTitle: project.title, date: project.updated_at })),
    challenges,
    submissions,
    impactRecords,
  };
}