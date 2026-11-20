-- =====================================================================
-- seed.sql — Date de test: 5 clienți, 15 comenzi în statusuri diferite.
-- Rulează DUPĂ ce ai creat utilizatorul admin (datele îi sunt atribuite lui).
-- ATENȚIE: șterge comenzile și clienții existenți ai adminului!
-- Datele sunt relative la ziua rulării (comanda #12 ratează deadline-ul).
-- =====================================================================
do $$
declare
  uid uuid;
  c1 bigint; c2 bigint; c3 bigint; c4 bigint; c5 bigint;
  o  bigint;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then
    raise exception 'Nu există niciun utilizator. Creează întâi userul admin (Authentication -> Users -> Add user).';
  end if;

  delete from public.orders  where user_id = uid;
  delete from public.clients where user_id = uid;
  insert into public.settings (user_id) values (uid) on conflict (user_id) do nothing;

  -- ---------------- clienți ----------------
  insert into public.clients (user_id, nume, telefon, email, oras, note, created_at)
  values (uid, 'Andrei Popescu', '0722 123 456', 'andrei.popescu@example.com', 'Cluj-Napoca', 'Preferă PLA negru mat.', now() - interval '160 days')
  returning id into c1;
  insert into public.clients (user_id, nume, telefon, email, oras, note, created_at)
  values (uid, 'Maria Ionescu', '0744 555 210', 'maria.ionescu@example.com', 'București', null, now() - interval '100 days')
  returning id into c2;
  insert into public.clients (user_id, nume, telefon, email, oras, note, created_at)
  values (uid, 'Atelier Lemn & Co', '0368 401 900', 'comenzi@atelierlemn.example.com', 'Brașov', 'Firmă – cere factură.', now() - interval '130 days')
  returning id into c3;
  insert into public.clients (user_id, nume, telefon, email, oras, note, created_at)
  values (uid, 'Radu Georgescu', '0751 908 334', null, 'Iași', null, now() - interval '95 days')
  returning id into c4;
  insert into public.clients (user_id, nume, telefon, email, oras, note, created_at)
  values (uid, 'Elena Dumitru', '0733 777 018', 'elena.d@example.com', 'Timișoara', 'Comenzi cadou.', now() - interval '25 days')
  returning id into c5;

  -- ---------------- comenzi livrate / finalizate (istoric) ----------------
  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, data_start, data_finalizare)
  values (uid, c1, 'Suport căști birou', 'PLA', 'Negru', 120, 4.5, 1, 60,
          'livrata', current_date - 150, current_date - 145, now() - interval '148 days', now() - interval '148 days' + interval '4.5 hours')
  returning id into o;
  insert into public.payments (user_id, order_id, suma, data, metoda) values (uid, o, 60, current_date - 147, 'numerar');

  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, data_start, data_finalizare)
  values (uid, c3, 'Set 10 brelocuri cu logo', 'PETG', 'Alb', 180, 6, 10, 150,
          'livrata', current_date - 120, current_date - 112, now() - interval '118 days', now() - interval '118 days' + interval '6 hours')
  returning id into o;
  insert into public.payments (user_id, order_id, suma, data, metoda) values (uid, o, 150, current_date - 116, 'transfer');

  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, data_start, data_finalizare)
  values (uid, c4, 'Carcasă Raspberry Pi 5', 'PETG', 'Gri', 95, 3.5, 1, 55,
          'livrata', current_date - 90, current_date - 84, now() - interval '88 days', now() - interval '88 days' + interval '3.5 hours')
  returning id into o;
  insert into public.payments (user_id, order_id, suma, data, metoda) values (uid, o, 55, current_date - 87, 'card');

  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, data_start, data_finalizare, note)
  values (uid, c2, 'Vază spirală', 'PLA', 'Silk auriu', 210, 8, 1, 120,
          'livrata', current_date - 60, current_date - 52, now() - interval '58 days', now() - interval '58 days' + interval '8 hours',
          'Restul de bani la următoarea comandă.')
  returning id into o;
  insert into public.payments (user_id, order_id, suma, data, metoda) values (uid, o, 60, current_date - 57, 'numerar');

  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, data_start, data_finalizare)
  values (uid, c4, 'Piese schimb dronă', 'TPU', 'Negru', 60, 2.5, 4, 80,
          'finalizata', current_date - 35, current_date - 28, now() - interval '31 days', now() - interval '31 days' + interval '2.5 hours')
  returning id into o;
  insert into public.payments (user_id, order_id, suma, data, metoda) values (uid, o, 80, current_date - 30, 'transfer');

  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, data_start, data_finalizare)
  values (uid, c1, 'Organizator birou modular', 'PLA', 'Alb', 340, 11, 1, 160,
          'finalizata', current_date - 14, current_date - 8, now() - interval '11 days', now() - interval '11 days' + interval '11 hours');
  -- neîncasată -> avertisment

  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, note)
  values (uid, c5, 'Figurine D&D', 'PLA', 'Gri', 40, 3, 2, 70,
          'anulata', current_date - 20, current_date - 12, 'Clientul a renunțat.');

  -- ---------------- se printează acum ----------------
  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, data_start)
  values (uid, c5, 'Suport telefon birou', 'PLA', 'Negru', 150, 5.5, 1, 65,
          'se_printeaza', current_date - 3, current_date + 2, now() - interval '3 hours')
  returning id into o;
  insert into public.payments (user_id, order_id, suma, data, metoda) values (uid, o, 30, current_date - 3, 'numerar');

  -- ---------------- coadă ----------------
  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, pozitie_in_coada)
  values (uid, c3, 'Panouri decorative hexagon', 'PLA', 'Alb', 520, 10, 6, 260, 'in_coada', current_date - 4, current_date + 6, 1);

  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, pozitie_in_coada)
  values (uid, c3, 'Prototip carcasă senzor', 'ABS', 'Negru', 380, 12, 2, 320, 'in_coada', current_date - 3, current_date + 5, 2)
  returning id into o;
  insert into public.payments (user_id, order_id, suma, data, metoda) values (uid, o, 160, current_date - 2, 'transfer');

  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, pozitie_in_coada)
  values (uid, c2, 'Lampă lithophane', 'PLA', 'Alb', 160, 8.5, 1, 140, 'in_coada', current_date - 2, current_date + 8, 3);

  -- ratează deadline-ul: urgentă, termen mâine, dar e a 4-a în coadă
  insert into public.orders (user_id, client_id, titlu, descriere, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, prioritate, data_comanda, deadline, pozitie_in_coada)
  values (uid, c5, 'Nume 3D cadou aniversare', 'Text „ANA” 20 cm, bază cu LED.', 'PLA', 'Roșu', 90, 4, 1, 75,
          'in_coada', 'urgenta', current_date - 1, current_date + 1, 4);

  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline, pozitie_in_coada)
  values (uid, c1, 'Clipsuri cablu x50', 'PETG', 'Negru', 200, 7, 50, 90, 'in_coada', current_date - 1, current_date + 4, 5);

  -- ---------------- noi (neprogramate) ----------------
  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline)
  values (uid, c4, 'Mânere sertar personalizate x8', 'PLA', 'Negru', 140, 5, 8, 96, 'noua', current_date, current_date + 10);

  insert into public.orders (user_id, client_id, titlu, material, culoare, grame_filament, durata_print_ore, nr_bucati, pret_vanzare,
                             status, data_comanda, deadline)
  values (uid, c5, 'Mască cosplay', 'PLA', 'Gri', 650, 22, 1, 380, 'noua', current_date, current_date + 14);
end $$;
