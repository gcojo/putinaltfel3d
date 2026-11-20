// Export CSV compatibil cu Excel în română (separator „;”, virgulă zecimală, BOM UTF-8).
import type { Client, Order, Payment, Settings } from '@/types/db';
import { PAID, PAYMENT_METHODS, STATUS_MAP } from './constants';
import { amountDue, orderProfit } from './calc';
import { todayYmd } from './format';

type Cell = string | number | null | undefined;

function cell(v: Cell): string {
  if (v == null) return '';
  const s = typeof v === 'number' ? String(Math.round(v * 100) / 100).replace('.', ',') : v;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}

export function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = (iso: string | null) => (iso ? iso.slice(0, 16).replace('T', ' ') : '');

export function exportOrders(orders: Order[], clients: Client[], settings: Settings) {
  const name = (id: number | null) => clients.find((c) => c.id === id)?.nume ?? '';
  const csv = toCsv(
    [
      'Nr', 'Data comandă', 'Client', 'Titlu', 'Material', 'Culoare', 'Bucăți', 'Grame', 'Ore print', 'Status', 'Prioritate',
      'Deadline', 'Start', 'Finalizare', 'Preț (lei)', 'Cost material (lei)', 'Profit estimat (lei)', 'Încasat (lei)',
      'Rest (lei)', 'Plată', 'Note',
    ],
    orders.map((o) => [
      o.id, o.data_comanda, name(o.client_id), o.titlu, o.material, o.culoare, o.nr_bucati, Number(o.grame_filament),
      Number(o.durata_print_ore), STATUS_MAP[o.status].label, o.prioritate === 'urgenta' ? 'Urgentă' : 'Normală', o.deadline,
      stamp(o.data_start), stamp(o.data_finalizare), Number(o.pret_vanzare), Number(o.cost_material),
      orderProfit(settings, o), Number(o.suma_incasata), amountDue(o), PAID[o.platit].label, o.note,
    ]),
  );
  download(`comenzi-${todayYmd()}.csv`, csv);
}

export function exportPayments(payments: Payment[], orders: Order[], clients: Client[]) {
  const orderOf = (id: number) => orders.find((o) => o.id === id);
  const name = (id: number | null | undefined) => clients.find((c) => c.id === id)?.nume ?? '';
  const csv = toCsv(
    ['Data', 'Sumă (lei)', 'Metodă', 'Comandă', 'Titlu', 'Client', 'Note'],
    [...payments]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((p) => {
        const o = orderOf(p.order_id);
        return [
          p.data, Number(p.suma), PAYMENT_METHODS.find((m) => m.value === p.metoda)?.label, `#${p.order_id}`,
          o?.titlu, name(o?.client_id), p.note,
        ];
      }),
  );
  download(`incasari-${todayYmd()}.csv`, csv);
}
