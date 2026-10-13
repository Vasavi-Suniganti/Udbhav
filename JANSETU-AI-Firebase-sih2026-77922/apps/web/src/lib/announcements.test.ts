import { describe, expect, it } from 'vitest';

import { buildAnnouncementAudienceUsers, normalizeAnnouncementRecord } from '@/lib/api';

describe('government announcement pipeline', () => {
  it('keeps the audience limited to active platform roles that should receive government announcements', () => {
    const audience = buildAnnouncementAudienceUsers([
      { id: 'u-1', role: 'CITIZEN' },
      { id: 'u-2', role: 'VOLUNTEER' },
      { id: 'u-3', role: 'STUDENT' },
      { id: 'u-4', role: 'INDUSTRY_PARTNER' },
      { id: 'u-5', role: 'GOVERNMENT_OFFICER' },
      { id: 'u-6', role: 'ADMIN' },
    ]);

    expect(audience.map((user) => user.id)).toEqual(['u-1', 'u-2', 'u-3', 'u-4', 'u-5']);
  });

  it('normalizes announcement data and preserves the announcement id on notification payloads', () => {
    const announcement = normalizeAnnouncementRecord({
      title: 'Community Innovation Workshop',
      body: 'Government is organizing a workshop for innovators.',
      category: 'GENERAL',
      publishedAt: undefined,
      active: true,
    }, 'ann-42');

    expect(announcement.id).toBe('ann-42');
    expect(announcement.title).toBe('Community Innovation Workshop');
    expect(announcement.body).toContain('workshop');
    expect(announcement.category).toBe('GENERAL');
    expect(announcement.publishedAt).toBeTruthy();
  });
});
