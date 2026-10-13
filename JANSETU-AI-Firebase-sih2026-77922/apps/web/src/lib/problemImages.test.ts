import { describe, expect, it } from 'vitest';
import { getProblemFallbackImage, getProblemImage } from './problemImages';
import type { Challenge } from '@/types';

function challenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'problem-1',
    challenge_code: 'JH-1',
    title: 'Unspecified local issue',
    description: '',
    domain: 'Other',
    issue_type: 'INNOVATION_OPPORTUNITY',
    status: 'SUBMITTED',
    priority_score: 0,
    priority_level: 'LOW',
    submitted_by: 'citizen-1',
    submitted_by_name: 'Citizen',
    district: 'Ranchi',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('problem images', () => {
  it('prefers an actual Firebase evidence image URL', () => {
    const url = 'https://firebasestorage.googleapis.com/v0/b/app/o/evidence%2Ftap.jpg?alt=media';
    expect(getProblemImage(challenge({ evidence_urls: [url] }))).toBe(url);
  });

  it('replaces a saved stock image URL with a description-matched image', () => {
    const url = 'https://firebasestorage.googleapis.com/v0/b/app/o/problem-media?alt=media&token=abc';
    expect(getProblemImage(challenge({ title: 'Broken village hand pump', imageUrl: url })))
      .toContain('photo-1723156716505-fefc66dfabc6');
  });

  it('matches the specific title before broader description terms', () => {
    const streetLights = getProblemFallbackImage(challenge({
      title: 'Several streets in our village do not have proper street lights',
      description: 'The roads become dark after sunset, making travel unsafe.',
    }));
    expect(streetLights).toContain('photo-1688124968558-974cf707348b');
  });

  it('matches title and category to distinct fallbacks', () => {
    const water = getProblemFallbackImage(challenge({ title: 'Broken village hand pump' }));
    const school = getProblemFallbackImage(challenge({ domain: 'Education', title: 'Classroom roof leak' }));
    expect(water).not.toBe(school);
    expect(water).toContain('photo-1723156716505-fefc66dfabc6');
  });

  it('uses a neutral civic fallback when no topic matches', () => {
    expect(getProblemFallbackImage(challenge())).toBe('/assets/jharkhand-community-hero.jpg');
  });
});