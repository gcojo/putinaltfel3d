import { useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SwipeAction {
  label: string;
  icon: LucideIcon;
  /** clasele pentru fundalul care apare sub card */
  tone: string;
  run: () => void;
}

/** distanța (px) de la care, la ridicarea degetului, acțiunea se execută */
const TRIGGER = 88;

/**
 * Card care se poate trage la stânga / dreapta (pe telefon), ca în aplicațiile de mail.
 * Dreapta = `right` (acțiunea dezvăluită în stânga), stânga = `left`.
 */
export function SwipeCard({
  children, right, left, onTap, className = '',
}: { children: ReactNode; right?: SwipeAction | null; left?: SwipeAction | null; onTap: () => void; className?: string }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const g = useRef({ x: 0, y: 0, mode: 'idle' as 'idle' | 'h' | 'v', moved: false, armed: false });

  const action = dx > 0 ? right : dx < 0 ? left : null;
  const armed = Math.abs(dx) >= TRIGGER;

  const onStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    g.current = { x: t.clientX, y: t.clientY, mode: 'idle', moved: false, armed: false };
  };
  const onMove = (e: React.TouchEvent) => {
    const s = g.current;
    const t = e.touches[0];
    const mx = t.clientX - s.x;
    const my = t.clientY - s.y;
    if (s.mode === 'idle') {
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
      s.mode = Math.abs(mx) > Math.abs(my) ? 'h' : 'v';
      if (s.mode === 'h') setDragging(true);
    }
    if (s.mode !== 'h') return;
    s.moved = true;
    let next = mx;
    if ((next > 0 && !right) || (next < 0 && !left)) next = next * 0.15; // fără acțiune: abia se mișcă
    else if (Math.abs(next) > TRIGGER) next = Math.sign(next) * (TRIGGER + (Math.abs(next) - TRIGGER) * 0.35);
    const nowArmed = Math.abs(next) >= TRIGGER && !!(next > 0 ? right : left);
    if (nowArmed !== s.armed) {
      s.armed = nowArmed;
      if (nowArmed) navigator.vibrate?.(8);
    }
    setDx(next);
  };
  const onEnd = () => {
    const s = g.current;
    setDragging(false);
    if (s.mode === 'h' && s.armed && action) action.run();
    setDx(0);
  };

  const Icon = action?.icon;
  return (
    <div className="relative overflow-hidden rounded-card" data-no-pull={dragging ? '' : undefined}>
      {action && Icon && (
        <div
          aria-hidden
          className={`absolute inset-0 flex items-center gap-2 px-5 text-sm font-medium text-white transition-opacity duration-150 ${action.tone} ${dx > 0 ? 'justify-start' : 'justify-end'} ${armed ? 'opacity-100' : 'opacity-70'}`}
        >
          <Icon className={`h-5 w-5 transition-transform duration-300 ease-bounce ${armed ? 'scale-110' : 'scale-90'}`} strokeWidth={1.8} />
          <span>{action.label}</span>
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!g.current.moved) onTap();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onTap();
        }}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onTouchCancel={onEnd}
        className={`card relative ${className}`}
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dragging ? 'none' : 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          touchAction: 'pan-y',
          // sticla e transparentă: cât e tras, cardul devine opac ca să nu se vadă culoarea de dedesubt
          ...(dx ? { backgroundColor: 'rgb(var(--bg))' } : null),
        }}
      >
        {children}
      </div>
    </div>
  );
}
