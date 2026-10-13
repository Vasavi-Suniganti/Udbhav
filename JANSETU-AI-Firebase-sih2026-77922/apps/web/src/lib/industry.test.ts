import { describe, expect, it } from 'vitest';
import {
  industryAcceptedProjects,
  dedupeIndustryCollaborations,
  industryOpenOpportunities,
  industryOrganizationIds,
  industryOrganizationName,
  isAcceptedByIndustry,
  isIndustryRole,
  industryLocation,
  industryProblemText,
  universityCollaborationMatches,
} from '@/lib/industry';
import type { Challenge } from '@/types';

const base = {
  source: 'firestore',
  isPublished: true,
  governmentVerificationStatus: 'VERIFIED',
  collaborationConfirmedBy: 'gov-1',
  collaborationType: 'INDUSTRY',
} as unknown as Challenge;

const challenge = (id: string, extra: Record<string, unknown> = {}) => ({ ...base, id, ...extra }) as Challenge;

describe('industry role + organization scope', () => {
  it('recognises every Industry role variant', () => {
    ['INDUSTRY_PARTNER', 'PARTNER', 'STARTUP', 'MSME', 'CSR_PARTNER', 'RESEARCH_LAB'].forEach(role => expect(isIndustryRole(role)).toBe(true));
    ['CITIZEN', 'VOLUNTEER', 'UNIVERSITY_ADMIN', 'DISTRICT_OFFICER', 'PLATFORM_ADMIN', undefined].forEach(role => expect(isIndustryRole(role as never)).toBe(false));
  });

  it('collects the organization id and keeps the user id as a fallback', () => {
    expect(industryOrganizationIds({ id: 'user-1', organization_id: 'org-9' } as never)).toEqual(['org-9', 'user-1']);
    expect(industryOrganizationIds({ id: 'user-1', organization_id: undefined } as never)).toEqual(['user-1']);
    expect(industryOrganizationIds({ id: 'user-1', organization_id: 'org-9' } as never)).toEqual(['org-9', 'user-1']);
  });

  it('resolves the organization name without inventing one', () => {
    expect(industryOrganizationName({ organization_name: 'ABC Innovations' })).toBe('ABC Innovations');
    expect(industryOrganizationName({ full_name: 'Kiran' })).toBe('Kiran');
    expect(industryOrganizationName(null)).toBe('');
  });
});

describe('canonical Industry project scope', () => {
  const ids = ['org-1'];

  it('only counts challenges this organization accepted', () => {
    expect(isAcceptedByIndustry(challenge('a', { industryPartnerId: 'org-1' }), ids)).toBe(true);
    expect(isAcceptedByIndustry(challenge('b', { industryPartnerId: 'org-2' }), ids)).toBe(false);
    expect(isAcceptedByIndustry(challenge('c'), ids)).toBe(false);
  });

  it('separates accepted projects from still-open opportunities', () => {
    const rows = [
      challenge('accepted-mine', { industryPartnerId: 'org-1' }),
      challenge('taken-other', { industryPartnerId: 'org-2' }),
      challenge('open-one'),
    ];
    expect(industryAcceptedProjects(rows, ids).map(c => c.id)).toEqual(['accepted-mine']);
    expect(industryOpenOpportunities(rows, ids).map(c => c.id)).toEqual(['open-one']);
  });

  it('rejects anything the Government did not route to Industry', () => {
    const unverified = challenge('x', { governmentVerificationStatus: 'PENDING' });
    const university = challenge('y', { collaborationType: 'UNIVERSITY' });
    const unpublished = challenge('z', { isPublished: false });
    const unconfirmed = challenge('w', { collaborationConfirmedBy: '' });
    const local = challenge('v', { source: 'local' });
    expect(industryAcceptedProjects([unverified, university, unpublished, unconfirmed, local].map(c => ({ ...c, industryPartnerId: 'org-1' })), ids)).toEqual([]);
  });

  it('returns nothing when the account has no organization scope', () => {
    expect(industryAcceptedProjects([challenge('a', { industryPartnerId: 'org-1' })], [])).toEqual([]);
    expect(industryOpenOpportunities([challenge('a')], [])).toEqual([]);
  });
});

describe('industry display helpers', () => {
  it('matches university collaborations by canonical, legacy, or requesting-user ownership', () => {
    expect(universityCollaborationMatches({ universityId: 'org-1' }, ['org-1'], 'user-1')).toBe(true);
    expect(universityCollaborationMatches({ organization_id: 'org-1' }, ['org-1'], 'user-1')).toBe(true);
    expect(universityCollaborationMatches({ requestedBy: 'user-1' }, ['org-1'], 'user-1')).toBe(true);
    expect(universityCollaborationMatches({ universityId: 'org-2', requestedBy: 'user-2' }, ['org-1'], 'user-1')).toBe(false);
  });

  it('collapses equivalent collaboration requests but keeps distinct guidance details', () => {
    const request = { requestType: 'GUIDANCE', universityId: 'uni-1', projectId: 'project-1', requestedBy: 'user-1', topic: 'Testing', requestedExpertise: ['QA'], supportTypes: ['Validation'], requirement: 'Review the test plan', status: 'PENDING' };
    const records = dedupeIndustryCollaborations([
      { id: 'duplicate-1', ...request },
      { id: 'duplicate-2', ...request, updatedAt: '2026-09-27T12:00:00Z' },
      { id: 'different', ...request, requirement: 'Review the deployment plan' },
    ]);

    expect(records).toHaveLength(2);
    expect(records.find(record => record.id === 'duplicate-2')).toBeTruthy();
  });

  it('falls back to "Not available" rather than blank values', () => {
    expect(industryLocation({ district: 'Ranchi', block: 'Angara' } as Challenge)).toBe('Ranchi · Angara');
    expect(industryLocation({} as Challenge)).toBe('Not available');
    expect(industryProblemText({ description: '  unsafe water  ' } as Challenge)).toBe('unsafe water');
    expect(industryProblemText({ description: '   ' } as Challenge)).toBe('Not available');
  });
});
