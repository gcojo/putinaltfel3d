import type { ReactNode } from 'react';
import { Logo } from './Logo';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-shimmer rounded bg-ink/[0.07] ${className}`} />;
}

export function SkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-9 items-center gap-4 border-b border-line px-3">
          {Array.from({ length: cols }).map((__, j) => (
            <Skeleton key={j} className={`h-2.5 ${j === 1 ? 'flex-[2]' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card flex flex-col gap-4 p-4 ${className}`}>
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-2.5 w-40" />
    </div>
  );
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-tile border border-edge bg-glass/70 text-accent shadow-glass">
        {icon ?? <Logo size={38} />}
      </div>
      <p className="text-md text-fg">{title}</p>
      {text && <p className="max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-critical/40 bg-critical/5 px-4 py-3 text-sm" role="alert">
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-critical" />
        {message}
      </span>
      {onRetry && (
        <button className="label text-fg hover:underline" onClick={onRetry}>
          Reîncearcă
        </button>
      )}
    </div>
  );
}
