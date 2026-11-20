import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight } from 'lucide-react';
import type { Order, OrderStatus } from '@/types/db';
import { NEXT_STATUS, STATUSES, STATUS_MAP } from '@/lib/constants';
import { Dot, StatusSignal } from '@/components/ui/Status';
import { useChangeStatus } from './useOrderActions';

/** Status clicabil: deschide meniul de schimbare rapidă. */
export function StatusMenu({ order, short = false }: { order: Order; short?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const changeStatus = useChangeStatus();

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = btn.current!.getBoundingClientRect();
    const left = Math.min(r.left, window.innerWidth - 200);
    const top = r.bottom + 260 > window.innerHeight ? Math.max(8, r.top - 252) : r.bottom + 4;
    setPos({ top, left });
    setOpen((o) => !o);
  };

  const pick = async (s: OrderStatus) => {
    setOpen(false);
    if (s !== order.status) await changeStatus(order, s);
  };

  return (
    <>
      <button
        ref={btn}
        onClick={toggle}
        className="-mx-1.5 rounded px-1.5 py-1 transition-colors duration-150 hover:bg-surface-3"
        title="Schimbă statusul"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <StatusSignal status={order.status} short={short} />
      </button>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-50" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
            <div
              role="menu"
              className="fixed z-50 w-48 animate-fade-in rounded-card border border-line bg-surface-2 py-1"
              style={{ top: pos.top, left: pos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  role="menuitem"
                  onClick={() => pick(s.value)}
                  className="flex h-9 w-full items-center gap-2.5 px-3 text-left text-sm transition-colors duration-150 hover:bg-surface-3"
                >
                  <Dot signal={s.signal} />
                  <span className="flex-1">{s.label}</span>
                  {s.value === order.status && <Check className="h-3.5 w-3.5 text-muted" />}
                  {s.value === NEXT_STATUS[order.status] && <ChevronRight className="h-3.5 w-3.5 text-muted" />}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  in_coada: 'Pune în coadă',
  se_printeaza: 'Începe printarea',
  finalizata: 'Marchează finalizată',
  livrata: 'Marchează livrată',
};

/** Eticheta butonului „pasul următor” (ex. Începe printarea). */
export function nextStep(status: OrderStatus): { status: OrderStatus; label: string } | null {
  const next = NEXT_STATUS[status];
  return next ? { status: next, label: NEXT_LABEL[next] ?? STATUS_MAP[next].label } : null;
}
