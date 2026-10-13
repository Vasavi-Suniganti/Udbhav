import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: undefined, auth: undefined, firebaseEnabled: false }));

import {
  buildIndustrySolutionSubmissionRecord,
  buildDeploymentReadyProject,
  deploymentNotificationRecipientIds,
  isDeploymentOperationalStatus,
  isGovernmentReviewSubmission,
  buildUniversitySolutionTargets,
  normalizeSolutionSubmissionRecord,
  mergeUniversitySolutionProjects,
  resolveSolutionProgress,
  solutionFromDoc,
  solutionReviewStatusLabel,
  solutionStatusOf,
  solutionSubmissionBelongsToUniversity,
  stageLabel,
  universityRoutedSolutionProblems,
  type IndustrySolution,
} from '@/lib/solutions';

function record(overrides: Partial<IndustrySolution> = {}): IndustrySolution {
  return {
    id: 'sol-1',
    challengeId: 'problem-1',
    projectId: 'problem-1',
    organizationId: 'org-1',
    organizationName: 'ABC Innovations',
    challengeTitle: 'Smart Waste Management',
    problem: 'Inefficient waste collection affecting local residents.',
    title: 'Route optimisation platform',
    solution: 'AI-assisted waste collection routing.',
    approach: 'IoT bins + routing model',
    expectedImpact: '30% fewer missed pickups',
    domains: ['Waste Management'],
    districts: ['Ranchi'],
    estimatedFunding: 500000,
    progress: 35,
    prototypeStatus: 'IN_PROGRESS',
    testingStatus: 'NOT_STARTED',
    implementationStatus: 'NOT_STARTED',
    deploymentStatus: 'NOT_STARTED',
    createdBy: 'user-1',
    ...overrides,
  };
}

describe('industry solution store', () => {
  it('notifies the reporter and unique solution contributors only after deployment is operational', () => {
    expect(isDeploymentOperationalStatus('APPROVED')).toBe(false);
    expect(isDeploymentOperationalStatus('DEPLOYED')).toBe(true);
    expect(isDeploymentOperationalStatus('OPERATIONAL')).toBe(true);
    expect(deploymentNotificationRecipientIds('citizen-1', { submittedBy: 'worker-1' }, { ownerId: 'worker-1', team_members: [{ userId: 'member-1' }] })).toEqual(['citizen-1', 'worker-1', 'member-1']);
  });

  it('creates a Government-visible deployment-ready project from an approved solution', () => {
    const project = buildDeploymentReadyProject({
      id: 'submission-1', submissionId: 'submission-1', challengeId: 'problem-1', problemId: 'problem-1',
      industryId: 'industry-1', organizationName: 'Acme', submittedBy: 'partner-user',
      solutionTitle: 'Water sensor network', solution: 'Install community water sensors.',
    }, 'project-approved-1');

    expect(project).toMatchObject({
      id: 'project-approved-1', title: 'Water sensor network', challengeId: 'problem-1',
      industryId: 'industry-1', organizationId: 'industry-1', status: 'DEPLOYMENT_READY',
      currentPhase: 'DEPLOYMENT_READY', solutionSubmissionId: 'submission-1',
    });
  });

  it('scopes live submissions to the university aliases or signed-in submitter', () => {
    expect(solutionSubmissionBelongsToUniversity({ university_id: 'org-1' }, ['org-1'], 'user-1')).toBe(true);
    expect(solutionSubmissionBelongsToUniversity({ submittedBy: 'user-1' }, ['org-1'], 'user-1')).toBe(true);
    expect(solutionSubmissionBelongsToUniversity({ universityId: 'org-2', submittedBy: 'user-2' }, ['org-1'], 'user-1')).toBe(false);
  });

  it('keeps drafts out of the Government review queue while admitting submitted review states', () => {
    expect(isGovernmentReviewSubmission({ id: 'draft-1', status: 'DRAFT' })).toBe(false);
    expect(isGovernmentReviewSubmission({ id: 'submitted-1', status: 'SUBMITTED' })).toBe(true);
    expect(isGovernmentReviewSubmission({ submissionId: 'reviewed-1', status: 'APPROVED' })).toBe(true);
  });

  it('labels Government review states for the Industry dashboard', () => {
    expect(solutionReviewStatusLabel('SUBMITTED')).toBe('Pending Government Review');
    expect(solutionReviewStatusLabel('UNDER_REVIEW')).toBe('Under Government Review');
    expect(solutionReviewStatusLabel('CHANGES_REQUESTED')).toBe('Changes Requested');
    expect(solutionReviewStatusLabel('APPROVED')).toBe('Government Approved');
    expect(solutionReviewStatusLabel('NOT_STARTED')).toBeUndefined();
  });

  it('builds an industry proposal as a government-reviewable submission', () => {
    const submission = buildIndustrySolutionSubmissionRecord(record(), 'industry-submission-1', 'partner-user-1', '2026-09-27T12:00:00.000Z');

    expect(submission).toMatchObject({
      submissionId: 'industry-submission-1',
      projectId: 'problem-1',
      problemId: 'problem-1',
      challengeId: 'problem-1',
      submittedBy: 'partner-user-1',
      submitterRole: 'INDUSTRY',
      industryId: 'org-1',
      organizationName: 'ABC Innovations',
      solution: 'AI-assisted waste collection routing.',
      summary: 'AI-assisted waste collection routing.',
      status: 'SUBMITTED',
      governmentReview: { status: 'PENDING', feedback: '', reviewerId: null, submittedAt: '2026-09-27T12:00:00.000Z', reviewedAt: null },
    });
  });

  it('uses only published Firestore problems routed to a university', () => {
    const problems = universityRoutedSolutionProblems([
      { id: 'university-only', source: 'firestore', isPublished: true, collaborationType: 'UNIVERSITY' },
      { id: 'shared-route', source: 'firestore', isPublished: true, collaborationType: 'UNIVERSITY_AND_INDUSTRY' },
      { id: 'draft', source: 'firestore', isPublished: false, collaborationType: 'UNIVERSITY' },
      { id: 'industry-only', source: 'firestore', isPublished: true, collaborationType: 'INDUSTRY' },
      { id: 'demo', source: 'demo', isPublished: true, collaborationType: 'UNIVERSITY' },
    ]);

    expect(problems.map(problem => problem.id)).toEqual(['university-only', 'shared-route']);
  });

  it('offers every routed problem and links matching projects without inventing project ids', () => {
    const targets = buildUniversitySolutionTargets(
      [{ id: 'project-water', challengeId: 'problem-water', teamId: 'team-water' }],
      [
        { id: 'problem-water', title: 'Water quality monitoring' },
        { id: 'problem-roads', title: 'Rural road safety' },
      ],
    );

    expect(targets).toHaveLength(2);
    expect(targets[0]).toMatchObject({ id: 'project-water', linkedProjectId: 'project-water', problemId: 'problem-water', challengeTitle: 'Water quality monitoring', teamId: 'team-water', isProblemOnly: false });
    expect(targets[1]).toMatchObject({ id: 'problem:problem-roads', linkedProjectId: '', problemId: 'problem-roads', challengeTitle: 'Rural road safety', isProblemOnly: true });
  });

  it('lists all university-owned solution projects, includes team-linked legacy projects, and excludes other universities', () => {
    const projects = mergeUniversitySolutionProjects(
      [{ id: 'project-a', universityId: 'university-1', challengeTitle: 'Water safety' }],
      [
        { id: 'project-a', universityId: 'university-1', title: 'Water team project' },
        { id: 'project-b', organization_id: 'university-1', challengeTitle: 'Waste collection' },
        { id: 'project-c', team_id: 'team-1', challengeTitle: 'Flood alerts' },
        { id: 'project-other', universityId: 'university-2', challengeTitle: 'Other university' },
      ],
      [{ id: 'team-1', projectId: 'project-c' }],
      'university-1',
    );

    expect(projects.map(project => project.id)).toEqual(['project-a', 'project-b', 'project-c']);
    expect(projects[0].challengeTitle).toBe('Water safety');
  });

  it('normalizes a stored solution document and defaults unknown stages', () => {
    const mapped = solutionFromDoc('doc-1', {
      challenge_id: 'problem-9',
      projectId: 'project-9',
      organization_id: 'org-9',
      organizationName: 'ABC Innovations',
      challenge_title: 'Unsafe drinking water',
      problem: '250 families face unsafe drinking water.',
      title: 'Water quality kit',
      solution: 'Low-cost monitoring and purification.',
      estimated_funding: '500000',
      progress: '35',
      prototype_status: 'completed',
      testingStatus: 'unknown-value',
    });

    expect(mapped.id).toBe('doc-1');
    expect(mapped.challengeId).toBe('problem-9');
    expect(mapped.projectId).toBe('project-9');
    expect(mapped.organizationId).toBe('org-9');
    expect(mapped.problem).toContain('unsafe drinking water');
    expect(mapped.estimatedFunding).toBe(500000);
    expect(mapped.progress).toBe(35);
    expect(mapped.prototypeStatus).toBe('COMPLETED');
    expect(mapped.testingStatus).toBe('NOT_STARTED');
    expect(mapped.deploymentStatus).toBe('NOT_STARTED');
  });

  it('derives the solution status only from recorded stage values', () => {
    expect(solutionStatusOf(undefined)).toBe('NOT_STARTED');
    expect(solutionStatusOf(record())).toBe('IN_DEVELOPMENT');
    expect(solutionStatusOf(record({ prototypeStatus: 'COMPLETED', testingStatus: 'NOT_STARTED' }))).toBe('READY');
    expect(solutionStatusOf(record({ deploymentStatus: 'COMPLETED' }))).toBe('DEPLOYED');
  });

  it('uses a recorded progress value and falls back to the linked challenge progress', () => {
    expect(resolveSolutionProgress(record({ progress: 35 }), 10)).toBe(35);
    expect(resolveSolutionProgress(record({ progress: undefined }), 42)).toBe(42);
    expect(resolveSolutionProgress(record({ progress: 250 }), undefined)).toBe(100);
    expect(resolveSolutionProgress(record({ progress: undefined }), undefined)).toBeNull();
  });

  it('labels each stage section with prototype-level wording', () => {
    expect(stageLabel('prototype', 'IN_PROGRESS')).toBe('In Development');
    expect(stageLabel('prototype', 'COMPLETED')).toBe('Ready for Testing');
    expect(stageLabel('deployment', 'COMPLETED')).toBe('Deployed');
    expect(stageLabel('testing', 'NOT_STARTED')).toBe('Not Started');
  });

  it('normalizes a shared canonical solution record across university and industry submitters', () => {
    const record = normalizeSolutionSubmissionRecord({
      id: 'sol-99',
      projectId: 'proj-77',
      problemId: 'prob-12',
      submittedBy: 'industry-1',
      submitterRole: 'INDUSTRY',
      organizationName: 'Acme Solar',
      organizationId: 'org-industrial-1',
      solutionTitle: 'Solar Street Lighting System',
      status: 'SUBMITTED',
    });

    expect(record.id).toBe('sol-99');
    expect(record.submissionId).toBe('sol-99');
    expect(record.solutionId).toBe('sol-99');
    expect(record.projectId).toBe('proj-77');
    expect(record.problemId).toBe('prob-12');
    expect(record.submitterRole).toBe('INDUSTRY');
    expect(record.organizationName).toBe('Acme Solar');
    expect(record.status).toBe('SUBMITTED');
  });
});
