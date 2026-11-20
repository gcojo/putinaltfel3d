/**
 * Supabase se autentifică doar cu email. Ca să poți intra cu un nume de utilizator (ex. „admin”),
 * numele e transformat într-o adresă internă: „admin” → „admin@putinaltfel3d.local”.
 * Contul din Supabase trebuie să aibă exact adresa asta (vezi README → „Login cu utilizator”).
 */
export const USERNAME_DOMAIN = 'putinaltfel3d.local';

/** Ce a scris utilizatorul în câmp → emailul trimis la Supabase. `null` = format invalid. */
export function loginToEmail(input: string): string | null {
  const v = input.trim().toLowerCase();
  if (!v) return null;
  if (v.includes('@')) return /^\S+@\S+\.\S+$/.test(v) ? v : null;
  // nume de utilizator: litere, cifre, punct, minus, underscore
  return /^[a-z0-9._-]+$/.test(v) ? `${v}@${USERNAME_DOMAIN}` : null;
}
