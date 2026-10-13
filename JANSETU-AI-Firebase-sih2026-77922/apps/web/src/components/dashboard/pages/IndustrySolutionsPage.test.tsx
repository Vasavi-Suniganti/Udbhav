// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import IndustrySolutionsPage from '@/components/dashboard/pages/IndustrySolutionsPage';

const mocks = vi.hoisted(() => ({
  challenges: [] as any[],
  solutions: [] as any[],
  reviews: {} as Record<string, any>,
  show: vi.fn(),
  saveIndustrySolution: vi.fn(async (input: any) => ({ ...input, id: 'sol-new' })),
}));

vi.mock('@/lib/firebase', () => ({ db: undefined, auth: undefined, firebaseEnabled: false }));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'user-1', full_name: 'Asha Verma', organization_id: 'org-1', role: 'INDUSTRY_PARTNER' } }),
}));

vi.mock('@/context/PlatformContext', () => ({
  usePlatform: () => ({ challenges: mocks.challenges, loading: false, error: null }),
}));

vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ show: mocks.show }) }));

vi.mock('@/lib/solutions', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/solutions')>();
  return {
    ...actual,
    subscribeToIndustrySolutions: (_ids: string[], onChange: (items: any[]) => void) => {
      onChange(mocks.solutions);
      return () => undefined;
    },
    subscribeToIndustrySolutionReviews: (_ids: string[], onChange: (items: Record<string, any>) => void) => {
      onChange(mocks.reviews);
      return () => undefined;
    },
    saveIndustrySolution: mocks.saveIndustrySolution,
  };
});

const routedChallenge = {
  id: 'problem-1',
  challenge_code: 'PR-1',
  title: 'Smart Waste Management',
  description: 'Inefficient waste collection affecting local residents.',
  domain: 'Waste Management',
  district: 'Ranchi',
  block: 'Angara',
  source: 'firestore',
  isPublished: true,
  governmentVerificationStatus: 'VERIFIED',
  collaborationConfirmedBy: 'gov-1',
  collaborationType: 'INDUSTRY',
  industryPartnerId: 'org-1',
  industryPartnerName: 'ABC Innovations',
  currentStage: 'INDUSTRY_ASSIGNED',
  progress: 20,
  publishedAt: '2026-09-01T00:00:00Z',
  created_at: '2026-09-01T00:00:00Z',
  aiRequiredExpertise: ['Waste systems'],
};

const storedSolution = {
  id: 'sol-1',
  challengeId: 'problem-1',
  projectId: 'problem-1',
  organizationId: 'org-1',
  organizationName: 'ABC Innovations',
  challengeTitle: 'Smart Waste Management',
  problem: 'Inefficient waste collection affecting local residents.',
  title: 'Route optimisation platform',
  solution: 'AI-assisted waste collection routing.',
  approach: 'IoT bins + routing model',
  expectedImpact: '30% fewer missed pickups',
  domains: ['Waste Management'],
  districts: ['Ranchi'],
  estimatedFunding: 500000,
  progress: 35,
  prototypeStatus: 'IN_PROGRESS',
  testingStatus: 'NOT_STARTED',
  implementationStatus: 'NOT_STARTED',
  deploymentStatus: 'NOT_STARTED',
  createdBy: 'user-1',
};

describe('Industry solutions page', () => {
  beforeEach(() => {
    mocks.challenges = [routedChallenge];
    mocks.solutions = [];
    mocks.reviews = {};
    mocks.show.mockReset();
    mocks.saveIndustrySolution.mockClear();
  });

  afterEach(cleanup);

  it('shows the original problem and the stored solution for an accepted challenge', () => {
    mocks.solutions = [storedSolution];
    render(<IndustrySolutionsPage onNavigate={vi.fn()} />);

    expect(screen.getByText('My Solutions')).toBeTruthy();
    expect(screen.getByText('Route optimisation platform')).toBeTruthy();
    expect(screen.getByText('Original problem')).toBeTruthy();
    expect(screen.getByText('Inefficient waste collection affecting local residents.')).toBeTruthy();
    expect(screen.getByText('AI-assisted waste collection routing.')).toBeTruthy();
    expect(screen.getByText('₹5,00,000')).toBeTruthy();
    expect(screen.getByText('35%')).toBeTruthy();
    expect(screen.getByText('Solution In Development')).toBeTruthy();
  });

  it('shows the live Government review status for an industry solution', () => {
    mocks.solutions = [storedSolution];
    mocks.reviews = { 'problem-1': { challengeId: 'problem-1', status: 'UNDER_REVIEW', feedback: '' } };
    render(<IndustrySolutionsPage onNavigate={vi.fn()} />);

    expect(screen.getByText('Under Government Review')).toBeTruthy();
    expect(screen.getByText('Awaiting Government Review')).toBeTruthy();
  });

  it('renders the no-solution notice and the empty state from real data only', () => {
    render(<IndustrySolutionsPage onNavigate={vi.fn()} />);

    expect(screen.getAllByText('No solutions yet').length).toBeGreaterThan(0);
    expect(screen.getByText('No solution has been added yet.')).toBeTruthy();
    expect(screen.getByText('Not assigned yet')).toBeTruthy();

    cleanup();
    mocks.challenges = [];
    render(<IndustrySolutionsPage onNavigate={vi.fn()} />);
    expect(screen.getByText('Accept a Government-routed challenge to start working on a solution.')).toBeTruthy();
  });

  it('ignores challenges accepted by another organization', () => {
    mocks.challenges = [{ ...routedChallenge, industryPartnerId: 'org-2' }];
    mocks.solutions = [{ ...storedSolution, organizationId: 'org-2' }];
    render(<IndustrySolutionsPage onNavigate={vi.fn()} />);

    expect(screen.queryByText('Route optimisation platform')).toBeNull();
    expect(screen.getByText('Accept a Government-routed challenge to start working on a solution.')).toBeTruthy();
  });

  it('saves a new solution against the accepted challenge of the signed-in organization', async () => {
    render(<IndustrySolutionsPage onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /add solution/i }));
    expect(screen.getByText(/Linked to challenge PR-1/)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/What will your organization build/i), { target: { value: 'AI-assisted waste collection routing.' } });
    fireEvent.change(screen.getByPlaceholderText(/Which outcome should this solution create/i), { target: { value: 'Fewer missed pickups.' } });
    fireEvent.click(screen.getByRole('button', { name: /submit for government review/i }));

    await waitFor(() => expect(mocks.saveIndustrySolution).toHaveBeenCalledTimes(1));
    expect(mocks.show).toHaveBeenCalledWith('Solution submitted to Government for review.', 'success');
    expect(mocks.saveIndustrySolution.mock.calls[0][0]).toMatchObject({
      challengeId: 'problem-1',
      projectId: 'problem-1',
      organizationId: 'org-1',
      organizationName: 'ABC Innovations',
      problem: 'Inefficient waste collection affecting local residents.',
      solution: 'AI-assisted waste collection routing.',
      expectedImpact: 'Fewer missed pickups.',
    });
  });
});
