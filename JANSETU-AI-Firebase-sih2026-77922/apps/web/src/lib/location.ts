import { JHARKHAND_DISTRICTS } from '@/data/demo';

export interface ReverseGeocodeResult {
  district: string;
  block: string;
  village: string;
  ward: string;
  address: string;
  outsideJharkhand: boolean;
}

export function normalizeJharkhandDistrict(rawValue?: string | null): string {
  const value = (rawValue ?? '').trim();
  if (!value) return '';

  const normalized = value.replace(/\bDistrict\b/gi, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const match = JHARKHAND_DISTRICTS.find((district) => {
    const districtName = district.name.toLowerCase().replace(/\bDistrict\b/gi, '').replace(/\s+/g, ' ').trim();
    return districtName === normalized || district.name.toLowerCase() === value.toLowerCase().trim();
  });

  return match?.name || '';
}

export function normalizeReverseGeocodeResult(payload?: any) {
  const address = payload?.address ?? {};
  const district = normalizeJharkhandDistrict(address.state_district || address.district || address.county || address.state);
  const block = String(address.block || address.subdistrict || address.city_district || address.municipality || address.county || '').trim();
  const village = String(address.village || address.hamlet || address.town || address.city || address.locality || '').trim();
  const ward = String(address.ward || address.neighbourhood || address.suburb || address.quarter || '').trim();
  const displayName = String(payload?.display_name || '').trim();
  const fallbackAddress = [
    address.road,
    address.neighbourhood,
    village || block || ward,
    district || address.state_district || address.district || address.state,
  ].filter(Boolean).join(', ');

  return {
    district: district || '',
    block: block || '',
    village: village || '',
    ward: ward || '',
    address: displayName || fallbackAddress,
  };
}

export function deriveLocationFieldsFromGeocode(payload?: any): ReverseGeocodeResult {
  const normalized = normalizeReverseGeocodeResult(payload);
  const stateName = String(payload?.address?.state || '').trim();
  const outsideJharkhand = Boolean(stateName) && !/jharkhand/i.test(stateName) && !normalized.district;

  return {
    district: normalized.district,
    block: normalized.block,
    village: normalized.village,
    ward: normalized.ward,
    address: normalized.address,
    outsideJharkhand,
  };
}

export async function reverseGeocodeLocation(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}&zoom=18&addressdetails=1`,
    {
      headers: {
        'Accept-Language': 'en',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Reverse geocoding failed.');
  }

  const data = await response.json();
  return deriveLocationFieldsFromGeocode(data);
}
