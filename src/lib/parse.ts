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
