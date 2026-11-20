-- =====================================================================
-- 0003_grants.sql — Drepturi explicite pentru userul logat.
-- Proiectele Supabase noi nu mai dau automat acces la tabelele noi.
-- RLS rămâne activ: userul vede în continuare DOAR rândurile lui.
-- Vizitatorii nelogați (anon) NU primesc niciun drept.
-- =====================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.settings, public.clients, public.orders, public.payments to authenticated;
grant select, insert on public.order_events to authenticated;

grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.reorder_queue(bigint[]) to authenticated;
grant execute on function public.calc_cost_material(uuid, text, numeric) to authenticated;
grant execute on function public.status_label(text) to authenticated;

-- nimic pentru anon
revoke all on public.settings, public.clients, public.orders, public.payments, public.order_events from anon;
