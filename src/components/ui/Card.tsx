import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function CardHeader({ title, right, sub }: { title: string; right?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line px-5 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="eyebrow truncate">{title}</h2>
        {sub && <span className="truncate text-xs text-muted">{sub}</span>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}

/** KPI: etichetă mică + cifră mare Light. */
export function Kpi({
  label, value, sub, signal, size = 'kpi',
}: { label: string; value: ReactNode; sub?: ReactNode; signal?: 'critical' | 'warning' | 'ok'; size?: 'kpi' | 'hero' | 'xl' }) {
  const color = signal === 'critical' ? 'text-critical' : signal === 'warning' ? 'text-warning' : signal === 'ok' ? 'text-ok' : 'text-fg';
  const sz = size === 'hero' ? 'text-hero' : size === 'xl' ? 'text-xl' : 'text-[30px] leading-[34px] tracking-[-0.02em] sm:text-kpi';
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="label">{label}</span>
      <span className={`num font-display ${sz} font-normal ${color} truncate`}>{value}</span>
      {sub && <span className="num text-xs text-muted">{sub}</span>}
    </div>
  );
}

/** Pereche etichetă / valoare pentru panouri de detaliu. */
export function Stat({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="label">{label}</span>
      <span className="num text-md text-fg">{value}</span>
    </div>
  );
}

export function ProgressBar({ value, signal = 'ok', className = '' }: { value: number; signal?: 'ok' | 'warning' | 'critical' | 'neutral'; className?: string }) {
  const bg = signal === 'ok' ? 'bg-ok' : signal === 'warning' ? 'bg-warning' : signal === 'critical' ? 'bg-critical' : 'bg-gradient-to-r from-accent to-accent-2';
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07] ${className}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${bg} transition-[width] duration-500 ease-spring`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}
