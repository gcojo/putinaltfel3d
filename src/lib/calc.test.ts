import { describe, expect, it } from 'vitest';
import { amountDue, costBreakdown, electricityCost, orderProfit } from './calc';
import { hours, lei, num, signedDays } from './format';
import { buildWarnings } from './warnings';
import { buildSchedule } from './schedule';
import { efficiency, kpis, monthlySeries } from './stats';
import { NOW, clients, payments, seedLike, settings } from '@/test/fixtures';

describe('costuri', () => {
  it('cost curent = ore × kW × lei/kWh', () => {
    expect(electricityCost(settings, 10)).toBe(1.3);
  });
  it('calculator preț', () => {
    const c = costBreakdown(settings, { material: 'PETG', grame_filament: 250, durata_print_ore: 5, nr_bucati: 2 });
    expect(c.material).toBe(27.5);
    expect(c.electricity).toBe(0.65);
    expect(c.total).toBe(28.15);
    expect(c.suggested).toBe(60); // 56.3 rotunjit în sus la 5
    expect(c.perPiece).toBe(30);
  });
  it('profit și rest de plată', () => {
    expect(orderProfit(settings, { pret_vanzare: 100, cost_material: 20, durata_print_ore: 10 })).toBe(78.7);
    expect(amountDue({ pret_vanzare: 100, suma_incasata: 30, status: 'livrata' })).toBe(70);
    expect(amountDue({ pret_vanzare: 100, suma_incasata: 0, status: 'anulata' })).toBe(0);
  });
});

describe('formatare', () => {
  it('cifre', () => {
    expect(num(1234.5, 1)).toBe('1 234.5');
    expect(lei(62.5)).toBe('62.50 lei');
    expect(lei(1500)).toBe('1 500 lei');
    expect(signedDays(1.5)).toBe('+1.5 zile');
    expect(signedDays(-1)).toBe('−1 zi');
    expect(hours(34.5)).toBe('34.5 h');
  });
});

describe('avertismente + statistici', () => {
  it('generează card critic cu acțiune de reordonare + neplăți', () => {
    const orders = seedLike();
    const sch = buildSchedule(orders, settings, NOW);
    const w = buildWarnings(orders, clients, sch, settings, NOW);
    const late = w.find((x) => x.id === 'late-12')!;
    expect(late.level).toBe('critical');
    expect(late.action?.kind).toBe('reorder');
    expect(late.recommendation).toMatch(/Mută comanda #12 înaintea #/);
    expect(w.find((x) => x.id === 'unpaid')).toBeTruthy();
    expect(w[0].level).toBe('critical');
  });
  it('KPI-uri și serii lunare', () => {
    const orders = seedLike();
    const k = kpis(orders, payments, settings, NOW);
    expect(k.incasatLuna).toBe(30);
    expect(k.totalIncasat).toBe(80);
    const m = monthlySeries(orders, payments, settings, NOW);
    expect(m).toHaveLength(12);
    expect(m.at(-1)!.venit).toBe(30);
    const e = efficiency(orders, settings, NOW);
    expect(e.pct).toBeGreaterThan(0);
    expect(e.pct).toBeLessThanOrEqual(100);
  });
});
