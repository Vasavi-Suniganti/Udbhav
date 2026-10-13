import { describe, expect, it } from 'vitest';
import { analyzeQuestion } from './aiAssistant';
import { buildGovernmentPublishUpdate, buildGovernmentVerificationUpdate, canVerifyProblem, recommendCollaboration } from './problems';
import { buildGovernmentMentorshipRows } from './api';
import type { Challenge } from '@/types';

const problem = (fields: Partial<Challenge>): Challenge => ({
  id: fields.id || 'problem', challenge_code: fields.challenge_code || 'P-1', title: fields.title || 'Problem', description: fields.description || 'Community problem',
  domain: fields.domain || 'Other', issue_type: fields.issue_type || 'GRIEVANCE', status: fields.status || 'PENDING_VALIDATION', priority_score: fields.priority_score || 50,
  priority_level: fields.priority_level || 'MEDIUM', submitted_by: fields.submitted_by || 'citizen-1', submitted_by_name: 'Citizen', district: fields.district || 'Ranchi',
  latitude: fields.latitude, longitude: fields.longitude, universityName: fields.universityName, industryPartnerName: fields.industryPartnerName,
  currentStage: fields.currentStage, progress: fields.progress, created_at: '2026-09-20T00:00:00Z', updated_at: '2026-09-20T00:00:00Z',
});

const records = [
  problem({ id: 'water', title: 'Drinking water contamination', domain: 'Water Resources', priority_level: 'HIGH', priority_score: 80, latitude: 23.37, longitude: 85.33 }),
  problem({ id: 'university', title: 'School science lab shortage', domain: 'Education', priority_level: 'MEDIUM', priority_score: 55, currentStage: 'RESEARCH', description: 'Needs university research support.' }),
  problem({ id: 'industry', title: 'Unsafe road crossing', domain: 'Transport', priority_level: 'CRITICAL', priority_score: 95, industryPartnerName: 'Mobility Labs', district: 'Dhanbad' }),
  problem({ id: 'resolved', title: 'Repaired streetlight', domain: 'Urban Development', status: 'ASSIGNED', currentStage: 'COMPLETED', priority_level: 'LOW', priority_score: 20 }),
] as Challenge[];

describe('JanSamadhan assistant query pipeline', () => {
  it('uses different datasets for overview, university, and industry questions', async () => {
    const overview = await analyzeQuestion('What are the biggest community challenges?', records, 'citizen-1');
    const university = await analyzeQuestion('Which problems need university support?', records, 'citizen-1');
    const industry = await analyzeQuestion('Which problems have industry support?', records, 'citizen-1');

    expect(overview.intent).toBe('COMMUNITY_OVERVIEW');
    expect(overview.matching).toHaveLength(4);
    expect(university.intent).toBe('UNIVERSITY_SUPPORT');
    expect(university.matching.map(item => item.id)).toEqual(['university']);
    expect(industry.intent).toBe('INDUSTRY_SUPPORT');
    expect(industry.matching.map(item => item.id)).toEqual(['industry']);
  });

  it('applies district, category, and priority conditions together', async () => {
    const result = await analyzeQuestion('Show high-priority water problems in Ranchi.', records, 'citizen-1');
    expect(result.intent).toBe('DISTRICT_PROBLEMS');
    expect(result.matching.map(item => item.id)).toEqual(['water']);
  });

  it('sorts near-me records by calculated distance and excludes records without coordinates', async () => {
    const result = await analyzeQuestion('Show problems near me', records, 'citizen-1', { latitude: 23.36, longitude: 85.32 });
    expect(result.intent).toBe('NEAR_ME');
    expect(result.matching.map(item => item.id)).toEqual(['water']);
  });

  it('writes the canonical government verification fields for a verified problem', () => {
    const update = buildGovernmentVerificationUpdate('gov-user-1');
    expect(update.governmentVerificationStatus).toBe('VERIFIED');
    expect(update.governmentVerifiedBy).toBe('gov-user-1');
    expect(update.currentStage).toBe('GOVERNMENT_VERIFIED');
    expect(update.status).toBe('VALIDATED');
    expect(update.governmentVerifiedAt).toBeDefined();
    expect(update.verifiedBy).toBe('gov-user-1');
  });

  it('allows only government roles to verify a problem', () => {
    expect(canVerifyProblem('GOVERNMENT_OFFICER')).toBe(true);
    expect(canVerifyProblem('CITIZEN')).toBe(false);
    expect(canVerifyProblem('GOVERNMENT')).toBe(true);
  });

  it('builds mentor monitoring rows from real project and mentor metadata', () => {
    const projects = [
      {
        id: 'project-1',
        projectName: 'Water Quality Sensor',
        title: 'Water Quality Sensor',
        universityName: 'BIT Mesra',
        facultyMentorName: 'Dr. Rajesh Kumar',
        industryPartnerName: 'AquaWorks',
        industryMentorName: 'Meera Singh',
        currentPhase: 'PROTOTYPING',
        status: 'PROTOTYPING',
        progress: 64,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-20T00:00:00Z',
      },
      {
        id: 'project-2',
        projectName: 'Solar Microgrid',
        title: 'Solar Microgrid',
        universityName: 'NIT Jamshedpur',
        facultyMentorName: '',
        industryPartnerName: '',
        currentPhase: 'SOLUTION_DEVELOPMENT',
        status: 'SOLUTION_DEVELOPMENT',
        progress: 28,
        createdAt: '2026-09-10T00:00:00Z',
        updatedAt: '2026-09-18T00:00:00Z',
      },
    ];

    const rows = buildGovernmentMentorshipRows(projects, [{ projectId: 'project-1', agenda: 'Prototype review' }]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      projectId: 'project-1',
      facultyMentorName: 'Dr. Rajesh Kumar',
      industryPartnerName: 'AquaWorks',
      industryMentorName: 'Meera Singh',
      meetingCount: 1,
      attentionRequired: false,
    });
    expect(rows[1]).toMatchObject({
      projectId: 'project-2',
      facultyMentorName: 'Faculty mentor pending',
      attentionRequired: true,
    });
  });

  it('routes published energy challenges to university and industry', () => {
    const recommendation = recommendCollaboration({ title: 'Lack of Street Lighting', category: 'Energy', description: 'Solar street lights with IoT monitoring are needed.' });
    expect(recommendation.aiRecommendedCollaboration).toBe('UNIVERSITY_AND_INDUSTRY');
    expect(recommendation.aiSuggestedUniversityDomain).toContain('Electrical Engineering');
    expect(recommendation.aiSuggestedIndustryDomain).toContain('Solar Energy');
    const update = buildGovernmentPublishUpdate('gov-user-1', { title: 'Lack of Street Lighting', category: 'Energy', description: 'Solar street lights' });
    expect(update.isPublished).toBe(true);
    expect(update.challengeStatus).toBe('OPEN');
    expect(update.publishedBy).toBe('gov-user-1');
  });
});
