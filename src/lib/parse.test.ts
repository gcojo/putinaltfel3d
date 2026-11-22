import { describe, expect, it } from 'vitest';
import { parseDuration, parseNumber, parseSlicerText } from './parse';
import { messageTemplates, waLink, waNumber } from './contact';
import { seedLike } from '@/test/fixtures';

describe('parseNumber', () => {
  it('acceptă virgulă, spații și unități', () => {
    expect(parseNumber('12,5')).toBe(12.5);
    expect(parseNumber('123.4 g')).toBe(123.4);
    expect(parseNumber('1 234')).toBe(1234);
    expect(parseNumber('abc')).toBeNaN();
    expect(parseNumber('')).toBeNaN();
  });
});

describe('parseDuration', () => {
  it('ore simple', () => {
    expect(parseDuration('3.5')).toBe(3.5);
    expect(parseDuration('3,5')).toBe(3.5);
  });
  it('format Bambu Studio', () => {
    expect(parseDuration('2h 30m')).toBe(2.5);
    expect(parseDuration('2h30m')).toBe(2.5);
    expect(parseDuration('1d 2h')).toBe(26);
    expect(parseDuration('45m')).toBe(0.75);
    expect(parseDuration('1h 15m 36s')).toBe(1.26);
  });
  it('ore:minute', () => {
    expect(parseDuration('2:15')).toBe(2.25);
  });
  it('respinge textul neînțeles', () => {
    expect(parseDuration('2h abc')).toBeNaN();
    expect(parseDuration('mult')).toBeNaN();
  });
});

describe('contact', () => {
  it('normalizează numere românești', () => {
    expect(waNumber('0722 123 456')).toBe('40722123456');
    expect(waNumber('+40 722-123-456')).toBe('40722123456');
    expect(waNumber('0040722123456')).toBe('40722123456');
    expect(waNumber('12')).toBeNull();
    expect(waNumber(null)).toBeNull();
  });
  it('link WhatsApp cu text codificat', () => {
    expect(waLink('0722123456', 'Bună ziua!')).toBe('https://wa.me/40722123456?text=Bun%C4%83%20ziua!');
  });
  it('mesaje potrivite statusului', () => {
    const o = { ...seedLike()[0], status: 'finalizata' as const, pret_vanzare: 100, suma_incasata: 40 };
    const t = messageTemplates(o, 'Ana Pop');
    expect(t[0].id).toBe('gata');
    expect(t[0].text).toContain('Bună Ana!');
    expect(t[0].text).toContain('60 lei');
    expect(t.some((x) => x.id === 'plata')).toBe(true);
  });
});

describe('text copiat din slicer', () => {
  it('Bambu Studio: total filament + timp', () => {
    const r = parseSlicerText('Model printing time: 2h21m\nTotal time: 2h35m12s\nFilament: 15.12 m  45.23 g\nTotal filament: 45.23 g');
    expect(r.grams).toBe(45.23);
    expect(r.hours).toBe(2.59);
  });
  it('mai multe filamente fără total se adună', () => {
    const r = parseSlicerText('Filament 1: 30 g\nFilament 2: 12,5 g\nTimp: 1d 3h');
    expect(r.grams).toBe(42.5);
    expect(r.hours).toBe(27);
  });
  it('pe un singur rând, cu metri și kg', () => {
    expect(parseSlicerText('3.2 m · 1.2 kg · 14h 5m')).toEqual({ grams: 1200, hours: 14.08 });
    expect(parseSlicerText('45m 30s, 12g')).toEqual({ grams: 12, hours: 0.76 });
  });
  it('fără date', () => {
    expect(parseSlicerText('nimic aici')).toEqual({});
  });
});
