// Programarea cozii pentru o singură imprimantă.
//
// Model de capacitate: în fiecare zi lucrătoare imprimanta are o fereastră de
// `ore_de_printare_pe_zi` ore care începe la `ora_inceput_zi`. Comenzile din
// coadă consumă ore din aceste ferestre, una după alta. Comanda care se
// printează acum rulează continuu de la `data_start`.

import type { Order, Settings } from '@/types/db';
import { TIGHT_MARGIN_HOURS } from './constants';
import { deadlineEnd, toYmd, HOUR, DAY } from './format';

export type ScheduleSettings = Pick<Settings, 'ore_de_printare_pe_zi' | 'ora_inceput_zi' | 'zile_libere' | 'date_libere'>;

export type Risk = 'late' | 'tight' | 'ok' | 'none';

export interface ScheduledItem {
  order: Order;
  start: Date;
  end: Date;
  /** ore rămase de printat */
  remainingHours: number;
  isPrinting: boolean;
  /** 0..1, doar pentru comanda care se printează */
  progress: number;
  /** printul ar fi trebuit să se termine deja */
  overdue: boolean;
  /** ore între final estimat și deadline (negativ = întârziere) */
  marginHours: number | null;
  risk: Risk;
}

export interface Schedule {
  items: ScheduledItem[];
  /** total ore rămase în coadă (inclusiv printul curent) */
  queueHours: number;
  /** când poate începe o comandă nouă adăugată la final */
  nextStart: Date;
}

const MAX_ITER = 5000;

function isFreeDay(day: Date, s: ScheduleSettings): boolean {
  return (s.zile_libere ?? []).includes(day.getDay()) || (s.date_libere ?? []).includes(toYmd(day));
}

function windowOf(day: Date, s: ScheduleSettings): [number, number] {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(s.ora_inceput_zi) || 0).getTime();
  const len = Math.min(24, Math.max(0.5, Number(s.ore_de_printare_pe_zi) || 24));
  return [start, start + len * HOUR];
}

/** Primul moment ≥ t aflat într-o fereastră de lucru + sfârșitul acelei ferestre. */
export function alignToWindow(t: number, s: ScheduleSettings): { at: number; windowEnd: number } {
  const base = new Date(t);
  // începem cu ziua precedentă: fereastra ei poate trece de miezul nopții
  let day = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1);
  for (let i = 0; i < 800; i++) {
    if (!isFreeDay(day, s)) {
      const [ws, we] = windowOf(day, s);
      if (t < we) return { at: Math.max(t, ws), windowEnd: we };
    }
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  }
  // toate zilele libere (configurare greșită) -> fără restricții
  return { at: t, windowEnd: t + 365 * DAY };
}

/** Adaugă `hours` ore de printare începând de la `start`, sărind peste pauze. */
export function advance(start: number, hours: number, s: ScheduleSettings): number {
  let remaining = Math.max(0, hours) * HOUR;
  let cursor = start;
  for (let i = 0; i < MAX_ITER; i++) {
    const { at, windowEnd } = alignToWindow(cursor, s);
    const avail = windowEnd - at;
    if (remaining <= avail) return at + remaining;
    remaining -= avail;
    cursor = windowEnd;
  }
  return cursor + remaining;
}

function riskOf(margin: number | null): Risk {
  if (margin === null) return 'none';
  if (margin < 0) return 'late';
  if (margin < TIGHT_MARGIN_HOURS) return 'tight';
  return 'ok';
}

const marginOf = (o: Order, end: number) => (o.deadline ? (deadlineEnd(o.deadline).getTime() - end) / HOUR : null);

/** Comenzile din coadă în ordinea de printare. */
export function queuedOrders(orders: Order[]): Order[] {
  return orders
    .filter((o) => o.status === 'in_coada')
    .sort((a, b) => (a.pozitie_in_coada ?? 1e9) - (b.pozitie_in_coada ?? 1e9) || a.id - b.id);
}

export function printingOrders(orders: Order[]): Order[] {
  return orders
    .filter((o) => o.status === 'se_printeaza')
    .sort((a, b) => (a.data_start ?? '').localeCompare(b.data_start ?? '') || a.id - b.id);
}

/**
 * Calculează programul. `queueOverride` permite simularea altei ordini a cozii
 * (listă de id-uri) fără a modifica datele.
 */
export function buildSchedule(
  orders: Order[],
  s: ScheduleSettings,
  now: Date = new Date(),
  queueOverride?: number[],
): Schedule {
  const items: ScheduledItem[] = [];
  const nowMs = now.getTime();
  let cursor = nowMs;
  let queueHours = 0;

  for (const o of printingOrders(orders)) {
    const dur = Number(o.durata_print_ore) || 0;
    const first = items.length === 0;
    const start = first && o.data_start ? new Date(o.data_start).getTime() : cursor;
    const planned = start + dur * HOUR;
    const end = Math.max(planned, cursor);
    const progress = dur > 0 ? Math.min(1, Math.max(0, (nowMs - start) / (dur * HOUR))) : 1;
    const remainingHours = Math.max(0, (end - nowMs) / HOUR);
    const margin = marginOf(o, end);
    items.push({
      order: o, start: new Date(start), end: new Date(end), remainingHours, isPrinting: true,
      progress, overdue: planned < nowMs, marginHours: margin, risk: riskOf(margin),
    });
    queueHours += remainingHours;
    cursor = end;
  }

  let queue = queuedOrders(orders);
  if (queueOverride) {
    const byId = new Map(queue.map((o) => [o.id, o]));
    queue = queueOverride.map((id) => byId.get(id)).filter((o): o is Order => !!o);
  }

  for (const o of queue) {
    const dur = Number(o.durata_print_ore) || 0;
    const { at } = alignToWindow(cursor, s);
    const end = advance(at, dur, s);
    const margin = marginOf(o, end);
    items.push({
      order: o, start: new Date(at), end: new Date(end), remainingHours: dur, isPrinting: false,
      progress: 0, overdue: false, marginHours: margin, risk: riskOf(margin),
    });
    queueHours += dur;
    cursor = end;
  }

  return { items, queueHours, nextStart: new Date(alignToWindow(cursor, s).at) };
}

/** Când s-ar termina o comandă nouă de `hours` ore dacă intră la finalul cozii. */
export function estimateIfAppended(schedule: Schedule, hours: number, s: ScheduleSettings): Date {
  return new Date(advance(schedule.nextStart.getTime(), hours, s));
}

export type Fix =
  | { kind: 'move'; orderId: number; beforeId: number; newQueue: number[]; jumped: number[] }
  | { kind: 'extend'; orderId: number; hoursLate: number };

/**
 * Pentru o comandă care întârzie, caută cea mai mică mutare în coadă
 * (cât mai puține poziții) care o face să se încadreze fără să întârzie alte comenzi noi.
 */
export function suggestFix(orders: Order[], s: ScheduleSettings, now: Date, orderId: number): Fix | null {
  const base = buildSchedule(orders, s, now);
  const item = base.items.find((i) => i.order.id === orderId);
  if (!item || item.risk !== 'late') return null;
  const hoursLate = -(item.marginHours ?? 0);
  if (item.isPrinting) return { kind: 'extend', orderId, hoursLate };

  const ids = queuedOrders(orders).map((o) => o.id);
  const idx = ids.indexOf(orderId);
  const lateBefore = new Set(base.items.filter((i) => i.risk === 'late').map((i) => i.order.id));

  for (let j = idx - 1; j >= 0; j--) {
    const newQueue = [...ids];
    newQueue.splice(idx, 1);
    newQueue.splice(j, 0, orderId);
    const sim = buildSchedule(orders, s, now, newQueue);
    const me = sim.items.find((i) => i.order.id === orderId);
    if (!me || me.risk === 'late') continue;
    const newlyLate = sim.items.some((i) => i.risk === 'late' && !lateBefore.has(i.order.id));
    if (newlyLate) continue;
    return { kind: 'move', orderId, beforeId: ids[j], newQueue, jumped: ids.slice(j, idx) };
  }
  return { kind: 'extend', orderId, hoursLate };
}

/** Ore de lucru disponibile între două momente (pentru eficiență). */
export function availableHours(from: Date, to: Date, s: ScheduleSettings): number {
  let total = 0;
  const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() - 1);
  for (let i = 0; i < 800 && day.getTime() < to.getTime(); i++) {
    if (!isFreeDay(day, s)) {
      const [ws, we] = windowOf(day, s);
      const a = Math.max(ws, from.getTime());
      const b = Math.min(we, to.getTime());
      if (b > a) total += (b - a) / HOUR;
    }
    day.setDate(day.getDate() + 1);
  }
  return total;
}
