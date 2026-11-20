// Testează migrațiile + seed-ul pe un Postgres local (PGlite), simulând schemele auth/storage din Supabase.
// Rulare: npm run test:sql
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';

// --- stub Supabase ---
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id serial primary key, bucket_id text, name text);
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  insert into auth.users (id, email, created_at) values ('${A}', 'admin@test.ro', now() - interval '1 day');
`);

await db.exec(read('supabase/migrations/0001_schema.sql'));
await db.exec(read('supabase/migrations/0002_storage.sql'));
await db.exec(read('supabase/migrations/0003_grants.sql'));
console.log('✓ migrații aplicate');

// setări create automat pentru userul existent; userul B primește setări prin trigger
const s = await db.query(`select count(*)::int n from public.settings`);
assert.equal(s.rows[0].n, 1);
await db.exec(`insert into auth.users (id, email) values ('${B}', 'altul@test.ro')`);
assert.equal((await db.query(`select count(*)::int n from public.settings`)).rows[0].n, 2);
console.log('✓ setări create automat (trigger auth.users)');

await db.exec(read('supabase/seed.sql'));
await db.exec(read('supabase/seed.sql')); // idempotent
const counts = await db.query(`select (select count(*)::int from clients) c, (select count(*)::int from orders) o`);
assert.deepEqual(counts.rows[0], { c: 5, o: 15 });
console.log('✓ seed: 5 clienți, 15 comenzi (rulat de 2 ori)');

const st = await db.query(`select status, count(*)::int n from orders group by status order by status`);
console.log('  statusuri:', st.rows.map((r) => `${r.status}=${r.n}`).join(', '));

// cost material: 150 g PLA la 100 lei/kg = 15 lei
const cm = await db.query(`select cost_material::float c, platit, suma_incasata::float s from orders where titlu = 'Suport telefon birou'`);
assert.deepEqual(cm.rows[0], { c: 15, platit: 'partial', s: 30 });
console.log('✓ cost material + status plată calculate');

// RLS: ca user A vede tot; ca user B nu vede nimic
async function as(user, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
await as(A, async () => {
  const r = await db.query(`select count(*)::int n from orders`);
  assert.equal(r.rows[0].n, 15);
});
await as(B, async () => {
  for (const t of ['orders', 'clients', 'payments', 'order_events']) {
    const r = await db.query(`select count(*)::int n from ${t}`);
    assert.equal(r.rows[0].n, 0, `B vede ${t}`);
  }
  await assert.rejects(db.query(`insert into clients (user_id, nume) values ('${A}', 'Intrus')`));
});
console.log('✓ RLS: alt utilizator nu vede și nu poate scrie datele adminului');

// fluxul ca admin: insert comandă -> coadă -> printare -> finalizare -> încasare -> istoric
await as(A, async () => {
  const ins = await db.query(`insert into orders (titlu, material, grame_filament, durata_print_ore, pret_vanzare)
    values ('Test', 'PETG', 1000, 2, 200) returning id, cost_material::float c, status, pozitie_in_coada`);
  const t = ins.rows[0];
  assert.equal(t.c, 110); assert.equal(t.status, 'noua'); assert.equal(t.pozitie_in_coada, null);

  const q = await db.query(`update orders set status = 'in_coada' where id = $1 returning pozitie_in_coada`, [t.id]);
  assert.equal(q.rows[0].pozitie_in_coada, 6);

  // reordonare: Test pe primul loc
  const ids = (await db.query(`select id from orders where status='in_coada' order by pozitie_in_coada`)).rows.map((r) => r.id);
  const newOrder = [t.id, ...ids.filter((i) => i !== t.id)];
  await db.query(`select reorder_queue($1::bigint[])`, [newOrder]);
  const first = await db.query(`select id from orders where status='in_coada' order by pozitie_in_coada limit 1`);
  assert.equal(first.rows[0].id, t.id);

  const p = await db.query(`update orders set status = 'se_printeaza' where id = $1 returning data_start, pozitie_in_coada`, [t.id]);
  assert.ok(p.rows[0].data_start); assert.equal(p.rows[0].pozitie_in_coada, null);
  const f = await db.query(`update orders set status = 'finalizata' where id = $1 returning data_finalizare`, [t.id]);
  assert.ok(f.rows[0].data_finalizare);

  await db.query(`insert into payments (order_id, suma) values ($1, 50)`, [t.id]);
  let o = (await db.query(`select platit, suma_incasata::float s from orders where id=$1`, [t.id])).rows[0];
  assert.deepEqual(o, { platit: 'partial', s: 50 });
  await db.query(`insert into payments (order_id, suma, metoda) values ($1, 150, 'transfer')`, [t.id]);
  o = (await db.query(`select platit, suma_incasata::float s from orders where id=$1`, [t.id])).rows[0];
  assert.deepEqual(o, { platit: 'da', s: 200 });
  await db.query(`delete from payments where order_id=$1 and suma=150`, [t.id]);
  o = (await db.query(`select platit from orders where id=$1`, [t.id])).rows[0];
  assert.equal(o.platit, 'partial');

  const ev = await db.query(`select tip, detalii from order_events where order_id=$1 order by id`, [t.id]);
  console.log('  istoric:', ev.rows.map((r) => r.detalii).join(' | '));
  assert.ok(ev.rows.length >= 6);

  // prețul PETG se schimbă -> se recalculează doar comenzile neprintate
  const before = (await db.query(`select cost_material::float c from orders where id=$1`, [t.id])).rows[0].c;
  await db.query(`update settings set pret_filament_lei_kg = pret_filament_lei_kg || '{"PETG": 200}'::jsonb`);
  const after = (await db.query(`select cost_material::float c from orders where id=$1`, [t.id])).rows[0].c;
  assert.equal(before, after, 'comanda finalizată nu trebuie recalculată');
  const clips = (await db.query(`select cost_material::float c from orders where titlu='Clipsuri cablu x50'`)).rows[0].c;
  assert.equal(clips, 40); // 200 g * 200 lei/kg

  // ștergere comandă cu încasări (cascadă fără erori)
  await db.query(`delete from orders where id=$1`, [t.id]);
});
console.log('✓ flux complet comandă: coadă, reordonare, printare, finalizare, încasări, istoric, ștergere');

// storage: folder propriu permis, folder străin refuzat
await db.exec(`grant usage on schema storage to authenticated; grant all on storage.objects to authenticated; grant usage, select on all sequences in schema storage to authenticated;`);
await as(A, async () => {
  await db.query(`insert into storage.objects (bucket_id, name) values ('poze-comenzi', '${A}/poza.jpg')`);
  await assert.rejects(db.query(`insert into storage.objects (bucket_id, name) values ('poze-comenzi', '${B}/poza.jpg')`));
});
console.log('✓ storage: acces doar la folderul propriu');
console.log('\nToate testele SQL au trecut.');
