// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IndustryCommandCentre } from './RoleDashboards';

const mocks = vi.hoisted(() => ({
  profile: { id: 'industry-user', organization_id: 'industry-org', organization_name: 'Green Systems' } as any,
  challenges: [] as any[],
  projects: [] as any[],
  collaborations: [] as any[],
  mentorships: [] as any[],
  meetings: [] as any[],
  reviews: [] as any[],
  updateMentorshipStatus: vi.fn(async (_request: any, _status: string) => undefined),
  show: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: mocks.profile }) }));
vi.mock('@/context/PlatformContext', () => ({ usePlatform: () => ({ challenges: mocks.challenges, projects: mocks.projects, loading: false, error: null }) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ show: mocks.show }) }));
vi.mock('@/lib/api', () => ({ api: { industryCollaborations: vi.fn(async () => mocks.collaborations) } }));
vi.mock('@/lib/industry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/industry')>('@/lib/industry');
  return {
    ...actual,
    subscribeToIndustryMentorships: (_ids: string[], onChange: (rows: any[]) => void) => { onChange(mocks.mentorships); return () => undefined; },
    subscribeToIndustryMentorMeetings: (_ids: string[], onChange: (rows: any[]) => void) => { onChange(mocks.meetings); return () => undefined; },
    subscribeToIndustryPrototypeReviews: (_ids: string[], onChange: (rows: any[]) => void) => { onChange(mocks.reviews); return () => undefined; },
    updateMentorshipStatus: mocks.updateMentorshipStatus,
  };
});

const challenge = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  source: 'firestore',
  title: id === 'open-1' ? 'Rural water monitoring' : 'Solar street lighting',
  description: 'Verified community challenge',
  domain: id === 'open-1' ? 'Water and Environment' : 'Infrastructure',
  status: 'OPEN_FOR_INSTITUTIONS',
  priority_score: 80,
  priority_level: 'HIGH',
  submitted_by: 'citizen-1',
  submitted_by_name: 'Citizen',
  district: 'Ranchi',
  challenge_code: id,
  issue_type: 'INNOVATION_OPPORTUNITY',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  currentStage: 'GOVERNMENT_VERIFIED',
  governmentVerificationStatus: 'VERIFIED',
  collaborationType: 'INDUSTRY',
  collaborationConfirmedBy: 'government-user',
  isPublished: true,
  aiRequiredExpertise: ['IoT', 'Data Analytics'],
  ...extra,
} as any);

function setup() {
  mocks.challenges = [challenge('open-1'), challenge('active-1', {
    industryPartnerId: 'industry-org',
    universityName: 'CMR Institute of Technology',
    studentTeamName: 'Water Systems Team',
  })];
  mocks.projects = [{
    id: 'project-1', challenge_id: 'active-1', title: 'Rural water monitoring prototype',
    status: 'PROTOTYPING', progress: 68, organization_name: 'CMR Institute of Technology',
    teamName: 'Water Systems Team', industryMentorName: 'Asha Rao',
  } as any];
  mocks.collaborations = [{
    id: 'collaboration-1', industryPartnerId: 'industry-org', challengeId: 'active-1', projectId: 'project-1',
    status: 'ACTIVE', universityName: 'CMR Institute of Technology', teamName: 'Water Systems Team',
    industryMentorName: 'Asha Rao', requestedExpertise: ['IoT', 'Data Analytics'], progress: 68,
  }];
  mocks.mentorships = [{
    id: 'mentorship-1', challengeId: 'active-1', challengeTitle: 'Solar street lighting',
    organizationId: 'industry-org', organizationName: 'Green Systems', requestedExpertise: ['Renewable Energy'],
    message: 'Please review the controller design.', status: 'PENDING', ownerId: 'university-user', createdAt: '2026-09-20T00:00:00.000Z',
  }];
  mocks.meetings = [{
    id: 'meeting-1', mentorshipId: 'mentorship-1', challengeId: 'active-1', organizationId: 'industry-org',
    agenda: 'Prototype review', scheduledAt: new Date(Date.now() + 86400000).toISOString(), durationMinutes: 45,
    meetingUrl: 'https://meet.example.test/session', ownerId: 'industry-user',
  }];
  mocks.reviews = [{ id: 'review-1', challengeId: 'active-1' }];
}

beforeEach(() => {
  setup();
  mocks.updateMentorshipStatus.mockClear();
  mocks.show.mockClear();
});
afterEach(() => cleanup());

describe('Industry command centre', () => {
  it('shows real opportunity, collaboration, mentorship and supported-solution counts', async () => {
    render(<IndustryCommandCentre onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Collaboration Opportunities')).toBeTruthy());
    expect(screen.getByText('Open Opportunities')).toBeTruthy();
    expect(screen.getAllByText('Active Collaborations')).toHaveLength(2);
    expect(screen.getAllByText('Mentorship Requests')).toHaveLength(2);
    expect(screen.getByText('Solutions Supported')).toBeTruthy();
    expect([...document.querySelectorAll('.industry-metric strong')].map(node => node.textContent)).toEqual(['1', '1', '1', '1']);
    expect(screen.getByText('Rural water monitoring')).toBeTruthy();
    expect(screen.getAllByText(/Reported 1 Sept 2026/)).toHaveLength(2);
    expect(screen.getAllByText('CMR Institute of Technology').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Asha Rao').length).toBeGreaterThan(0);
    expect(screen.getAllByText('68%').length).toBeGreaterThan(0);
    expect(screen.getByText('Upcoming Meetings')).toBeTruthy();
  });

  it('updates a pending mentorship through the existing Firestore operation before success feedback', async () => {
    render(<IndustryCommandCentre onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(mocks.updateMentorshipStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 'mentorship-1' }), 'ACCEPTED'));
    expect(mocks.show).toHaveBeenCalledWith('Mentorship request accepted.', 'success');
  });

  it('does not introduce unrelated corporate metrics or sample opportunities', async () => {
    render(<IndustryCommandCentre onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Collaboration Opportunities')).toBeTruthy());
    expect(screen.queryByText(/revenue|sales|employees|company growth/i)).toBeNull();
    expect(screen.queryByText('Smart Waste Management')).toBeNull();
  });
});