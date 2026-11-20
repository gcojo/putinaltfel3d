import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** false dacă lipsesc cheile din .env.local – aplicația afișează instrucțiuni. */
export const isConfigured = Boolean(url && key);

export const supabase = createClient(url || 'http://localhost:54321', key || 'lipseste-cheia', {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const PHOTO_BUCKET = 'poze-comenzi';
