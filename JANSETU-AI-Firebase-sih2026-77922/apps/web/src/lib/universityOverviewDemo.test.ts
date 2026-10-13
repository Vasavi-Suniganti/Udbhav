import { describe, expect, it } from 'vitest';
import { buildDemoUniversityOverview, demoUniversityIdForUser } from './universityOverviewDemo';

describe('university overview demo data', () => {
  it('resolves an unlinked university admin to the Birla demo organization', () => {
    expect(demoUniversityIdForUser({ role: 'UNIVERSITY_ADMIN' })).toBe('org-bit-mesra');
    expect(demoUniversityIdForUser({ role: 'CITIZEN' })).toBe('');
  });

  it('preserves an explicitly linked organization', () => {
    expect(demoUniversityIdForUser({ role: 'UNIVERSITY_ADMIN', organization_id: 'org-nit-jamshedpur' }))
      .toBe('org-nit-jamshedpur');
  });

  it('returns only Birla projects and their related dashboard records', () => {
    const overview = buildDemoUniversityOverview('org-bit-mesra');

    expect(overview.university.name).toBe('Birla Institute of Technology, Mesra');
    expect(overview.projects).toHaveLength(1);
    expect(overview.projects[0].id).toBe('proj-001');
    expect(overview.teams).toHaveLength(1);
    expect(overview.challenges.map(challenge => challenge.id)).toEqual(['ch-001']);
    expect(overview.submissions).toHaveLength(1);
    expect(overview.milestones.length).toBeGreaterThan(0);
    expect(overview.impactRecords.every(record => record.verified === false)).toBe(true);
  });

  it('does not borrow Birla data for another organization', () => {
    const overview = buildDemoUniversityOverview('org-nit-jamshedpur');

    expect(overview.projects.map(project => project.id)).toEqual(['proj-002']);
    expect(overview.challenges.map(challenge => challenge.id)).toEqual(['ch-005']);
  });
});