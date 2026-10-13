// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IndustryCollaborationsPage, IndustryMentorWorkspace, PrototypeReviewPage } from '@/components/dashboard/pages/IndustryPages';

const mocks = vi.hoisted(() => ({
  profile: { id: 'user-1', organization_id: 'org-1', full_name: 'Kiran', role: 'INDUSTRY_PARTNER', organization_name: 'ABC Innovations' } as any,
  challenges: [] as any[],
  mentorships: [] as any[],
  meetings: [] as any[],
  reviews: [] as any[],
  collaborations: [] as any[],
  updateMentorshipStatus: vi.fn(async (_row: any, _status: any) => undefined),
  createMentorMeeting: vi.fn(async (_input: any) => undefined),
  createIndustryPrototypeReview: vi.fn(async (_input: any) => undefined),
  acceptIndustryGuidance: vi.fn(async (id: string) => ({ id, industryPartnerId: 'org-1', industryPartnerName: 'ABC Innovations', status: 'ACCEPTED', mentorStatus: 'ASSIGNED' })),
  updateToast: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: mocks.profile }) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ show: mocks.updateToast }) }));
vi.mock('@/context/PlatformContext', () => ({ usePlatform: () => ({ challenges: mocks.challenges, loading: false, error: null }) }));
vi.mock('@/lib/api', () => ({ api: { industryCollaborations: vi.fn(async () => mocks.collaborations), acceptIndustryGuidance: mocks.acceptIndustryGuidance } }));
vi.mock('@/lib/industry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/industry')>('@/lib/industry');
  return {
    ...actual,
    subscribeToIndustryMentorships: (_ids: string[], onChange: (r: any[]) => void) => { onChange(mocks.mentorships); return () => undefined; },
    subscribeToIndustryCollaborations: (onChange: (r: any[]) => void) => { onChange(mocks.collaborations); return () => undefined; },
    subscribeToIndustryMentorMeetings: (_ids: string[], onChange: (r: any[]) => void) => { onChange(mocks.meetings); return () => undefined; },
    subscribeToIndustryPrototypeReviews: (_ids: string[], onChange: (r: any[]) => void) => { onChange(mocks.reviews); return () => undefined; },
    updateMentorshipStatus: mocks.updateMentorshipStatus,
    createMentorMeeting: mocks.createMentorMeeting,
    createIndustryPrototypeReview: mocks.createIndustryPrototypeReview,
  };
});

const routed = (id: string, extra: Record<string, unknown> = {}) => ({
  id, title: `Challenge ${id}`, description: `Problem ${id}`,
  source: 'firestore', isPublished: true, governmentVerificationStatus: 'VERIFIED',
  collaborationConfirmedBy: 'gov-1', collaborationType: 'INDUSTRY', district: 'Ranchi',
  ...extra,
} as any);

// A, B, C routed. This org accepted B and C. D belongs to another organization.
const setup = () => {
  mocks.challenges = [
    routed('A'), routed('B', { industryPartnerId: 'org-1', industryPartnerName: 'ABC Innovations' }),
    routed('C', { industryPartnerId: 'org-1' }), routed('D', { industryPartnerId: 'org-2' }),
  ];
};

beforeEach(() => {
  setup();
  mocks.mentorships = []; mocks.meetings = []; mocks.reviews = []; mocks.collaborations = [];
  mocks.updateMentorshipStatus.mockClear(); mocks.createMentorMeeting.mockClear();
  mocks.createIndustryPrototypeReview.mockClear(); mocks.updateToast.mockClear();
});
afterEach(() => cleanup());

const mentorship = (id: string, challengeId: string, status: string) => ({
  id, challengeId, challengeTitle: `Challenge ${challengeId}`, status,
  requestedExpertise: ['IoT'], message: '', organizationId: 'org-1', organizationName: 'ABC', ownerId: 'user-1',
});

describe('Industry Mentorship', () => {
  it("lists only this organization's accepted projects and never auto-selects one", () => {
    mocks.mentorships = [mentorship('m1', 'B', 'ACCEPTED')];
    render(<IndustryMentorWorkspace onNavigate={vi.fn()} />);
    expect(screen.getByText('Challenge B')).toBeTruthy();
    expect(screen.queryByText('Challenge D')).toBeNull();
    // The schedule form stays inert until the user picks a record.
    expect(screen.queryByLabelText('Agenda')).toBeNull();
  });

  it('schedules against the selected record, never the first one', async () => {
    mocks.mentorships = [mentorship('m1', 'B', 'ACCEPTED'), mentorship('m2', 'C', 'ACCEPTED')];
    render(<IndustryMentorWorkspace onNavigate={vi.fn()} />);
    fireEvent.click(screen.getAllByText('Challenge C')[0]);
    await waitFor(() => expect(screen.getByLabelText('Agenda')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Session date and time'), { target: { value: '2026-10-01T10:00' } });
    fireEvent.change(screen.getByLabelText('Agenda'), { target: { value: 'Review sensor casing' } });
    fireEvent.click(screen.getByText('Schedule session'));
    await waitFor(() => expect(mocks.createMentorMeeting).toHaveBeenCalledTimes(1));
    expect(mocks.createMentorMeeting.mock.calls[0][0]).toMatchObject({ mentorshipId: 'm2', challengeId: 'C' });
  });

  it('persists a mentorship status change', async () => {
    mocks.mentorships = [mentorship('m1', 'B', 'PENDING')];
    render(<IndustryMentorWorkspace onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByText('Accept'));
    await waitFor(() => expect(mocks.updateMentorshipStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), 'ACCEPTED'));
  });
});

describe('Industry Prototype Reviews', () => {
  it("shows this organization's projects only", () => {
    render(<PrototypeReviewPage onNavigate={vi.fn()} />);
    const options = screen.getAllByRole('option').map(option => option.textContent);
    expect(options).toContain('Challenge B');
    expect(options).toContain('Challenge C');
    expect(options).not.toContain('Challenge D');
  });

  it('blocks submission until the user picks a project', () => {
    render(<PrototypeReviewPage onNavigate={vi.fn()} />);
    expect((screen.getByText('Submit review') as HTMLButtonElement).disabled).toBe(true);
  });

  it('writes the review against the chosen project', async () => {
    render(<PrototypeReviewPage onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Select one of your accepted projects'), { target: { value: 'C' } });
    fireEvent.change(screen.getByPlaceholderText('What should the team fix before the next stage?'), { target: { value: 'Casing needs reinforcement' } });
    fireEvent.click(screen.getByText('Submit review'));
    await waitFor(() => expect(mocks.createIndustryPrototypeReview).toHaveBeenCalledTimes(1));
    expect(mocks.createIndustryPrototypeReview.mock.calls[0][0]).toMatchObject({ challengeId: 'C', organizationId: 'org-1', feedback: 'Casing needs reinforcement' });
  });

  it('shows an empty state when nothing has been accepted yet', () => {
    mocks.challenges = [routed('A')];
    render(<PrototypeReviewPage onNavigate={vi.fn()} />);
    expect(screen.getByText('No projects to review')).toBeTruthy();
  });
});

describe('Industry Collaborations', () => {
  it("shows only collaborations belonging to this organization", async () => {
    mocks.collaborations = [
      { id: 'c1', industryPartnerId: 'org-1', universityName: 'Ranchi University', projectId: 'B', challengeId: 'B', status: 'ACTIVE' },
      { id: 'c2', industryPartnerId: 'org-2', universityName: 'Other University', projectId: 'D', status: 'PENDING' },
    ];
    render(<IndustryCollaborationsPage onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Ranchi University')).toBeTruthy());
    expect(screen.queryByText('Other University')).toBeNull();
  });

  it('accepts an unassigned guidance request and reflects its new status', async () => {
    mocks.acceptIndustryGuidance.mockClear();
    mocks.collaborations = [{ id: 'guidance-1', requestType: 'GUIDANCE', status: 'PENDING', universityName: 'Ranchi University', projectId: 'project-1', projectName: 'Water monitoring', requirement: 'Review the sensor design' }];
    render(<IndustryCollaborationsPage onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Ranchi University')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Accept guidance request' }));

    await waitFor(() => expect(mocks.acceptIndustryGuidance).toHaveBeenCalledWith('guidance-1'));
    await waitFor(() => expect(screen.getByText('ACCEPTED')).toBeTruthy());
  });
});

