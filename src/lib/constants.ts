import type { OrderStatus, PaidStatus, PaymentMethod, Priority } from '@/types/db';

/** Semnal de status: culorile se folosesc DOAR pentru aceste stări. */
export type Signal = 'critical' | 'warning' | 'ok' | 'neutral';

export const STATUSES: { value: OrderStatus; label: string; short: string; signal: Signal }[] = [
  { value: 'noua', label: 'Nouă', short: 'NOUĂ', signal: 'neutral' },
  { value: 'in_coada', label: 'În coadă', short: 'COADĂ', signal: 'neutral' },
  { value: 'se_printeaza', label: 'Se printează', short: 'PRINT', signal: 'ok' },
  { value: 'finalizata', label: 'Finalizată', short: 'GATA', signal: 'ok' },
  { value: 'livrata', label: 'Livrată', short: 'LIVRAT', signal: 'neutral' },
  { value: 'anulata', label: 'Anulată', short: 'ANULAT', signal: 'neutral' },
];
export const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s])) as Record<
  OrderStatus,
  (typeof STATUSES)[number]
>;

/** Fluxul normal: următorul status logic. */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  noua: 'in_coada',
  in_coada: 'se_printeaza',
  se_printeaza: 'finalizata',
  finalizata: 'livrata',
};

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'normala', label: 'Normală' },
  { value: 'urgenta', label: 'Urgentă' },
];

export const PAID: Record<PaidStatus, { label: string; signal: Signal }> = {
  da: { label: 'Plătit', signal: 'ok' },
  partial: { label: 'Parțial', signal: 'warning' },
  nu: { label: 'Neplătit', signal: 'warning' },
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'numerar', label: 'Numerar' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'altul', label: 'Altul' },
];

export const DEFAULT_MATERIALS = ['PLA', 'PETG', 'TPU', 'ABS', 'ASA', 'PLA-CF', 'Altul'];

export const WEEKDAYS = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

/** Sub această marjă (ore) față de deadline, comanda e „strânsă” (portocaliu). */
export const TIGHT_MARGIN_HOURS = 24;
/** Coadă peste atâtea zile de lucru = aglomerată. */
export const BUSY_QUEUE_DAYS = 4;
/** Neplată mai veche de atâtea zile = critică. */
export const OVERDUE_PAYMENT_DAYS = 30;

export const PRINTER_NAME = 'Bambu Lab A1';
