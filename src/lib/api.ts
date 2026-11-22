// Toate apelurile către Supabase, cu mesaje de eroare în română.
import type {
  Client, ClientInput, Order, OrderEvent, OrderInput, OrderStatus, Payment, PaymentInput, Settings, SettingsInput,
} from '@/types/db';
import { PHOTO_BUCKET, supabase } from './supabase';

export class ApiError extends Error {}

/** Traduce erorile tehnice în mesaje pe înțeles. */
export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err);
  const m = raw.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Utilizator sau parolă greșită.';
  if (m.includes('email not confirmed')) return 'Emailul nu este confirmat. Confirmă-l din Supabase (Authentication → Users).';
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('network request failed'))
    return 'Nu există conexiune la server. Verifică internetul și încearcă din nou.';
  if (m.includes('jwt') || m.includes('not authenticated')) return 'Sesiunea a expirat. Autentifică-te din nou.';
  if (m.includes('row-level security')) return 'Nu ai permisiunea pentru această operație.';
  if (m.includes('violates foreign key')) return 'Elementul este folosit în altă parte și nu poate fi modificat.';
  if (m.includes('violates check constraint')) return 'Unele valori nu sunt valide. Verifică formularul.';
  if (m.includes('payload too large') || m.includes('exceeded the maximum')) return 'Fișierul este prea mare (maxim 5 MB).';
  if (m.includes('mime type')) return 'Tipul fișierului nu este acceptat. Folosește JPG, PNG sau WEBP.';
  return raw || 'A apărut o eroare neașteptată.';
}

function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw new ApiError(friendlyError(res.error));
  return res.data;
}

// ------------------------------------------------------------------ citire

export async function fetchAll() {
  const [clients, orders, payments, settings] = await Promise.all([
    supabase.from('clients').select('*').order('nume'),
    supabase.from('orders').select('*').order('id', { ascending: false }),
    supabase.from('payments').select('*').order('data', { ascending: false }),
    supabase.from('settings').select('*').maybeSingle(),
  ]);
  return {
    clients: check(clients) as Client[],
    orders: check(orders) as Order[],
    payments: check(payments) as Payment[],
    settings: check(settings) as Settings | null,
  };
}

export async function ensureSettings(): Promise<Settings> {
  // de obicei rândul e creat automat de trigger; aici e doar o plasă de siguranță
  check(await supabase.from('settings').upsert({ adaos_procent: 100 }, { onConflict: 'user_id', ignoreDuplicates: true }));
  return check(await supabase.from('settings').select('*').single()) as Settings;
}

export async function fetchEvents(orderId: number): Promise<OrderEvent[]> {
  const res = await supabase.from('order_events').select('*').eq('order_id', orderId).order('created_at', { ascending: false }).order('id', { ascending: false });
  return check(res) as OrderEvent[];
}

// ------------------------------------------------------------------ clienți

export async function saveClient(input: ClientInput, id?: number): Promise<Client> {
  const res = id
    ? await supabase.from('clients').update(input).eq('id', id).select('*').single()
    : await supabase.from('clients').insert(input).select('*').single();
  return check(res) as Client;
}

export async function deleteClient(id: number) {
  check(await supabase.from('clients').delete().eq('id', id));
}

// ------------------------------------------------------------------ comenzi

export async function saveOrder(input: OrderInput, id?: number): Promise<Order> {
  const res = id
    ? await supabase.from('orders').update(input).eq('id', id).select('*').single()
    : await supabase.from('orders').insert(input).select('*').single();
  return check(res) as Order;
}

/** Actualizare parțială (ex. datele de print după proiectare). */
export async function patchOrder(id: number, patch: Partial<OrderInput>): Promise<Order> {
  const res = await supabase.from('orders').update(patch).eq('id', id).select('*').single();
  return check(res) as Order;
}

export async function setOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  const res = await supabase.from('orders').update({ status }).eq('id', id).select('*').single();
  return check(res) as Order;
}

/** Readuce statusul anterior (butonul „Anulează”), păstrând și locul din coadă. */
export async function restoreStatus(id: number, status: OrderStatus, pozitie: number | null): Promise<Order> {
  const patch: Partial<Order> = { status };
  if (status === 'in_coada' && pozitie != null) patch.pozitie_in_coada = pozitie;
  const res = await supabase.from('orders').update(patch).eq('id', id).select('*').single();
  return check(res) as Order;
}

export async function deleteOrder(order: Pick<Order, 'id' | 'poza_url'>) {
  check(await supabase.from('orders').delete().eq('id', order.id));
  if (order.poza_url) await supabase.storage.from(PHOTO_BUCKET).remove([order.poza_url]);
}

export async function reorderQueue(ids: number[]) {
  check(await supabase.rpc('reorder_queue', { ids }));
}

// ------------------------------------------------------------------ încasări

export async function addPayment(input: PaymentInput): Promise<Payment> {
  return check(await supabase.from('payments').insert(input).select('*').single()) as Payment;
}

export async function deletePayment(id: number) {
  check(await supabase.from('payments').delete().eq('id', id));
}

// ------------------------------------------------------------------ setări

export async function saveSettings(input: SettingsInput): Promise<Settings> {
  const res = await supabase.from('settings').upsert(input, { onConflict: 'user_id' }).select('*').single();
  return check(res) as Settings;
}

// ------------------------------------------------------------------ poze

/** Micșorează poza în browser (max 1600 px, JPEG) ca să economisească spațiu. */
async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/heic' || file.type === 'image/heif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadPhoto(file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new ApiError('Sesiunea a expirat. Autentifică-te din nou.');
  const blob = await compressImage(file);
  const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
  check(await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type || file.type, upsert: false }));
  return path;
}

export async function removePhoto(path: string) {
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

const urlCache = new Map<string, { url: string; exp: number }>();

export async function photoUrl(path: string): Promise<string> {
  const hit = urlCache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const res = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  const url = check(res)?.signedUrl;
  if (!url) throw new ApiError("Poza nu a putut fi încărcată.");
  urlCache.set(path, { url, exp: Date.now() + 50 * 60_000 });
  return url;
}
