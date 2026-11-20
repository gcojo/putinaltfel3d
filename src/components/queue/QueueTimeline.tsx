import { useMemo } from 'react';
import type { ScheduledItem, ScheduleSettings } from '@/lib/schedule';
import { deadlineEnd, HOUR } from '@/lib/format';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';

const DAYS = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

/**
 * Timeline orizontal al cozii: blocuri per comandă pe axa zile/ore,
 * ore nelucrătoare hașurate, marcaje roșii/portocalii la deadline-urile depășite/strânse.
 */
export function QueueTimeline({
  items, settings, now, pxPerHour = 12, compact = false,
}: {
  items: ScheduledItem[];
  settings: ScheduleSettings;
  now: Date;
  pxPerHour?: number;
  compact?: boolean;
}) {
  const { openOrder } = useOrderPanel();

  const view = useMemo(() => {
    const nowMs = now.getTime();
    const startMs = Math.max(Math.min(nowMs, ...items.map((i) => i.start.getTime())), nowMs - 12 * HOUR);
    const from = new Date(startMs);
    from.setMinutes(0, 0, 0);
    const deadlines = items
      .filter((i) => i.risk === 'late' || i.risk === 'tight')
      .map((i) => deadlineEnd(i.order.deadline!).getTime());
    const endMs = Math.max(nowMs + 24 * HOUR, ...items.map((i) => i.end.getTime()), ...deadlines) + 6 * HOUR;
    const to = new Date(endMs);
    to.setHours(23, 59, 59, 999);
    const x = (t: number) => ((t - from.getTime()) / HOUR) * pxPerHour;

    // zile + intervale nelucrătoare
    const days: { left: number; width: number; label: string; free: boolean }[] = [];
    const off: { left: number; width: number }[] = [];
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const free = new Set(settings.zile_libere ?? []);
    const freeDates = new Set(settings.date_libere ?? []);
    let prevWindowEnd = from.getTime();
    for (let i = 0; i < 120 && d.getTime() < to.getTime(); i++) {
      const dayStart = d.getTime();
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isFree = free.has(d.getDay()) || freeDates.has(ymd);
      days.push({ left: x(Math.max(dayStart, from.getTime())), width: x(next) - x(Math.max(dayStart, from.getTime())), label: `${DAYS[d.getDay()]} ${d.getDate()}`, free: isFree });
      if (!isFree) {
        const ws = dayStart + Number(settings.ora_inceput_zi) * HOUR;
        const we = ws + Math.min(24, Number(settings.ore_de_printare_pe_zi)) * HOUR;
        if (ws > prevWindowEnd) off.push({ left: x(prevWindowEnd), width: x(ws) - x(prevWindowEnd) });
        prevWindowEnd = Math.max(prevWindowEnd, we);
      }
      d.setDate(d.getDate() + 1);
    }
    if (to.getTime() > prevWindowEnd) off.push({ left: x(prevWindowEnd), width: x(to.getTime()) - x(prevWindowEnd) });

    return { width: x(to.getTime()), x, days, off: off.filter((o) => o.width > 0 && o.left + o.width > 0), nowX: x(nowMs) };
  }, [items, settings, now, pxPerHour]);

  const trackH = compact ? 36 : 48;

  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <div className="relative select-none" style={{ width: view.width, height: trackH + (compact ? 38 : 46) }}>
        {/* zile */}
        {view.days.map((d) => (
          <div key={d.left} className="absolute top-0 h-full border-l border-line" style={{ left: d.left, width: d.width }}>
            <span className={`label absolute left-1.5 top-1 ${d.free ? 'text-muted-2' : ''}`}>
              {d.label}
              {d.free ? ' · liber' : ''}
            </span>
          </div>
        ))}
        {/* blocuri comenzi */}
        {items.map((i) => {
          const left = view.x(i.start.getTime());
          const w = Math.max(view.x(i.end.getTime()) - left, 3);
          const border = i.risk === 'late' ? 'border-critical' : i.risk === 'tight' ? 'border-warning' : i.isPrinting ? 'border-ok/70' : 'border-line-strong';
          return (
            <button
              key={i.order.id}
              onClick={() => openOrder(i.order.id)}
              className={`group absolute overflow-hidden rounded-[4px] border bg-glass text-left shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-lift ${border}`}
              style={{ left, width: w - 2, top: 20, height: trackH }}
              title={`#${i.order.id} ${i.order.titlu}`}
            >
              {i.isPrinting && <div className="absolute inset-y-0 left-0 bg-ok/15" style={{ width: `${i.progress * 100}%` }} />}
              <div className="relative flex h-full flex-col justify-center px-1.5">
                <span className="num truncate text-xs text-fg">#{i.order.id}</span>
                {!compact && w > 60 && <span className="truncate text-[10px] leading-3 text-muted">{i.order.titlu}</span>}
              </div>
            </button>
          );
        })}
        {/* ore nelucrătoare */}
        {view.off.map((o) => (
          <div key={o.left} className="hatch pointer-events-none absolute opacity-60" style={{ left: Math.max(0, o.left), width: o.width, top: 20, height: trackH }} />
        ))}
        {/* marcaje deadline */}
        {items
          .filter((i) => i.risk === 'late' || i.risk === 'tight')
          .map((i) => {
            const left = view.x(deadlineEnd(i.order.deadline!).getTime());
            const late = i.risk === 'late';
            return (
              <div key={`dl-${i.order.id}`} className="pointer-events-none absolute" style={{ left, top: 16, height: trackH + 8 }}>
                <div className={`h-full w-px ${late ? 'bg-critical' : 'bg-warning'}`} />
                <span className={`num absolute -left-3 whitespace-nowrap text-[10px] ${late ? 'text-critical' : 'text-warning'}`} style={{ top: trackH + 10 }}>
                  ▲ #{i.order.id}
                </span>
              </div>
            );
          })}
        {/* acum */}
        <div className="pointer-events-none absolute" style={{ left: view.nowX, top: 14, height: trackH + 12 }}>
          <div className="h-full w-px bg-fg" />
          <span className="label absolute -left-2.5 -top-0.5 hidden rounded bg-panel px-0.5 text-fg">acum</span>
        </div>
      </div>
    </div>
  );
}
