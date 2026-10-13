import { describe, expect, it } from 'vitest';
import { resolveProblemReporterId } from '@/lib/api';
import { isGovernmentRoutedToIndustry, problemToChallenge } from '@/lib/problems';

describe('resolveProblemReporterId', () => {
  it('uses the canonical problem submitter when a Government clarification is requested', () => {
    expect(resolveProblemReporterId({ createdBy: 'citizen-123', submitted_by: 'volunteer-456' })).toBe('citizen-123');
    expect(resolveProblemReporterId({ submitted_by: 'volunteer-456' })).toBe('volunteer-456');
    expect(resolveProblemReporterId({ submittedBy: 'community-org-1' })).toBe('community-org-1');
  });
});

describe('isGovernmentRoutedToIndustry', () => {
  it('keeps Government-routed Industry records valid only when the route is published or accepted by the organization', () => {
    const publishedIndustry = {
      source: 'firestore',
      isPublished: true,
      governmentVerificationStatus: 'VERIFIED',
      collaborationType: 'INDUSTRY',
      collaborationConfirmedBy: 'gov-1',
      currentStage: 'GOVERNMENT_VERIFIED',
    } as any;

    const assignedIndustry = {
      source: 'firestore',
      isPublished: true,
      governmentVerificationStatus: 'VERIFIED',
      currentStage: 'INDUSTRY_ASSIGNED',
      industryPartnerId: 'org-1',
      industryPartnerName: 'Acme Industry',
    } as any;

    expect(isGovernmentRoutedToIndustry(publishedIndustry)).toBe(true);
    expect(isGovernmentRoutedToIndustry(assignedIndustry)).toBe(true);
    expect(isGovernmentRoutedToIndustry({ source: 'firestore', isPublished: false, governmentVerificationStatus: 'VERIFIED', collaborationType: 'INDUSTRY', collaborationConfirmedBy: 'gov-1' } as any)).toBe(false);
    expect(isGovernmentRoutedToIndustry({ source: 'firestore', governmentVerificationStatus: 'PENDING', collaborationType: 'INDUSTRY' } as any)).toBe(false);
  });
});

describe('deployed problem tracking', () => {
  it('preserves DEPLOYED in the shared Challenge adapter', () => {
    const challenge = problemToChallenge('problem-deployed', {
      title: 'Community water monitoring',
      description: 'Water quality alerts are needed.',
      createdBy: 'citizen-1',
      currentStage: 'DEPLOYED',
      challengeStatus: 'DEPLOYED',
      governmentVerificationStatus: 'VERIFIED',
      isPublished: true,
      evidence: [],
    });

    expect(challenge.currentStage).toBe('DEPLOYED');
    expect(challenge.status).toBe('DEPLOYED');
  });
});
