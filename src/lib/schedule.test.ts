import { describe, expect, it } from 'vitest';
import { advance, alignToWindow, availableHours, buildSchedule, suggestFix } from './schedule';
import { NOW, seedLike, settings } from '@/test/fixtures';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe('ferestre de lucru', () => {
  it('aliniază ora la începutul ferestrei', () => {
    expect(alignToWindow(at(2026, 11, 20, 5), settings).at).toBe(at(2026, 11, 20, 8));
    expect(alignToWindow(at(2026, 11, 20, 12), settings).at).toBe(at(2026, 11, 20, 12));
  });
  it('o comandă care depășește fereastra continuă a doua zi', () => {
    // 20:00 + 6 h: 4 h până la 24:00, restul de 2 h de la 08:00
    expect(advance(at(2026, 11, 20, 20), 6, settings)).toBe(at(2026, 11, 21, 10));
  });
  it('sare peste zilele libere', () => {
    const s = { ...settings, zile_libere: [6, 0] }; // sâmbătă, duminică
    expect(alignToWindow(at(2026, 11, 21, 9), s).at).toBe(at(2026, 11, 23, 8)); // luni
    const s2 = { ...settings, date_libere: ['2026-11-23'] };
    expect(advance(at(2026, 11, 22, 20), 6, s2)).toBe(at(2026, 11, 24, 10));
  });
  it('fereastra care trece de miezul nopții', () => {
    const s = { ...settings, ora_inceput_zi: 12, ore_de_printare_pe_zi: 16 }; // 12:00–04:00
    expect(alignToWindow(at(2026, 11, 21, 2), s).at).toBe(at(2026, 11, 21, 2));
    expect(alignToWindow(at(2026, 11, 21, 5), s).at).toBe(at(2026, 11, 21, 12));
  });
  it('24 h pe zi = fără pauze', () => {
    const s = { ...settings, ore_de_printare_pe_zi: 24, ora_inceput_zi: 0 };
    expect(advance(at(2026, 11, 20, 20), 30, s)).toBe(at(2026, 11, 22, 2));
  });
  it('ore disponibile', () => {
    expect(availableHours(new Date(at(2026, 11, 20, 0)), new Date(at(2026, 11, 22, 0)), settings)).toBe(32);
  });
});

describe('programul cozii', () => {
  it('calculează start/final, progres și riscuri', () => {
    const sch = buildSchedule(seedLike(), settings, NOW);
    expect(sch.items.map((i) => i.order.id)).toEqual([8, 9, 10, 11, 12, 13]);
    const printing = sch.items[0];
    expect(printing.isPrinting).toBe(true);
    expect(printing.progress).toBeCloseTo(3 / 5.5, 3);
    expect(printing.end.getTime()).toBe(at(2026, 11, 20, 12, 30));
    expect(sch.items[1].start.getTime()).toBe(at(2026, 11, 20, 12, 30));
    expect(sch.items.find((i) => i.order.id === 12)!.risk).toBe('late');
    expect(sch.items.find((i) => i.order.id === 9)!.risk).toBe('ok');
    expect(sch.queueHours).toBeCloseTo(2.5 + 10 + 12 + 8.5 + 4 + 7, 5);
    expect(sch.nextStart.getTime()).toBe(sch.items.at(-1)!.end.getTime());
  });

  it('recomandă mutarea comenzii întârziate', () => {
    const orders = seedLike();
    const fix = suggestFix(orders, settings, NOW, 12);
    expect(fix?.kind).toBe('move');
    if (fix?.kind !== 'move') return;
    const sim = buildSchedule(orders, settings, NOW, fix.newQueue);
    expect(sim.items.filter((i) => i.risk === 'late')).toHaveLength(0);
    expect(fix.newQueue).toHaveLength(5);
  });

  it('nu recomandă nimic pentru o comandă în termen', () => {
    expect(suggestFix(seedLike(), settings, NOW, 9)).toBeNull();
  });
});
