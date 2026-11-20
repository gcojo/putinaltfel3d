// Formatare în stil „cifre, nu text”: separator zecimal punct, mii cu spațiu.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** 1234.5 -> „1 234.5” */
export function num(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${value < 0 && Number(fixed) !== 0 ? '−' : ''}${grouped}${dec ? `.${dec}` : ''}`;
}

/** Afișează zecimale doar când e nevoie: 3 -> „3”, 3.5 -> „3.5”, 3.25 -> „3.25”. */
export function smart(value: number, maxDecimals = 2): string {
  const rounded = Number(value.toFixed(maxDecimals));
  const decimals = Number.isInteger(rounded) ? 0 : String(rounded).split('.')[1]?.length ?? 0;
  return num(rounded, Math.min(decimals, maxDecimals));
}

export function lei(value: number, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? !Number.isInteger(Math.round(value * 100) / 100);
  return `${num(value, decimals ? 2 : 0)} lei`;
}

export function hours(value: number): string {
  return `${smart(value, 1)} h`;
}

/** Diferență în zile cu semn: „+1.5 zile”, „−0.4 zile”. */
export function signedDays(valueDays: number): string {
  const r = Math.round(valueDays * 10) / 10;
  const sign = r > 0 ? '+' : r < 0 ? '−' : '±';
  const abs = Math.abs(r);
  return `${sign}${smart(abs, 1)} ${abs === 1 ? 'zi' : 'zile'}`;
}

export function signedHours(valueHours: number): string {
  if (Math.abs(valueHours) >= 24) return signedDays(valueHours / 24);
  const r = Math.round(valueHours * 10) / 10;
  return `${r > 0 ? '+' : r < 0 ? '−' : '±'}${smart(Math.abs(r), 1)} h`;
}

export function pct(value: number): string {
  return `${Math.round(value)}%`;
}

export function grams(value: number): string {
  return value >= 1000 ? `${smart(value / 1000, 2)} kg` : `${smart(value, 0)} g`;
}

// ------------------------------------------------------------------ date

const MONTHS_SHORT = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS_SHORT = ['dum', 'lun', 'mar', 'mie', 'joi', 'vin', 'sâm'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Parsează „YYYY-MM-DD” ca dată locală (nu UTC). */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayYmd(): string {
  return toYmd(new Date());
}

/** Sfârșitul zilei deadline-ului (23:59:59.999, ora locală). */
export function deadlineEnd(ymd: string): Date {
  const d = parseYmd(ymd);
  d.setHours(23, 59, 59, 999);
  return d;
}

const asDate = (v: string | Date) => (typeof v === 'string' ? (v.length === 10 ? parseYmd(v) : new Date(v)) : v);

/** „21 nov 2026” */
export function date(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = asDate(v);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** „21 nov” (fără an dacă e anul curent) */
export function dateShort(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = asDate(v);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${sameYear ? '' : ` ${String(d.getFullYear()).slice(2)}`}`;
}

/** „joi 21 nov, 14:30” */
export function dateTime(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = asDate(v);
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function time(v: string | Date): string {
  const d = asDate(v);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** „azi 14:30”, „mâine 09:00”, altfel dateTime */
export function relativeDateTime(v: Date, now = new Date()): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(v) - startOf(now)) / DAY);
  if (diff === 0) return `azi, ${time(v)}`;
  if (diff === 1) return `mâine, ${time(v)}`;
  return dateTime(v);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
}

export function monthKey(v: string | Date): string {
  const d = asDate(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / DAY;
}

export { HOUR, DAY };
