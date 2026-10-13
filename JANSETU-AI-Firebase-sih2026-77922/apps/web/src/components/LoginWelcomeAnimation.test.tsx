// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import LoginWelcomeAnimation from './LoginWelcomeAnimation';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('LoginWelcomeAnimation', () => {
  it('greets by first name and completes after its short sequence', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    const onComplete = vi.fn();

    render(<LoginWelcomeAnimation firstName="Prasanna" onComplete={onComplete} />);
    expect(screen.getByRole('status').textContent).toContain('Welcome back, Prasanna');
    vi.advanceTimersByTime(2000);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('uses a shorter duration when reduced motion is enabled', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const onComplete = vi.fn();

    render(<LoginWelcomeAnimation onComplete={onComplete} />);
    expect(screen.getByRole('status').textContent).toContain('Welcome back');
    vi.advanceTimersByTime(850);
    expect(onComplete).toHaveBeenCalledOnce();
  });
});