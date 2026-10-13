import { type ReactNode } from 'react';
import { FadeIn } from './motion';
import { DashboardAnimatedNumber } from './motion';

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`badge ${className}`}>{children}</span>;
}

export function StatusBadge({ status, config }: { status: string; config: Record<string, { label: string; color: string; bg: string }> }) {
  const c = config[status] || { label: status, color: 'text-neutral-700', bg: 'bg-neutral-100' };
  return (
    <span className={`badge ${c.bg} ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.color.replace('text-', 'bg-')}`} />
      {c.label}
    </span>
  );
}

export function PriorityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-50 text-red-700 border-red-200',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    LOW: 'bg-blue-50 text-blue-700 border-blue-200',
    INFO: 'bg-neutral-50 text-neutral-700 border-neutral-200',
  };
  return (
    <span className={`badge border ${colors[level] || colors.INFO}`}>
      {level}
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="mb-4 text-neutral-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-neutral-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-500 max-w-md mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      </div>
      <h3 className="text-lg font-semibold text-neutral-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-500 max-w-md mb-4">{description}</p>}
      {onRetry && <button onClick={onRetry} className="btn-secondary">Try again</button>}
    </div>
  );
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`${sizes[size]} border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  );
}

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={`${hover ? 'card-hover' : 'card'} ${className}`}>{children}</div>;
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <FadeIn className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-xl font-extrabold text-primary-900 font-display tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-neutral-500 mt-1 leading-5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </FadeIn>
  );
}

export function MetricCard({ label, value, suffix, icon, trend, color = 'primary', onClick }: { label: string; value: string | number; suffix?: string; icon?: ReactNode; trend?: { value: string; up: boolean }; color?: string; onClick?: () => void }) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-secondary-50 text-secondary-600',
    accent: 'bg-accent-50 text-accent-600',
    success: 'bg-success-50 text-success-600',
    error: 'bg-error-50 text-error-600',
    warning: 'bg-warning-50 text-warning-600',
  };
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper onClick={onClick} className={`card p-4 sm:p-5 relative overflow-hidden w-full text-left${onClick ? ' hover:shadow-card hover:border-primary-200 transition-all cursor-pointer' : ''}`}>
      <div className="absolute -right-7 -top-7 w-24 h-24 rounded-full bg-primary-50/60" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wide">{label}</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-extrabold text-primary-900 font-display tracking-tight">
              {typeof value === 'number' ? <DashboardAnimatedNumber value={value} /> : value}
            </span>
            {suffix && <span className="text-sm text-neutral-400">{suffix}</span>}
          </div>
        </div>
        {icon && <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color]} shadow-sm`}>{icon}</div>}
      </div>
      {trend && (
        <div className="relative flex items-center gap-1 mt-2">
          <span className={`text-xs font-medium ${trend.up ? 'text-success-600' : 'text-error-600'}`}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-xs text-neutral-400">vs last month</span>
        </div>
      )}
    </Wrapper>
  );
}

export { default as Card3D } from './Card3D';
export { default as AnimatedCount } from './AnimatedCount';

