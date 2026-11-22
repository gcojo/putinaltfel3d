// Generează „warning cards”: riscuri de deadline, neplăți, coadă aglomerată.
import type { Client, Order, OrderStatus } from '@/types/db';
import { amountDue } from './calc';
import { BUSY_QUEUE_DAYS, OVERDUE_PAYMENT_DAYS } from './constants';
import { dateTime, daysBetween, deadlineEnd, hours, lei, signedHours } from './format';
import { needsDesign } from './design';
import { LOW_STOCK_G, orderComponents, stockKey, type StockItem } from './stock';
import { estimateIfAppended, suggestFix, type Schedule, type ScheduleSettings } from './schedule';

/** Comandă neproiectată cu deadline mai aproape de atâtea zile = atenționare. */
const DESIGN_WARN_DAYS = 3;

export type WarningAction =
  | { kind: 'reorder'; label: string; queue: number[] }
  | { kind: 'status'; label: string; orderId: number; status: OrderStatus }
  | { kind: 'open'; label: string; orderId: number }
  | { kind: 'link'; label: string; to: string };

export interface Warning {
  id: string;
  level: 'critical' | 'warning';
  title: string;
  /** cifra principală afișată mare */
  metric: string;
  detail: string;
  orders: Order[];
  recommendation?: string;
  action?: WarningAction;
}

const ref = (o: Order) => `#${o.id}`;

export function buildWarnings(
  orders: Order[],
  clients: Client[],
  schedule: Schedule,
  s: ScheduleSettings,
  now = new Date(),
  stock: StockItem[] = [],
): Warning[] {
  const out: Warning[] = [];
  const clientName = (o: Order) => clients.find((c) => c.id === o.client_id)?.nume;

  // 1. Comenzi care ratează deadline-ul (critic)
  for (const item of schedule.items.filter((i) => i.risk === 'late')) {
    const o = item.order;
    const fix = suggestFix(orders, s, now, o.id);
    const w: Warning = {
      id: `late-${o.id}`,
      level: 'critical',
      title: `Comanda ${ref(o)} ratează deadline-ul`,
      metric: signedHours(item.marginHours ?? 0),
      detail: `${o.titlu}${clientName(o) ? ` · ${clientName(o)}` : ''} · final estimat ${dateTime(item.end)}, deadline ${dateTime(deadlineEnd(o.deadline!))}`,
      orders: [o],
    };
    if (fix?.kind === 'move') {
      const jumped = fix.jumped.map((id) => orders.find((x) => x.id === id)!).filter(Boolean);
      w.orders = [o, ...jumped];
      w.recommendation = `Mută comanda ${ref(o)} înaintea ${ref(jumped[0])}. Celelalte comenzi rămân în termen.`;
      w.action = { kind: 'reorder', label: `Mută ${ref(o)} înaintea ${ref(jumped[0])}`, queue: fix.newQueue };
    } else if (item.isPrinting) {
      w.recommendation = `Anunță clientul: întârziere de ${hours(-(item.marginHours ?? 0))}.`;
      w.action = { kind: 'open', label: 'Deschide comanda', orderId: o.id };
    } else {
      w.recommendation = `Nicio reordonare nu ajunge. Cere prelungirea deadline-ului cu ${hours(-(item.marginHours ?? 0))} sau mărește orele de printare pe zi.`;
      w.action = { kind: 'open', label: 'Editează deadline-ul', orderId: o.id };
    }
    out.push(w);
  }

  // 2. Print care ar fi trebuit să se termine
  for (const item of schedule.items.filter((i) => i.isPrinting && i.overdue)) {
    const o = item.order;
    out.push({
      id: `overdue-${o.id}`,
      level: 'warning',
      title: `Printul ${ref(o)} ar fi trebuit să fie gata`,
      metric: signedHours((now.getTime() - (new Date(o.data_start!).getTime() + Number(o.durata_print_ore) * 3_600_000)) / 3_600_000),
      detail: `${o.titlu} · început ${dateTime(o.data_start)} · durată ${hours(Number(o.durata_print_ore))}`,
      orders: [o],
      recommendation: 'Verifică imprimanta și marchează comanda ca finalizată.',
      action: { kind: 'status', label: 'Marchează finalizată', orderId: o.id, status: 'finalizata' },
    });
  }

  // 3. Deadline strâns (atenție)
  const tight = schedule.items.filter((i) => i.risk === 'tight');
  if (tight.length) {
    const minMargin = Math.min(...tight.map((i) => i.marginHours ?? 0));
    out.push({
      id: 'tight',
      level: 'warning',
      title: tight.length === 1 ? `Deadline strâns la ${ref(tight[0].order)}` : `${tight.length} comenzi cu deadline strâns`,
      metric: signedHours(minMargin),
      detail: tight.map((i) => `${ref(i.order)} ${i.order.titlu}: ${signedHours(i.marginHours ?? 0)} față de deadline`).join(' · '),
      orders: tight.map((i) => i.order),
      recommendation: 'Nu mai adăuga comenzi înaintea lor.',
    });
  }

  // 4. Comenzi noi (neprogramate) care nu încap dacă intră la finalul cozii
  for (const o of orders.filter((x) => x.status === 'noua' && x.deadline && !needsDesign(x))) {
    const end = estimateIfAppended(schedule, Number(o.durata_print_ore), s);
    const margin = (deadlineEnd(o.deadline!).getTime() - end.getTime()) / 3_600_000;
    if (margin < 0) {
      out.push({
        id: `new-${o.id}`,
        level: 'warning',
        title: `Comanda nouă ${ref(o)} nu încape la finalul cozii`,
        metric: signedHours(margin),
        detail: `${o.titlu} · ar fi gata ${dateTime(end)}, deadline ${dateTime(deadlineEnd(o.deadline!))}`,
        orders: [o],
        recommendation: 'Pune-o în coadă și mut-o mai în față, sau renegociază termenul.',
        action: { kind: 'link', label: 'Deschide coada', to: '/coada' },
      });
    }
  }

  // 4b. Comenzi încă neproiectate cu deadline în mai puțin de 3 zile
  for (const o of orders.filter((x) => x.deadline && needsDesign(x))) {
    const left = (deadlineEnd(o.deadline!).getTime() - now.getTime()) / 3_600_000;
    if (left < DESIGN_WARN_DAYS * 24) {
      out.push({
        id: `design-${o.id}`,
        level: left < 24 ? 'critical' : 'warning',
        title: `Comanda ${ref(o)} nu e proiectată încă`,
        metric: signedHours(left),
        detail: `${o.titlu}${clientName(o) ? ` · ${clientName(o)}` : ''} · ${o.nr_bucati} buc · deadline ${dateTime(deadlineEnd(o.deadline!))}`,
        orders: [o],
        recommendation: 'Proiecteaz-o și adaugă gramele și timpul, ca să vezi dacă încape în coadă.',
        action: { kind: 'open', label: 'Deschide comanda', orderId: o.id },
      });
    }
  }

  // 4c. Filament: nu ajunge pentru comenzile programate / rolă pe terminate
  for (const it of stock) {
    const name = `${it.material}${it.culoare ? ` ${it.culoare}` : ''}`;
    const missing = it.rezervat - it.grame;
    if (it.rezervat > 0 && missing > 0) {
      const users = orders.filter(
        (o) => (o.status === 'in_coada' || o.status === 'se_printeaza') && orderComponents(o).some((c) => stockKey(c.material, c.culoare) === it.key),
      );
      out.push({
        id: `stock-${it.key}`,
        level: 'critical',
        title: `Nu ai destul ${name}`,
        metric: `−${Math.ceil(missing)} g`,
        detail: `În stoc: ${Math.max(0, Math.round(it.grame))} g · necesar pentru coadă: ${Math.round(it.rezervat)} g`,
        orders: users,
        recommendation: 'Comandă o rolă nouă sau schimbă culoarea comenzilor.',
        action: { kind: 'link', label: 'Deschide stocul', to: '/filament' },
      });
    } else if (it.grame < LOW_STOCK_G && it.moves.some((m) => m.tip === 'rola')) {
      out.push({
        id: `stock-low-${it.key}`,
        level: 'warning',
        title: `Se termină ${name}`,
        metric: `${Math.max(0, Math.round(it.grame))} g`,
        detail: `Au mai rămas sub ${LOW_STOCK_G} g.`,
        orders: [],
        recommendation: 'Pune o rolă nouă pe lista de cumpărături.',
        action: { kind: 'link', label: 'Deschide stocul', to: '/filament' },
      });
    }
  }

  // 5. Neplăți (comenzi finalizate/livrate cu rest de plată)
  const unpaid = orders.filter((o) => (o.status === 'finalizata' || o.status === 'livrata') && amountDue(o) > 0);
  if (unpaid.length) {
    const total = unpaid.reduce((a, o) => a + amountDue(o), 0);
    const oldest = Math.max(...unpaid.map((o) => daysBetween(new Date(o.data_finalizare ?? o.data_comanda), now)));
    out.push({
      id: 'unpaid',
      level: oldest > OVERDUE_PAYMENT_DAYS ? 'critical' : 'warning',
      title: unpaid.length === 1 ? `Comanda ${ref(unpaid[0])} nu e plătită integral` : `${unpaid.length} comenzi gata, neîncasate`,
      metric: lei(total),
      detail: unpaid
        .map((o) => `${ref(o)} ${clientName(o) ?? o.titlu}: ${lei(amountDue(o))}`)
        .join(' · ') + ` · cea mai veche: ${Math.floor(oldest)} zile`,
      orders: unpaid,
      recommendation: 'Trimite un mesaj clienților și înregistrează încasarea.',
      action: { kind: 'link', label: 'Vezi neplătite', to: '/comenzi?platit=neplatit' },
    });
  }

  // 6. Coadă aglomerată
  const capacity = Number(s.ore_de_printare_pe_zi) || 24;
  if (schedule.queueHours / capacity > BUSY_QUEUE_DAYS) {
    out.push({
      id: 'busy',
      level: 'warning',
      title: 'Coadă aglomerată',
      metric: hours(schedule.queueHours),
      detail: `≈ ${(schedule.queueHours / capacity).toFixed(1)} zile de lucru la ${hours(capacity)}/zi. O comandă nouă începe ${dateTime(schedule.nextStart)}.`,
      orders: [],
      recommendation: 'Comunică termene realiste pentru comenzile noi.',
    });
  }

  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'critical' ? -1 : 1));
}
