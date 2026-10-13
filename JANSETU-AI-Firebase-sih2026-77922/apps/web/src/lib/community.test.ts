import { describe, expect, it } from 'vitest';
import { projectVisibilityMatches, summarizeCommunitySignals } from '@/lib/api';

describe('community signal summaries', () => {
  it('counts unique supporters and affected users for the selected problem', () => {
    const signals = [
      { id: 'signal-1', userId: 'user-1', type: 'SUPPORT' },
      { id: 'signal-2', userId: 'user-2', type: 'SUPPORT' },
      { id: 'signal-3', userId: 'user-3', type: 'AFFECTED' },
      { id: 'signal-4', userId: 'user-3', type: 'AFFECTED' },
      { id: 'signal-5', userId: 'user-4', type: 'AFFECTED' },
      { id: 'signal-6', userId: 'user-5', type: 'INCORRECT_REPORT' },
      { id: 'signal-7', userId: 'user-5', type: 'INCORRECT_REPORT' },
      { id: 'signal-8', userId: 'user-1', type: 'AFFECTED' },
    ];

    const summary = summarizeCommunitySignals(signals, 'user-1');

    expect(summary.supporters).toBe(2);
    expect(summary.affectedConfirmations).toBe(3);
    expect(summary.incorrectReports).toBe(1);
    expect(summary.mySignals.map((signal: any) => signal.type)).toEqual(['SUPPORT', 'AFFECTED']);
  });
});

describe('project visibility scope', () => {
  it('keeps live projects visible when a user does not yet have a university scope', () => {
    expect(projectVisibilityMatches({ universityId: 'u-123' }, {})).toBe(true);
    expect(projectVisibilityMatches({ universityId: 'u-456' }, { organizationId: 'u-123' })).toBe(false);
    expect(projectVisibilityMatches({ universityId: 'u-123' }, { organizationId: 'u-123' })).toBe(true);
    expect(projectVisibilityMatches({ universityId: 'u-456' }, {})).toBe(true);
  });
});
