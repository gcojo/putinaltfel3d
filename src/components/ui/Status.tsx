import type { OrderStatus, PaidStatus } from '@/types/db';
import { PAID, STATUS_MAP, type Signal } from '@/lib/constants';
import type { Risk } from '@/lib/schedule';

export const SIGNAL_TEXT: Record<Signal, string> = {
  critical: 'text-critical',
  warning: 'text-warning',
  ok: 'text-ok',
  neutral: 'text-muted',
};
export const SIGNAL_BG: Record<Signal, string> = {
  critical: 'bg-critical',
  warning: 'bg-warning',
  ok: 'bg-ok',
  neutral: 'bg-muted-2',
};

export const riskSignal = (r: Risk): Signal => (r === 'late' ? 'critical' : r === 'tight' ? 'warning' : r === 'ok' ? 'ok' : 'neutral');

/** Punct colorat mic. `pulse` = imprimanta lucrează. */
export function Dot({ signal, pulse = false, className = '' }: { signal: Signal; pulse?: boolean; className?: string }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${SIGNAL_BG[signal]} ${pulse ? 'animate-soft-pulse' : ''} ${className}`}
      aria-hidden
    />
  );
}

/** Dot + etichetă scurtă uppercase. */
export function Signal({ signal, label, pulse, className = '' }: { signal: Signal; label: string; pulse?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      <Dot signal={signal} pulse={pulse} />
      <span className={`text-micro font-medium uppercase ${signal === 'neutral' ? 'text-muted' : SIGNAL_TEXT[signal]}`}>{label}</span>
    </span>
  );
}

export function StatusSignal({ status, short = false }: { status: OrderStatus; short?: boolean }) {
  const s = STATUS_MAP[status];
  return <Signal signal={s.signal} label={short ? s.short : s.label} pulse={status === 'se_printeaza'} />;
}

export function PaidSignal({ platit }: { platit: PaidStatus }) {
  const p = PAID[platit];
  return <Signal signal={p.signal} label={p.label} />;
}
