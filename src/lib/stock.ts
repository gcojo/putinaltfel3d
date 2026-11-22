// Stoc de filament: suma mișcărilor (role adăugate, consum din comenzi, corecții) pe material + culoare.
import type { Component, FilamentMove, Order } from '@/types/db';

/** Sub atâtea grame, rola e pe terminate. */
export const LOW_STOCK_G = 150;

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
export const stockKey = (material: string, culoare: string | null | undefined) => `${material.trim()}|${norm(culoare)}`;

/** Componentele unei comenzi: lista multicoloră sau materialul unic. */
export function orderComponents(o: Pick<Order, 'material' | 'culoare' | 'grame_filament' | 'componente'>): Component[] {
  if (o.componente && o.componente.length) return o.componente;
  return Number(o.grame_filament) > 0 ? [{ material: o.material, culoare: o.culoare, grame: Number(o.grame_filament) }] : [];
}

/** Textul de culoare afișat pentru o comandă multicoloră: „Alb + Roșu”. */
export function componentsLabel(list: Component[]): string {
  return list.map((c) => c.culoare?.trim() || c.material).join(' + ');
}

export interface StockItem {
  key: string;
  material: string;
  culoare: string | null;
  grame: number;
  /** grame rezervate de comenzile din coadă / în printare */
  rezervat: number;
  moves: FilamentMove[];
}

/** Grame necesare pentru comenzile programate (coadă + printare), pe material + culoare. */
export function reserved(orders: Order[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== 'in_coada' && o.status !== 'se_printeaza') continue;
    for (const c of orderComponents(o)) {
      const k = stockKey(c.material, c.culoare);
      out.set(k, (out.get(k) ?? 0) + Number(c.grame));
    }
  }
  return out;
}

export function buildStock(moves: FilamentMove[], orders: Order[]): StockItem[] {
  const map = new Map<string, StockItem>();
  // mișcările vin cele mai noi primele: păstrăm scrierea culorii din cea mai nouă
  for (const m of moves) {
    const k = stockKey(m.material, m.culoare);
    const it = map.get(k) ?? { key: k, material: m.material, culoare: m.culoare, grame: 0, rezervat: 0, moves: [] };
    it.grame += Number(m.grame);
    it.moves.push(m);
    map.set(k, it);
  }
  const res = reserved(orders);
  for (const it of map.values()) {
    it.grame = Math.round(it.grame * 100) / 100;
    it.rezervat = Math.round((res.get(it.key) ?? 0) * 100) / 100;
  }
  return [...map.values()].sort((a, b) => a.material.localeCompare(b.material) || (a.culoare ?? '').localeCompare(b.culoare ?? ''));
}

/** Câte grame ai pentru un material + culoare; null dacă nu ții evidența lui. */
export function stockFor(stock: StockItem[], material: string, culoare: string | null | undefined): StockItem | null {
  return stock.find((s) => s.key === stockKey(material, culoare)) ?? null;
}
