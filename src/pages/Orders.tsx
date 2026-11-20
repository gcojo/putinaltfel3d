import { useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Download, Plus, Search, X } from 'lucide-react';
import type { Order } from '@/types/db';
import { useData } from '@/hooks/useData';
import { amountDue } from '@/lib/calc';
import { STATUSES } from '@/lib/constants';
import { exportOrders, exportPayments } from '@/lib/csv';
import { dateShort, hours, lei, signedHours } from '@/lib/format';
import type { ScheduledItem } from '@/lib/schedule';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { Dot, PaidSignal, Signal, riskSignal } from '@/components/ui/Status';
import { EmptyState, ErrorBanner, SkeletonRows } from '@/components/ui/Feedback';
import { StatusMenu } from '@/components/orders/StatusMenu';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';

type SortKey = 'id' | 'titlu' | 'client' | 'status' | 'durata' | 'deadline' | 'pret' | 'rest';
const STATUS_ORDER = Object.fromEntries(STATUSES.map((s, i) => [s.value, i]));

function DeadlineCell({ order, item }: { order: Order; item?: ScheduledItem }) {
  if (!order.deadline) return <span className="text-muted-2">—</span>;
  return (
    <span className="flex items-center gap-1.5">
      {item && <Dot signal={riskSignal(item.risk)} />}
      <span>{dateShort(order.deadline)}</span>
      {item && item.risk !== 'ok' && item.marginHours != null && (
        <span className={item.risk === 'late' ? 'text-critical' : 'text-warning'}>{signedHours(item.marginHours)}</span>
      )}
    </span>
  );
}

export default function OrdersPage() {
  const { orders, clients, payments, settings, schedule, loading, error, reload, clientById } = useData();
  const { openOrder, newOrder } = useOrderPanel();
  const [params, setParams] = useSearchParams();
  const focusSearch = !!(useLocation().state as { focusSearch?: boolean } | null)?.focusSearch;

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? 'active';
  const client = params.get('client') ?? '';
  const platit = params.get('platit') ?? '';
  const sort = (params.get('sort') ?? 'id') as SortKey;
  const dir = params.get('dir') === 'asc' ? 1 : -1;

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  const toggleSort = (k: SortKey) => {
    const next = new URLSearchParams(params);
    if (sort === k) next.set('dir', dir === 1 ? 'desc' : 'asc');
    else {
      next.set('sort', k);
      next.set('dir', k === 'titlu' || k === 'client' || k === 'deadline' ? 'asc' : 'desc');
    }
    setParams(next, { replace: true });
  };

  const scheduled = useMemo(() => new Map(schedule.items.map((i) => [i.order.id, i])), [schedule]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = orders.filter((o) => {
      if (status === 'active' && (o.status === 'livrata' || o.status === 'anulata')) return false;
      if (status !== 'active' && status !== 'toate' && o.status !== status) return false;
      if (client && String(o.client_id ?? '') !== client) return false;
      if (platit === 'neplatit' && !(o.platit !== 'da' && amountDue(o) > 0)) return false;
      if (platit && platit !== 'neplatit' && o.platit !== platit) return false;
      if (needle) {
        const hay = `#${o.id} ${o.titlu} ${o.descriere ?? ''} ${o.material} ${o.culoare ?? ''} ${clientById(o.client_id)?.nume ?? ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const val = (o: Order): string | number => {
      switch (sort) {
        case 'titlu': return o.titlu.toLowerCase();
        case 'client': return clientById(o.client_id)?.nume.toLowerCase() ?? '~';
        case 'status': return STATUS_ORDER[o.status];
        case 'durata': return Number(o.durata_print_ore);
        case 'deadline': return o.deadline ?? '9999';
        case 'pret': return Number(o.pret_vanzare);
        case 'rest': return amountDue(o);
        default: return o.id;
      }
    };
    return list.sort((a, b) => {
      const va = val(a), vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir || b.id - a.id;
    });
  }, [orders, q, status, client, platit, sort, dir, clientById]);

  const filtered = q || status !== 'active' || client || platit;
  const totalPret = rows.reduce((a, o) => a + Number(o.pret_vanzare), 0);
  const totalRest = rows.reduce((a, o) => a + amountDue(o), 0);

  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th className={right ? 'text-right' : ''}>
      <button onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 uppercase hover:text-fg ${sort === k ? 'text-fg' : ''}`}>
        {children}
        {sort === k && (dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <>
      <PageHeader
        title="Comenzi"
        sub={`${orders.length} comenzi în total`}
        actions={
          <>
            <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => exportOrders(rows, clients, settings)} disabled={!rows.length}>
              CSV comenzi
            </Button>
            <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => exportPayments(payments, orders, clients)} disabled={!payments.length}>
              CSV încasări
            </Button>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => newOrder()} className="hidden md:inline-flex" title="Comandă nouă (tasta N)">
              Comandă nouă
            </Button>
          </>
        }
      />

      {/* Filtre */}
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <div className="relative col-span-2 md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            id="cauta-comenzi"
            type="search"
            value={q}
            onChange={(e) => setParam('q', e.target.value)}
            onKeyDown={(e) => {
              // Enter cu un singur rezultat -> îl deschide direct
              if (e.key === 'Enter' && rows.length === 1) openOrder(rows[0].id);
              if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
            }}
            autoFocus={focusSearch}
            placeholder="Caută titlu, client, #nr…  ( / )"
            className="pl-8"
            aria-label="Caută"
          />
        </div>
        <Select value={status} onChange={(e) => setParam('status', e.target.value === 'active' ? '' : e.target.value)} className="md:w-40" aria-label="Status">
          <option value="active">Active</option>
          <option value="toate">Toate statusurile</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select value={platit} onChange={(e) => setParam('platit', e.target.value)} className="md:w-36" aria-label="Plată">
          <option value="">Orice plată</option>
          <option value="da">Plătit</option>
          <option value="partial">Parțial</option>
          <option value="nu">Neplătit</option>
          <option value="neplatit">Cu rest de plată</option>
        </Select>
        <Select value={client} onChange={(e) => setParam('client', e.target.value)} className="md:w-44" aria-label="Client">
          <option value="">Toți clienții</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nume}
            </option>
          ))}
        </Select>
        <Select
          value={`${sort}:${dir === 1 ? 'asc' : 'desc'}`}
          onChange={(e) => {
            const [s, d] = e.target.value.split(':');
            const next = new URLSearchParams(params);
            next.set('sort', s);
            next.set('dir', d);
            setParams(next, { replace: true });
          }}
          className="md:hidden"
          aria-label="Sortare"
        >
          <option value="id:desc">Cele mai noi</option>
          <option value="deadline:asc">Deadline apropiat</option>
          <option value="pret:desc">Preț mare</option>
          <option value="rest:desc">Rest de plată</option>
          <option value="client:asc">Client A–Z</option>
        </Select>
        {filtered && (
          <Button size="sm" variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => setParams({}, { replace: true })} className="col-span-2 md:col-span-1">
            Resetează filtrele
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={reload} />
        </div>
      )}

      {loading ? (
        <Card>
          <SkeletonRows rows={8} cols={7} />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          {orders.length === 0 ? (
            <EmptyState
              title="Nicio comandă încă"
              text="Adaugă prima comandă: costul și prețul sugerat se calculează automat."
              action={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => newOrder()}>Comandă nouă</Button>}
            />
          ) : (
            <EmptyState
              title="Nimic nu corespunde filtrelor"
              text="Încearcă alt termen de căutare sau resetează filtrele."
              action={<Button onClick={() => setParams({}, { replace: true })}>Resetează filtrele</Button>}
            />
          )}
        </Card>
      ) : (
        <>
          {/* Desktop: tabel dens */}
          <Card className="hidden overflow-x-auto md:block">
            <table className="table-dense num w-full">
              <thead>
                <tr>
                  <Th k="id">#</Th>
                  <Th k="titlu">Comandă</Th>
                  <Th k="client">Client</Th>
                  <Th k="status">Status</Th>
                  <th>Material</th>
                  <Th k="durata" right>Ore</Th>
                  <Th k="deadline">Deadline</Th>
                  <Th k="pret" right>Preț</Th>
                  <Th k="rest" right>Rest</Th>
                  <th>Plată</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} onClick={() => openOrder(o.id)} className="cursor-pointer">
                    <td className="text-muted">{o.id}</td>
                    <td className="max-w-[280px]">
                      <span className="flex items-center gap-2">
                        <span className="truncate">{o.titlu}</span>
                        {o.prioritate === 'urgenta' && <Signal signal="warning" label="Urg" />}
                      </span>
                    </td>
                    <td className="max-w-[160px] truncate text-muted">{clientById(o.client_id)?.nume ?? '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <StatusMenu order={o} />
                    </td>
                    <td className="text-muted">
                      {o.material}
                      {o.culoare ? ` · ${o.culoare}` : ''}
                    </td>
                    <td className="text-right">{hours(Number(o.durata_print_ore))}</td>
                    <td>
                      <DeadlineCell order={o} item={scheduled.get(o.id)} />
                    </td>
                    <td className="text-right">{lei(Number(o.pret_vanzare))}</td>
                    <td className={`text-right ${amountDue(o) > 0 ? '' : 'text-muted-2'}`}>{lei(amountDue(o))}</td>
                    <td>
                      {o.status !== 'anulata' && <PaidSignal platit={o.platit} />}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7} className="label border-b-0">
                    {rows.length} {rows.length === 1 ? 'comandă' : 'comenzi'}
                  </td>
                  <td className="border-b-0 text-right">{lei(totalPret)}</td>
                  <td className="border-b-0 text-right">{lei(totalRest)}</td>
                  <td className="border-b-0" />
                </tr>
              </tfoot>
            </table>
          </Card>

          {/* Mobil: carduri */}
          <div className="flex flex-col gap-2 md:hidden">
            {rows.map((o) => {
              const item = scheduled.get(o.id);
              const due = amountDue(o);
              return (
                <div key={o.id} role="button" tabIndex={0} onClick={() => openOrder(o.id)} className="card num flex flex-col gap-2 p-3.5 active:bg-surface-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>#{o.id}</span>
                        <span className="truncate">{clientById(o.client_id)?.nume ?? 'Fără client'}</span>
                        {o.prioritate === 'urgenta' && <Signal signal="warning" label="Urg" />}
                      </div>
                      <div className="mt-0.5 truncate text-md">{o.titlu}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-md">{lei(Number(o.pret_vanzare))}</div>
                      {due > 0 && o.status !== 'anulata' && <div className="text-xs text-muted">rest {lei(due)}</div>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span onClick={(e) => e.stopPropagation()}>
                      <StatusMenu order={o} short />
                    </span>
                    <span className="text-muted">
                      {o.material} · {hours(Number(o.durata_print_ore))}
                    </span>
                    <DeadlineCell order={o} item={item} />
                  </div>
                </div>
              );
            })}
            <p className="num py-2 text-center text-xs text-muted">
              {rows.length} comenzi · {lei(totalPret)} · rest {lei(totalRest)}
            </p>
          </div>
        </>
      )}
    </>
  );
}
