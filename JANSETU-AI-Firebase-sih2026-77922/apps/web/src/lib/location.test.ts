import { describe, expect, it } from 'vitest';
import { deriveLocationFieldsFromGeocode, normalizeJharkhandDistrict } from '@/lib/location';

describe('location geocoding helpers', () => {
  it('matches detected districts to the existing Jharkhand list', () => {
    expect(normalizeJharkhandDistrict('Ranchi District')).toBe('Ranchi');
    expect(normalizeJharkhandDistrict('Angara')).toBe('');
    expect(normalizeJharkhandDistrict('East Singhbhum')).toBe('East Singhbhum');
  });

  it('maps reverse-geocoding responses into the wizard fields', () => {
    const result = deriveLocationFieldsFromGeocode({
      address: {
        state_district: 'Ranchi District',
        county: 'Angara',
        village: 'Hutwa',
        ward: 'Ward 12',
        road: 'Main Road',
        neighbourhood: 'Hanuman Mandir',
      },
      display_name: 'Main Road, Angara, Ranchi, Jharkhand 835103, India',
    });

    expect(result.district).toBe('Ranchi');
    expect(result.block).toBe('Angara');
    expect(result.village).toBe('Hutwa');
    expect(result.ward).toBe('Ward 12');
    expect(result.address).toContain('Main Road');
  });
});
