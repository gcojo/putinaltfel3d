import type { Client, Order, Payment, Settings } from '@/types/db';
import { amountDue, orderProfit } from './calc';
import { HOUR, DAY, monthKey, monthLabel } from './format';
import { availableHours, type ScheduleSettings } from './schedule';

const ACTIVE = (o: Order) => o.status !== 'anulata';
const DONE = (o: Order) => o.status === 'finalizata' || o.status === 'livrata';

export interface Interval { start: number; end: number; order: Order }

/** Intervalele reale de printare (pentru utilizare/eficiență). */
export function printIntervals(orders: Order[], now = new Date()): Interval[] {
  const nowMs = now.getTime();
  const out: Interval[] = [];
  for (const o of orders) {
    if (!o.data_start || !(o.status === 'se_printeaza' || DONE(o))) continue;
    const start = new Date(o.data_start).getTime();
    const planned = start + Number(o.durata_print_ore) * HOUR;
    let end: number;
    if (o.status === 'se_printeaza') end = Math.min(nowMs, planned);
    else end = o.data_finalizare ? Math.min(new Date(o.data_finalizare).getTime(), planned) : planned;
    if (end > start) out.push({ start, end, order: o });
  }
  return out;
}

export function busyHours(intervals: Interval[], from: number, to: number): number {
  let h = 0;
  for (const i of intervals) {
    const a = Math.max(i.start, from);
    const b = Math.min(i.end, to);
    if (b > a) h += (b - a) / HOUR;
  }
  return h;
}

export interface DayUsage { key: string; label: string; hours: number; capacity: number; pct: number }

export function dailyUsage(orders: Order[], s: ScheduleSettings, now = new Date(), days = 7): DayUsage[] {
  const intervals = printIntervals(orders, now);
  const labels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const out: DayUsage[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const d1 = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 1);
    const hours = busyHours(intervals, d0.getTime(), Math.min(d1.getTime(), now.getTime()));
    const capacity = Number(s.ore_de_printare_pe_zi) || 24;
    out.push({ key: d0.toISOString(), label: labels[d0.getDay()], hours, capacity, pct: Math.min(100, (hours / capacity) * 100) });
  }
  return out;
}

/** Eficiența imprimantei: ore printate / ore disponibile în ultimele `days` zile. */
export function efficiency(orders: Order[], s: ScheduleSettings, now = new Date(), days = 30) {
  const from = new Date(now.getTime() - days * DAY);
  const busy = busyHours(printIntervals(orders, now), from.getTime(), now.getTime());
  const available = availableHours(from, now, s);
  return { busy, available, pct: available > 0 ? Math.min(100, (busy / available) * 100) : 0 };
}

export interface Kpis {
  incasatLuna: number;
  incasatLunaTrecuta: number;
  totalIncasat: number;
  deIncasat: number;
  comenziDeIncasat: number;
  profitEstimat: number;
  profitLuna: number;
}

export function kpis(orders: Order[], payments: Payment[], settings: Settings, now = new Date()): Kpis {
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  let incasatLuna = 0, incasatLunaTrecuta = 0, totalIncasat = 0;
  for (const p of payments) {
    const v = Number(p.suma);
    totalIncasat += v;
    const k = monthKey(p.data);
    if (k === thisMonth) incasatLuna += v;
    if (k === lastMonth) incasatLunaTrecuta += v;
  }
  let deIncasat = 0, comenziDeIncasat = 0, profitEstimat = 0, profitLuna = 0;
  for (const o of orders.filter(ACTIVE)) {
    const due = amountDue(o);
    if (due > 0) { deIncasat += due; comenziDeIncasat++; }
    const pr = orderProfit(settings, o);
    profitEstimat += pr;
    if (monthKey(o.data_comanda) === thisMonth) profitLuna += pr;
  }
  return { incasatLuna, incasatLunaTrecuta, totalIncasat, deIncasat, comenziDeIncasat, profitEstimat, profitLuna };
}

export interface MonthPoint { key: string; label: string; venit: number; comenzi: number; kg: number; profit: number; ore: number }

export function monthlySeries(orders: Order[], payments: Payment[], settings: Settings, now = new Date(), months = 12): MonthPoint[] {
  const points: MonthPoint[] = [];
  const idx = new Map<string, MonthPoint>();
  for (let i = months - 1; i >= 0; i--) {
    const key = monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const p = { key, label: monthLabel(key), venit: 0, comenzi: 0, kg: 0, profit: 0, ore: 0 };
    points.push(p);
    idx.set(key, p);
  }
  for (const pay of payments) {
    const p = idx.get(monthKey(pay.data));
    if (p) p.venit += Number(pay.suma);
  }
  for (const o of orders.filter(ACTIVE)) {
    const pc = idx.get(monthKey(o.data_comanda));
    if (pc) { pc.comenzi++; pc.profit += orderProfit(settings, o); }
    if (DONE(o)) {
      const pd = idx.get(monthKey(o.data_finalizare ?? o.data_comanda));
      if (pd) { pd.kg += Number(o.grame_filament) / 1000; pd.ore += Number(o.durata_print_ore); }
    }
  }
  return points;
}

export interface ClientStat {
  client: Client;
  count: number;
  spent: number;
  paid: number;
  due: number;
  last: string | null;
}

export function clientStats(clients: Client[], orders: Order[]): ClientStat[] {
  const map = new Map<number, ClientStat>(clients.map((c) => [c.id, { client: c, count: 0, spent: 0, paid: 0, due: 0, last: null }]));
  for (const o of orders) {
    if (o.client_id == null || o.status === 'anulata') continue;
    const st = map.get(o.client_id);
    if (!st) continue;
    st.count++;
    st.spent += Number(o.pret_vanzare);
    st.paid += Number(o.suma_incasata);
    st.due += amountDue(o);
    if (!st.last || o.data_comanda > st.last) st.last = o.data_comanda;
  }
  return [...map.values()];
}

export function generalStats(orders: Order[], settings: Settings) {
  const active = orders.filter(ACTIVE);
  const done = orders.filter(DONE);
  const avgHours = active.length ? active.reduce((a, o) => a + Number(o.durata_print_ore), 0) / active.length : 0;
  const totalHours = done.reduce((a, o) => a + Number(o.durata_print_ore), 0);
  const totalKg = done.reduce((a, o) => a + Number(o.grame_filament), 0) / 1000;
  const avgPrice = active.length ? active.reduce((a, o) => a + Number(o.pret_vanzare), 0) / active.length : 0;
  const profitable = active
    .map((o) => {
      const profit = orderProfit(settings, o);
      const h = Number(o.durata_print_ore);
      return { order: o, profit, perHour: h > 0 ? profit / h : 0, margin: Number(o.pret_vanzare) > 0 ? (profit / Number(o.pret_vanzare)) * 100 : 0 };
    })
    .sort((a, b) => b.profit - a.profit);
  const byMaterial = new Map<string, number>();
  for (const o of done) byMaterial.set(o.material, (byMaterial.get(o.material) ?? 0) + Number(o.grame_filament) / 1000);
  return {
    avgHours, totalHours, totalKg, avgPrice, profitable,
    cancelled: orders.length - active.length,
    byMaterial: [...byMaterial.entries()].map(([material, kg]) => ({ material, kg })).sort((a, b) => b.kg - a.kg),
  };
}
