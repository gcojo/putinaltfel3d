import type { Client, Order, Payment, Settings } from '@/types/db';
import { toYmd } from '@/lib/format';

export const NOW = new Date(2026, 10, 20, 10, 0, 0); // vineri 20 nov 2026, 10:00
const d = (days: number) => toYmd(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + days));
const ago = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

export const settings: Settings = {
  user_id: 'u',
  pret_filament_lei_kg: { PLA: 100, PETG: 110, ABS: 110, TPU: 170, Altul: 120 },
  cost_curent_lei_kwh: 1.3,
  consum_imprimanta_w: 100,
  ore_de_printare_pe_zi: 16,
  ora_inceput_zi: 8,
  zile_libere: [],
  date_libere: [],
  adaos_procent: 100,
  updated_at: '',
};

export const clients: Client[] = ['Andrei Popescu', 'Maria Ionescu', 'Elena Dumitru'].map((nume, i) => ({
  id: i + 1, user_id: 'u', nume, telefon: null, email: null, oras: 'Cluj', note: null, created_at: '',
}));

export function order(p: Partial<Order> & { id: number }): Order {
  return {
    user_id: 'u', client_id: 1, titlu: `Comanda ${p.id}`, descriere: null, material: 'PLA', culoare: null,
    grame_filament: 100, durata_print_ore: 4, nr_bucati: 1, pret_vanzare: 50, cost_material: 10, status: 'in_coada',
    prioritate: 'normala', data_comanda: d(-2), deadline: null, data_start: null, data_finalizare: null, platit: 'nu',
    suma_incasata: 0, note: null, poza_url: null, pozitie_in_coada: null, created_at: '', updated_at: '', ...p,
  };
}

/** Coada din seed: printul curent + 5 în coadă, #12 ratează deadline-ul. */
export function seedLike(): Order[] {
  return [
    order({ id: 1, status: 'livrata', data_comanda: d(-60), data_start: ago(60 * 24), data_finalizare: ago(60 * 24 - 5), suma_incasata: 50, platit: 'da' }),
    order({ id: 6, status: 'finalizata', data_comanda: d(-14), data_start: ago(11 * 24), data_finalizare: ago(11 * 24 - 11), durata_print_ore: 11, pret_vanzare: 160 }),
    order({ id: 8, status: 'se_printeaza', durata_print_ore: 5.5, data_start: ago(3), deadline: d(2), client_id: 3 }),
    order({ id: 9, pozitie_in_coada: 1, durata_print_ore: 10, deadline: d(6) }),
    order({ id: 10, pozitie_in_coada: 2, durata_print_ore: 12, deadline: d(5) }),
    order({ id: 11, pozitie_in_coada: 3, durata_print_ore: 8.5, deadline: d(8), client_id: 2 }),
    order({ id: 12, pozitie_in_coada: 4, durata_print_ore: 4, deadline: d(1), prioritate: 'urgenta', client_id: 3 }),
    order({ id: 13, pozitie_in_coada: 5, durata_print_ore: 7, deadline: d(4) }),
    order({ id: 14, status: 'noua', durata_print_ore: 5, deadline: d(10) }),
  ];
}

export const payments: Payment[] = [
  { id: 1, user_id: 'u', order_id: 1, suma: 50, data: d(-58), metoda: 'numerar', note: null, created_at: '' },
  { id: 2, user_id: 'u', order_id: 8, suma: 30, data: d(0), metoda: 'card', note: null, created_at: '' },
];
