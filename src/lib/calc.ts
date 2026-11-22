import type { Order, Settings } from '@/types/db';

// Costul curentului NU intră în calcule (doar materialul).
type CostSettings = Pick<Settings, 'pret_filament_lei_kg' | 'adaos_procent'>;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function filamentPrice(settings: CostSettings, material: string): number {
  const prices = settings.pret_filament_lei_kg ?? {};
  return Number(prices[material] ?? prices['Altul'] ?? 0);
}

export function materialCost(settings: CostSettings, material: string, grams: number): number {
  return round2((filamentPrice(settings, material) * (grams || 0)) / 1000);
}

export interface CostBreakdown {
  material: number;
  /** cost real = material */
  total: number;
  /** preț sugerat = cost × (1 + adaos), rotunjit în sus la 5 lei */
  suggested: number;
  perPiece: number;
}

export function costBreakdown(
  settings: CostSettings,
  input: { material: string; grame_filament: number; durata_print_ore?: number; nr_bucati: number },
  markupPct = Number(settings.adaos_procent),
): CostBreakdown {
  const material = materialCost(settings, input.material, input.grame_filament);
  const total = material;
  const raw = total * (1 + markupPct / 100);
  const suggested = raw > 0 ? Math.ceil(raw / 5) * 5 : 0;
  return { material, total, suggested, perPiece: round2(suggested / Math.max(1, input.nr_bucati || 1)) };
}

/** Profit estimat = preț − material (din DB) */
export function orderProfit(_settings: CostSettings, o: Pick<Order, 'pret_vanzare' | 'cost_material'>): number {
  return round2(Number(o.pret_vanzare) - Number(o.cost_material));
}

/** Rest de plată (niciodată negativ) */
export function amountDue(o: Pick<Order, 'pret_vanzare' | 'suma_incasata' | 'status'>): number {
  if (o.status === 'anulata') return 0;
  return Math.max(0, round2(Number(o.pret_vanzare) - Number(o.suma_incasata)));
}
