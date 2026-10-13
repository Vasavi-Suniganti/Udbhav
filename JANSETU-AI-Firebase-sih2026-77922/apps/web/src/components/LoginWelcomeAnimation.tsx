import { useEffect } from 'react';

interface LoginWelcomeAnimationProps {
  firstName?: string;
  onComplete: () => void;
}

export default function LoginWelcomeAnimation({ firstName, onComplete }: LoginWelcomeAnimationProps) {
  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const timeout = window.setTimeout(onComplete, reducedMotion ? 850 : 2000);
    return () => window.clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div className="login-welcome-overlay" role="status" aria-live="polite">
      <div className="login-welcome-content">
        <div className="login-welcome-brand">UDBHAV</div>
        <div className="login-welcome-message">
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </div>
      </div>
    </div>
  );
}