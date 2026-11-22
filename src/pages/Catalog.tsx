import { useMemo, useState } from 'react';
import { BookOpen, Plus, Search, ShoppingCart } from 'lucide-react';
import type { Product } from '@/types/db';
import { useData } from '@/hooks/useData';
import { grams, hours, lei } from '@/lib/format';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { EmptyState, ErrorBanner, SkeletonRows } from '@/components/ui/Feedback';
import { MigrationNotice } from '@/components/ui/MigrationNotice';
import { ProductFormPanel } from '@/components/catalog/ProductForm';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';

export default function CatalogPage() {
  const { products, orders, loading, error, reload, migrated } = useData();
  const { newOrder } = useOrderPanel();
  const [q, setQ] = useState('');
  const [form, setForm] = useState<{ open: boolean; product?: Product }>({ open: false });

  // de câte ori a fost comandat (după titlu)
  const sold = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) {
      if (o.status === 'anulata') continue;
      const k = o.titlu.trim().toLowerCase();
      m.set(k, (m.get(k) ?? 0) + Number(o.nr_bucati));
    }
    return m;
  }, [orders]);

  const rows = products.filter((p) => !q.trim() || `${p.nume} ${p.material} ${p.culoare ?? ''} ${p.descriere ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <>
      <PageHeader
        title="Catalog"
        sub="produse pe care le faci des · valori pe bucată"
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ open: true })} disabled={!migrated}>
            Produs nou
          </Button>
        }
      />

      {!migrated && !loading && <MigrationNotice what="Catalogul" />}
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={reload} />
        </div>
      )}

      {loading ? (
        <Card>
          <SkeletonRows rows={5} cols={5} />
        </Card>
      ) : products.length === 0 ? (
        migrated && (
          <Card>
            <EmptyState
              title="Catalogul e gol"
              text="Adaugă produsele pe care le vinzi des (brelocuri, suporturi…). O comandă nouă dintr-un produs se face din 2 apăsări."
              action={
                <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ open: true })}>
                  Primul produs
                </Button>
              }
            />
          </Card>
        )
      ) : (
        <>
          <div className="relative mb-4 md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută în catalog…" className="pl-8" aria-label="Caută în catalog" />
          </div>
          <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((p) => {
              const n = sold.get(p.nume.trim().toLowerCase()) ?? 0;
              return (
                <article key={p.id} className="card flex flex-col">
                  <button onClick={() => setForm({ open: true, product: p })} className="flex flex-1 flex-col gap-1 px-4 pb-3 pt-3.5 text-left">
                    <span className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <BookOpen className="h-4 w-4 shrink-0 text-accent" />
                        <span className="truncate text-md">{p.nume}</span>
                      </span>
                      <span className="num shrink-0 text-lg font-light">{lei(Number(p.pret))}</span>
                    </span>
                    <span className="num text-sm text-muted">
                      {p.material}
                      {p.culoare ? ` · ${p.culoare}` : ''} · {grams(Number(p.grame))} · {hours(Number(p.ore))}
                    </span>
                    {p.descriere && <span className="line-clamp-2 text-sm text-fg/80">{p.descriere}</span>}
                    {n > 0 && <span className="num text-xs text-muted">vândut: {n} buc</span>}
                  </button>
                  <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
                    <Button size="sm" variant="primary" icon={<ShoppingCart className="h-3.5 w-3.5" />} onClick={() => newOrder(undefined, p.id)}>
                      Comandă
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setForm({ open: true, product: p })}>
                      Editează
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <ProductFormPanel open={form.open} product={form.product} onClose={() => setForm({ open: false })} />
    </>
  );
}
