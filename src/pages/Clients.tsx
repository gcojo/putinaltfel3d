import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, Search, Users } from 'lucide-react';
import { useData } from '@/hooks/useData';
import { clientStats, type ClientStat } from '@/lib/stats';
import { dateShort, lei, num } from '@/lib/format';
import { PageHeader } from '@/components/layout/AppLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { EmptyState, ErrorBanner, SkeletonRows } from '@/components/ui/Feedback';
import { ClientFormPanel } from '@/components/clients/ClientForm';

type SortKey = 'nume' | 'count' | 'spent' | 'due' | 'last';

function Ranking({ title, rows, value, format }: { title: string; rows: ClientStat[]; value: (s: ClientStat) => number; format: (v: number) => string }) {
  const top = [...rows].filter((r) => value(r) > 0).sort((a, b) => value(b) - value(a)).slice(0, 5);
  const max = Math.max(1, ...top.map(value));
  return (
    <Card>
      <CardHeader title={title} />
      {top.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted">Încă nu există date.</p>
      ) : (
        <ol className="flex flex-col gap-3 p-4">
          {top.map((r, i) => (
            <li key={r.client.id} className="num">
              <Link to={`/clienti/${r.client.id}`} className="group block">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="w-4 text-muted">{i + 1}</span>
                    <span className="truncate group-hover:underline">{r.client.nume}</span>
                  </span>
                  <span>{format(value(r))}</span>
                </div>
                <div className="ml-6 mt-1.5 h-1 rounded-full bg-ink/[0.07]">
                  <div className={`h-full rounded-full ${i === 0 ? 'bg-gradient-to-r from-accent to-accent-2' : 'bg-accent/30'}`} style={{ width: `${(value(r) / max) * 100}%` }} />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export default function ClientsPage() {
  const { clients, orders, loading, error, reload } = useData();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: 'spent', dir: -1 });
  const [formOpen, setFormOpen] = useState(false);

  const stats = useMemo(() => clientStats(clients, orders), [clients, orders]);
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return stats
      .filter((s) => !n || `${s.client.nume} ${s.client.oras ?? ''} ${s.client.telefon ?? ''} ${s.client.email ?? ''}`.toLowerCase().includes(n))
      .sort((a, b) => {
        const v = (s: ClientStat) => (sort.k === 'nume' ? s.client.nume.toLowerCase() : sort.k === 'last' ? s.last ?? '' : s[sort.k]);
        const va = v(a), vb = v(b);
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
  }, [stats, q, sort]);

  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th className={right ? 'text-right' : ''}>
      <button
        onClick={() => setSort((s) => ({ k, dir: s.k === k ? ((-s.dir) as 1 | -1) : k === 'nume' ? 1 : -1 }))}
        className={`inline-flex items-center gap-1 uppercase hover:text-fg ${sort.k === k ? 'text-fg' : ''}`}
      >
        {children}
        {sort.k === k && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <>
      <PageHeader
        title="Clienți"
        sub={`${clients.length} clienți`}
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
            Client nou
          </Button>
        }
      />
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={reload} />
        </div>
      )}

      {loading ? (
        <Card>
          <SkeletonRows rows={5} cols={5} />
        </Card>
      ) : clients.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="Niciun client încă"
            text="Adaugă clienți aici sau direct din formularul de comandă."
            action={<Button variant="primary" onClick={() => setFormOpen(true)}>Client nou</Button>}
          />
        </Card>
      ) : (
        <div className="stagger flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Ranking title="Top după nr. comenzi" rows={stats} value={(s) => s.count} format={(v) => `${v} ${v === 1 ? 'comandă' : 'comenzi'}`} />
            <Ranking title="Top după bani" rows={stats} value={(s) => s.spent} format={(v) => lei(v)} />
          </div>

          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută nume, oraș, telefon…" className="pl-8" aria-label="Caută client" />
          </div>

          {rows.length === 0 ? (
            <Card>
              <EmptyState title="Niciun client găsit" text="Încearcă alt termen de căutare." />
            </Card>
          ) : (
            <>
              <Card className="hidden overflow-x-auto md:block">
                <table className="table-dense num w-full">
                  <thead>
                    <tr>
                      <Th k="nume">Client</Th>
                      <th>Oraș</th>
                      <th>Telefon</th>
                      <Th k="count" right>Comenzi</Th>
                      <Th k="spent" right>Total cheltuit</Th>
                      <Th k="due" right>De încasat</Th>
                      <Th k="last">Ultima comandă</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.client.id} className="cursor-pointer" onClick={() => navigate(`/clienti/${s.client.id}`)}>
                        <td>{s.client.nume}</td>
                        <td className="text-muted">{s.client.oras ?? '—'}</td>
                        <td className="text-muted">{s.client.telefon ?? '—'}</td>
                        <td className="text-right">{num(s.count)}</td>
                        <td className="text-right">{lei(s.spent)}</td>
                        <td className={`text-right ${s.due > 0 ? 'text-warning' : 'text-muted-2'}`}>{lei(s.due)}</td>
                        <td className="text-muted">{s.last ? dateShort(s.last) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <div className="flex flex-col gap-2 md:hidden">
                {rows.map((s) => (
                  <Link key={s.client.id} to={`/clienti/${s.client.id}`} className="card num flex items-center justify-between gap-3 p-3.5 active:bg-surface-2">
                    <div className="min-w-0">
                      <div className="truncate text-md">{s.client.nume}</div>
                      <div className="text-xs text-muted">
                        {s.client.oras ?? '—'} · ultima {s.last ? dateShort(s.last) : '—'}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-md">{lei(s.spent)}</div>
                      <div className="text-xs text-muted">{s.count} comenzi</div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <ClientFormPanel open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  );
}
