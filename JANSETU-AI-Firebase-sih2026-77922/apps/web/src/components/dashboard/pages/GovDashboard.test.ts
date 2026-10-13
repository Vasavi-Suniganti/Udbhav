import { describe, expect, it } from 'vitest';
import { summarizeGovActionQueue, summarizeGovDashboardMetrics } from './GovDashboard';
import { summarizeVolunteerContributors } from './GovernmentCitizensView';

describe('summarizeGovDashboardMetrics', () => {
  it('counts verified, routed, project and review activity from canonical records', () => {
    const summary = summarizeGovDashboardMetrics(
      [
        { id: 'p1', governmentVerificationStatus: 'VERIFIED', industryPartnerId: 'org-1', universityId: 'uni-1', status: 'OPEN_FOR_INSTITUTIONS' },
        { id: 'p2', governmentVerificationStatus: 'PENDING', status: 'PENDING_VALIDATION' },
        { id: 'p3', governmentVerificationStatus: 'VERIFIED', universityId: 'uni-2', status: 'UNIVERSITY_ASSIGNED' },
        { id: 'p4', governmentVerificationStatus: 'CLARIFICATION_REQUIRED', status: 'REPORTED' },
        { id: 'p5', governmentVerificationStatus: 'VERIFIED', industryPartnerId: 'org-2', status: 'INDUSTRY_ASSIGNED' },
        { id: 'p6', governmentVerificationStatus: 'VERIFIED', industryPartnerId: 'org-3', universityId: 'uni-3', status: 'GOVERNMENT_VERIFIED' },
      ],
      [
        { id: 'project-1', status: 'FIELD_TESTING' },
        { id: 'project-2', status: 'DEPLOYMENT' },
        { id: 'project-3', status: 'COMPLETED' },
        { id: 'project-4', status: 'DRAFT' },
        { id: 'project-5', status: 'DEPLOYMENT_READY' },
        { id: 'project-6', status: 'DEPLOYED' },
      ],
      [
        { id: 'sub-1', status: 'SUBMITTED', governmentReview: { status: 'PENDING' } },
        { id: 'sub-2', status: 'APPROVED', governmentReview: { status: 'APPROVED' } },
        { id: 'sub-3', status: 'DRAFT', governmentReview: { status: 'PENDING' } },
      ],
    );

    expect(summary.totalProblems).toBe(6);
    expect(summary.pendingValidation).toBe(2);
    expect(summary.verifiedProblems).toBe(4);
    expect(summary.routedToIndustry).toBe(3);
    expect(summary.routedToUniversity).toBe(3);
    expect(summary.activeProjects).toBe(5);
    expect(summary.acceptedProjects).toBe(5);
    expect(summary.activeDeployments).toBe(4);
    expect(summary.solutionsAwaitingReview).toBe(1);
  });

  it('builds a real Government action queue from the live records', () => {
    const queue = summarizeGovActionQueue(
      [
        { id: 'p1', title: 'Water contamination', governmentVerificationStatus: 'PENDING', district: 'Ranchi', priority_level: 'HIGH', created_at: '2026-09-10T00:00:00Z' },
        { id: 'p2', title: 'Road safety issue', governmentVerificationStatus: 'VERIFIED', district: 'Dhanbad', priority_level: 'CRITICAL', created_at: '2026-09-11T00:00:00Z' },
        { id: 'p3', title: 'Sanitation backlog', governmentVerificationStatus: 'CLARIFICATION_REQUIRED', district: 'Khunti', priority_level: 'MEDIUM', created_at: '2026-09-12T00:00:00Z' },
      ],
      [
        { id: 'proj-1', title: 'Water test rig', status: 'FIELD_TESTING', updatedAt: '2026-09-08T00:00:00Z' },
        { id: 'proj-2', title: 'Road pilot', status: 'DEPLOYMENT', updatedAt: '2026-09-04T00:00:00Z' },
      ],
      [
        { id: 'sub-1', status: 'SUBMITTED', universityId: 'u-1', projectId: 'proj-1', governmentReview: { status: 'PENDING' } },
      ],
    );

    expect(queue.map(item => item.type)).toEqual(['VALIDATION', 'CLARIFICATION', 'REVIEW', 'DEPLOYMENT']);
    expect(queue[0]).toMatchObject({ title: 'Water contamination', type: 'VALIDATION' });
    expect(queue.find(item => item.type === 'CLARIFICATION')?.title).toBe('Sanitation backlog');
  });

  it('aggregates actual volunteer submitters from canonical problem ownership', () => {
    const rows = summarizeVolunteerContributors([
      {
        id: 'vol-1',
        role: 'VOLUNTEER',
        name: 'Ravi Kumar',
        email: 'ravi@example.com',
        district: 'Ranchi',
        block: 'Angara',
        problems: [
          { id: 'p1', title: 'Unsafe drinking water', district: 'Ranchi', block: 'Angara', updatedAt: '2026-09-26T08:00:00Z', createdAt: '2026-09-20T08:00:00Z' },
          { id: 'p2', title: 'Poor street lighting', district: 'Hazaribagh', block: 'Barhi', updatedAt: '2026-09-25T08:00:00Z', createdAt: '2026-09-18T08:00:00Z' },
        ],
      },
      {
        id: 'citizen-1',
        role: 'CITIZEN',
        name: 'Sunita Devi',
        district: 'Khunti',
        problems: [{ id: 'p3', title: 'Road issue', district: 'Khunti', updatedAt: '2026-09-22T08:00:00Z', createdAt: '2026-09-21T08:00:00Z' }],
      },
      {
        id: 'vol-2',
        role: 'VOLUNTEER',
        name: 'Priya Singh',
        district: 'Deoghar',
        problems: [],
      },
    ] as any);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'vol-1',
      name: 'Ravi Kumar',
      problemsSubmitted: 2,
      location: 'Ranchi, Hazaribagh',
      latestActivity: '2026-09-26T08:00:00Z',
    });
  });
});
