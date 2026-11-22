// Interpretează ce scrii în câmpuri, inclusiv formatele copiate din Bambu Studio.

/** „12,5” / „12.5 g” / „1 234” -> număr; NaN dacă nu e un număr. */
export function parseNumber(s: string): number {
  const t = String(s).trim().replace(/\s+/g, '').replace(/(g|lei|h|buc)$/i, '').replace(',', '.');
  return t === '' ? NaN : Number(t);
}

/**
 * Durată în ore. Acceptă:
 * - „3.5”, „3,5” (ore)
 * - „2h 35m”, „2h35m”, „1d 3h 20m”, „45m”, „30s” (format Bambu Studio)
 * - „2:35” (ore:minute)
 */
export function parseDuration(s: string): number {
  const t = String(s).trim().toLowerCase();
  if (!t) return NaN;
  const plain = parseNumber(t);
  if (Number.isFinite(plain)) return plain;

  const hm = t.match(/^(\d+):(\d{1,2})$/);
  if (hm) return Number(hm[1]) + Number(hm[2]) / 60;

  const re = /(\d+(?:[.,]\d+)?)\s*(zile|zi|d|ore|ora|h|min|m|sec|s)(?![a-zăîâșț])/g;
  let total = 0;
  let matched = '';
  for (const m of t.matchAll(re)) {
    const v = Number(m[1].replace(',', '.'));
    const u = m[2];
    total += u === 'd' || u.startsWith('zi') ? v * 24 : u === 'h' || u.startsWith('or') ? v : u.startsWith('m') ? v / 60 : v / 3600;
    matched += m[0];
  }
  // tot textul (fără spații) trebuie să fi fost înțeles
  if (!matched || matched.replace(/\s/g, '') !== t.replace(/\s/g, '')) return NaN;
  return Math.round(total * 100) / 100;
}

export interface SlicerInfo {
  /** grame totale */
  grams?: number;
  /** ore totale */
  hours?: number;
}

const GRAMS_RE = /(\d+(?:[.,]\d+)?)\s*(kg|g)(?![a-zăîâșț])/gi;
// durate: „2h35m12s”, „1d 3h”, „45m”, „2.5 h”, „2 ore 30 min” — fără metri cu zecimale („12.34 m”)
const TIME_RE = /(?<![\d.,])(?:\d+(?:[.,]\d+)?\s*(?:zile|zi|d|ore|ora|h)(?:\s*\d+\s*(?:ore|ora|h|min|m|sec|s)(?![a-zăîâșț]))*|\d+\s*(?:min|m)(?:\s*\d+\s*(?:sec|s))?)(?![a-zăîâșț])/gi;

/**
 * Citește gramele și timpul din textul copiat din Bambu Studio / MakerWorld / Bambu Handy.
 * Preferă rândurile cu „total”; fără total, gramele de pe rânduri diferite (mai multe filamente) se adună.
 */
export function parseSlicerText(text: string): SlicerInfo {
  const lines = String(text).split(/\r?\n|;|\|/).map((l) => l.trim()).filter(Boolean);
  const out: SlicerInfo = {};

  const gramLines = lines
    .map((l) => {
      const ms = [...l.matchAll(GRAMS_RE)];
      if (!ms.length) return null;
      const m = ms[ms.length - 1]; // „12.34 m 37.21 g” -> ultima valoare
      const v = Number(m[1].replace(',', '.')) * (m[2].toLowerCase() === 'kg' ? 1000 : 1);
      return { v, total: /total|totală|totale/i.test(l) };
    })
    .filter((x): x is { v: number; total: boolean } => !!x && x.v > 0);
  const totalG = gramLines.find((g) => g.total);
  if (totalG) out.grams = totalG.v;
  else if (gramLines.length) out.grams = gramLines.reduce((a, g) => a + g.v, 0);

  const timeLines = lines
    .map((l) => {
      const m = [...l.matchAll(TIME_RE)].map((x) => x[0]).find((x) => Number.isFinite(parseDuration(x)));
      return m ? { v: parseDuration(m), total: /total|totală|totale/i.test(l), strong: /[dh]|zi|or/i.test(m) } : null;
    })
    .filter((x): x is { v: number; total: boolean; strong: boolean } => !!x && x.v > 0);
  const t = timeLines.find((x) => x.total) ?? timeLines.find((x) => x.strong) ?? timeLines[0];
  if (t) out.hours = t.v;

  if (out.grams != null) out.grams = Math.round(out.grams * 100) / 100;
  return out;
}
