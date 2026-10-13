// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import DashboardShell from './DashboardShell';

const mocks = vi.hoisted(() => ({
  role: 'CITIZEN',
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'citizen-1', role: mocks.role, full_name: 'Prasanna Sri' } }),
}));
vi.mock('@/context/I18nContext', () => ({ useI18n: () => ({ t: (_key: string, fallback: string) => fallback }) }));
vi.mock('@/lib/api', () => ({ api: {
  universityOrganization: vi.fn(async () => ''),
  universityOverview: vi.fn(async () => ({ projects: [], challenges: [] })),
} }));
vi.mock('@/components/layout/TopBar', () => ({
  default: ({ sidebarOpen, onToggleSidebar }: { sidebarOpen: boolean; onToggleSidebar: () => void }) => (
    <button type="button" aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'} onClick={onToggleSidebar} />
  ),
}));

beforeEach(() => {
  window.PointerEvent = MouseEvent as typeof PointerEvent;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.sessionStorage.removeItem('udbhav-login-welcome-pending');
  mocks.role = 'CITIZEN';
});

describe('DashboardShell sidebar', () => {
  it.each(['CITIZEN', 'DISTRICT_OFFICER', 'UNIVERSITY_ADMIN', 'INDUSTRY_PARTNER', 'VOLUNTEER'])(
    'shows the pending login welcome once for %s',
    role => {
      mocks.role = role;
      window.sessionStorage.setItem('udbhav-login-welcome-pending', 'true');
      const { rerender } = render(<DashboardShell currentPage="/dashboard" onNavigate={vi.fn()}>Dashboard</DashboardShell>);

      expect(screen.getByRole('status').textContent).toContain('Welcome back, Prasanna');
      expect(window.sessionStorage.getItem('udbhav-login-welcome-pending')).toBeNull();

      rerender(<DashboardShell currentPage="/dashboard/projects" onNavigate={vi.fn()}>Projects</DashboardShell>);
      expect(screen.getByRole('status')).toBeTruthy();
    },
  );

  it('does not show a welcome on dashboard entry without a login marker', () => {
    render(<DashboardShell currentPage="/dashboard" onNavigate={vi.fn()}>Dashboard</DashboardShell>);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('does not restart the welcome timer when the dashboard route changes', () => {
    vi.useFakeTimers();
    window.sessionStorage.setItem('udbhav-login-welcome-pending', 'true');
    const { rerender } = render(<DashboardShell currentPage="/dashboard" onNavigate={vi.fn()}>Dashboard</DashboardShell>);

    act(() => vi.advanceTimersByTime(1000));
    rerender(<DashboardShell currentPage="/dashboard/projects" onNavigate={vi.fn()}>Projects</DashboardShell>);
    act(() => vi.advanceTimersByTime(1000));

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('resizes within limits and restores the last expanded width after collapse', () => {
    render(<DashboardShell currentPage="/dashboard" onNavigate={vi.fn()}>Dashboard</DashboardShell>);
    const sidebar = document.querySelector('.civic-sidebar') as HTMLElement;
    const resizeHandle = screen.getByRole('separator', { name: 'Resize sidebar' });

    fireEvent.pointerDown(resizeHandle, { clientX: 270, pointerId: 1 });
    fireEvent.pointerMove(resizeHandle, { clientX: 320, pointerId: 1 });
    fireEvent.pointerUp(resizeHandle, { pointerId: 1 });
    expect(sidebar.style.width).toBe('320px');

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(sidebar.style.width).toBe('80px');
    expect(screen.getByRole('link', { name: 'Report Problem' }).getAttribute('aria-label')).toBe('Report Problem');
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(sidebar.style.width).toBe('320px');

    fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });
    expect(sidebar.style.width).toBe('332px');
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });
    expect(sidebar.style.width).toBe('360px');
    for (let step = 0; step < 12; step += 1) fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft' });
    expect(sidebar.style.width).toBe('220px');
  });

  it('keeps the existing mobile navigation drawer and overlay', () => {
    render(<DashboardShell currentPage="/dashboard" onNavigate={vi.fn()}>Dashboard</DashboardShell>);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('button', { name: 'Close navigation' })).toBeTruthy();
    const overlay = document.querySelector('[class*="bg-black/30"]') as HTMLElement;
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay);
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeTruthy();
  });

  it('does not add the dashboard resize controls to unrelated roles', () => {
    mocks.role = 'PLATFORM_ADMIN';
    render(<DashboardShell currentPage="/dashboard" onNavigate={vi.fn()}>Dashboard</DashboardShell>);
    expect(screen.queryByRole('separator', { name: 'Resize sidebar' })).toBeNull();
  });

  it.each(['CITIZEN', 'DISTRICT_OFFICER', 'UNIVERSITY_ADMIN', 'INDUSTRY_PARTNER', 'VOLUNTEER'])(
    'enables the responsive sidebar for %s',
    role => {
      mocks.role = role;
      render(<DashboardShell currentPage="/dashboard" onNavigate={vi.fn()}>Dashboard</DashboardShell>);
      expect(screen.getByRole('separator', { name: 'Resize sidebar' })).toBeTruthy();
      cleanup();
    },
  );
});