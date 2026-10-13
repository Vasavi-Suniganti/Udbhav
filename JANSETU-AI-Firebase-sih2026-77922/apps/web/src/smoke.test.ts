import {describe,expect,it} from 'vitest';
import {
  JHARKHAND_DISTRICTS,
  DEMO_CHALLENGES,
  DEMO_PROJECTS,
  DEMO_SOLUTIONS,
  DEMO_CLUSTERS,
  DEMO_IMPACT_METRICS,
  DEMO_COMMUNITY_FEEDBACK,
  DEMO_PROPOSAL,
  ORGANIZATIONS,
  DEMO_FACULTY,
  DEMO_STUDENTS,
  DEMO_NOTIFICATIONS,
} from '@/data/demo';
import { api } from '@/lib/api';
import {
  challengeFromApi,
  projectFromApi,
  solutionFromApi,
  clusterFromApi,
  impactFromApi,
  feedbackFromApi,
  notificationFromApi,
} from '@/lib/adapters';
import { normalizeReverseGeocodeResult } from '@/lib/location';

describe('JANSETU web domain fixtures & static demo data',()=>{
  it('ships Jharkhand district master data for the challenge wizard',()=>{
    expect(JHARKHAND_DISTRICTS.length).toBeGreaterThanOrEqual(24);
    expect(JHARKHAND_DISTRICTS.some(d=>d.name==='Ranchi')).toBe(true);
  });

  it('provides all static datasets locally in data/demo.ts', () => {
    expect(DEMO_CHALLENGES.length).toBeGreaterThan(0);
    expect(DEMO_PROJECTS.length).toBeGreaterThan(0);
    expect(DEMO_SOLUTIONS.length).toBeGreaterThan(0);
    expect(DEMO_CLUSTERS.length).toBeGreaterThan(0);
    expect(DEMO_IMPACT_METRICS.length).toBeGreaterThan(0);
    expect(DEMO_COMMUNITY_FEEDBACK.length).toBeGreaterThan(0);
    expect(ORGANIZATIONS.length).toBeGreaterThan(0);
    expect(DEMO_FACULTY.length).toBeGreaterThan(0);
    expect(DEMO_STUDENTS.length).toBeGreaterThan(0);
    expect(DEMO_NOTIFICATIONS.length).toBeGreaterThan(0);
    expect(DEMO_PROPOSAL.id).toBe('prop-001');
  });

  it('serves static data from api client without network calls', async () => {
    const challenges = await api.challenges();
    expect(challenges.length).toBe(DEMO_CHALLENGES.length);
    expect(challenges[0].title).toBeDefined();

    const projects = await api.projects();
    expect(projects.length).toBe(DEMO_PROJECTS.length);

    const projectBundle = await api.project(projects[0].id);
    expect(projectBundle.project).toBeDefined();
    expect(projectBundle.tasks.length).toBeGreaterThan(0);
    expect(projectBundle.milestones.length).toBeGreaterThan(0);
    expect(projectBundle.impact.length).toBeGreaterThan(0);
    expect(projectBundle.feedback.length).toBeGreaterThan(0);
    expect(projectBundle.proposal).toBeDefined();

    const solutions = await api.solutions();
    expect(solutions.length).toBe(DEMO_SOLUTIONS.length);

    const universities = await api.universities();
    expect(universities.length).toBeGreaterThan(0);
    expect(universities.every((u: any) => u.type === 'UNIVERSITY')).toBe(true);

    const faculty = await api.faculty();
    expect(faculty.length).toBe(DEMO_FACULTY.length);

    const students = await api.students();
    expect(students.length).toBe(DEMO_STUDENTS.length);

    const stats = await api.stats();
    expect(stats.challenges).toBe(DEMO_CHALLENGES.length);
    expect(stats.projects).toBe(DEMO_PROJECTS.length);
  });

  it('normalizes reverse-geocoded location results into the wizard fields', () => {
    const result = normalizeReverseGeocodeResult({
      display_name: 'Hutwa, Angara Block, Ranchi District, Jharkhand, India',
      address: {
        state: 'Jharkhand',
        state_district: 'Ranchi',
        city_district: 'Angara',
        village: 'Hutwa',
        suburb: 'Ward 3',
      },
    });

    expect(result.district).toBe('Ranchi');
    expect(result.block).toBe('Angara');
    expect(result.village).toBe('Hutwa');
    expect(result.ward).toBe('Ward 3');
    expect(result.address).toContain('Hutwa');
  });

  it('adapts static models correctly via adapters', () => {
    const adaptedChallenge = challengeFromApi(DEMO_CHALLENGES[0]);
    expect(adaptedChallenge.id).toBe(DEMO_CHALLENGES[0].id);
    expect(adaptedChallenge.title).toBe(DEMO_CHALLENGES[0].title);
    expect(adaptedChallenge.priority_score).toBe(DEMO_CHALLENGES[0].priority_score);

    const adaptedProject = projectFromApi(DEMO_PROJECTS[0]);
    expect(adaptedProject.id).toBe(DEMO_PROJECTS[0].id);
    expect(adaptedProject.title).toBe(DEMO_PROJECTS[0].title);
    expect(adaptedProject.tasks?.length).toBeGreaterThan(0);

    const adaptedSolution = solutionFromApi(DEMO_SOLUTIONS[0]);
    expect(adaptedSolution.id).toBe(DEMO_SOLUTIONS[0].id);

    const adaptedCluster = clusterFromApi(DEMO_CLUSTERS[0]);
    expect(adaptedCluster.id).toBe(DEMO_CLUSTERS[0].id);

    const adaptedImpact = impactFromApi(DEMO_IMPACT_METRICS[0]);
    expect(adaptedImpact.id).toBe(DEMO_IMPACT_METRICS[0].id);

    const adaptedFeedback = feedbackFromApi(DEMO_COMMUNITY_FEEDBACK[0]);
    expect(adaptedFeedback.id).toBe(DEMO_COMMUNITY_FEEDBACK[0].id);

    const adaptedNotification = notificationFromApi(DEMO_NOTIFICATIONS[0]);
    expect(adaptedNotification.id).toBe(DEMO_NOTIFICATIONS[0].id);
  });
});
