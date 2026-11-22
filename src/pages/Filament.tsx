import { useMemo, useState } from 'react';
import { ChevronDown, Plus, Scale, X } from 'lucide-react';
import type { FilamentMove } from '@/types/db';
import * as api from '@/lib/api';
import { useData } from '@/hooks/useData';
import { dateTime, grams } from '@/lib/format';
import { parseNumber } from '@/lib/parse';
import { LOW_STOCK_G, reserved, stockKey, type StockItem } from '@/lib/stock';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader, ProgressBar } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { EmptyState, ErrorBanner, SkeletonRows } from '@/components/ui/Feedback';
import { MigrationNotice } from '@/components/ui/MigrationNotice';
import { Signal } from '@/components/ui/Status';
import { useFeedback } from '@/components/ui/Toast';
import { useColors, useMaterials } from '@/components/orders/printFields';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';

const MOVE_LABEL: Record<FilamentMove['tip'], string> = { rola: 'Rolă adăugată', comanda: 'Consum comandă', ajustare: 'Corecție' };

function AddRoll({ initial, onDone }: { initial?: { material: string; culoare: string }; onDone: () => void }) {
  const { reload } = useData();
  const { toast } = useFeedback();
  const [material, setMaterial] = useState(initial?.material ?? 'PLA');
  const [culoare, setCuloare] = useState(initial?.culoare ?? '');
  const [g, setG] = useState('1000');
  const [count, setCount] = useState('1');
  const [busy, setBusy] = useState(false);
  const materials = useMaterials(material);
  const colors = useColors();

  const save = async () => {
    const grame = parseNumber(g) * (parseNumber(count) || 1);
    if (!(grame > 0)) return toast('Introdu gramele rolei (ex. 1000).', 'error');
    setBusy(true);
    try {
      await api.addFilamentMove({ material, culoare: culoare.trim() || null, grame, tip: 'rola', note: Number(count) > 1 ? `${count} role` : null });
      toast(`Adăugat: ${grams(grame)} ${material}${culoare.trim() ? ` ${culoare.trim()}` : ''}.`);
      await reload();
      onDone();
    } catch (e) {
      toast(api.friendlyError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-[120px_1fr_120px_90px_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label="Material">
        <Select value={material} onChange={(e) => setMaterial(e.target.value)} aria-label="Material rolă">
          {materials.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
      </Field>
      <Field label="Culoare">
        <Input value={culoare} onChange={(e) => setCuloare(e.target.value)} placeholder="ex. Negru mat" list="roll-colors" autoComplete="off" aria-label="Culoare rolă" autoFocus />
        <datalist id="roll-colors">
          {colors.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Grame / rolă">
        <Input inputMode="decimal" value={g} onChange={(e) => setG(e.target.value)} suffix="g" aria-label="Grame pe rolă" />
      </Field>
      <Field label="Nr. role">
        <Input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} aria-label="Număr de role" />
      </Field>
      <div className="col-span-2 flex gap-2 sm:col-span-1">
        <Button type="submit" variant="primary" loading={busy}>
          Adaugă
        </Button>
        <IconButton label="Renunță" onClick={onDone}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
    </form>
  );
}

function StockRow({ it, onAddRoll }: { it: StockItem; onAddRoll: () => void }) {
  const { reload } = useData();
  const { openOrder } = useOrderPanel();
  const { toast, confirm } = useFeedback();
  const [open, setOpen] = useState(false);
  const [weigh, setWeigh] = useState<string | null>(null);
  const added = it.moves.filter((m) => m.tip === 'rola').reduce((a, m) => a + Number(m.grame), 0);
  const free = it.grame - it.rezervat;
  const signal = free < 0 ? 'critical' : it.grame < LOW_STOCK_G ? 'warning' : 'ok';
  const scale = Math.max(1000, added > 0 ? Math.min(added, 3000) : it.grame);

  const correct = async () => {
    const real = parseNumber(weigh ?? '');
    if (!Number.isFinite(real) || real < 0) return toast('Introdu câte grame ai cântărit.', 'error');
    const diff = Math.round((real - it.grame) * 100) / 100;
    if (diff === 0) return setWeigh(null);
    try {
      await api.addFilamentMove({ material: it.material, culoare: it.culoare, grame: diff, tip: 'ajustare', note: `cântărit ${grams(real)}` });
      toast(`Stoc corectat la ${grams(real)}.`);
      setWeigh(null);
      await reload();
    } catch (e) {
      toast(api.friendlyError(e), 'error');
    }
  };

  const removeMove = async (m: FilamentMove) => {
    if (!(await confirm({ title: `Ștergi „${MOVE_LABEL[m.tip]}” de ${grams(Math.abs(Number(m.grame)))}?`, confirmLabel: 'Șterge', danger: true }))) return;
    try {
      await api.deleteFilamentMove(m.id);
      toast('Mișcarea a fost ștearsă.');
      await reload();
    } catch (e) {
      toast(api.friendlyError(e), 'error');
    }
  };

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <button onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={open}>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
          <span className="min-w-0">
            <span className="block truncate text-md">
              {it.material}
              {it.culoare ? ` · ${it.culoare}` : ''}
            </span>
            <span className="num block text-xs text-muted">
              {it.rezervat > 0 ? `rezervat pentru coadă ${grams(it.rezervat)} · liber ${grams(Math.max(0, free))}` : 'nimic rezervat'}
            </span>
          </span>
        </button>
        <div className="flex w-full items-center gap-3 sm:w-56">
          <ProgressBar value={Math.max(0, Math.min(1, it.grame / scale))} signal={signal} className="flex-1" />
          <span className={`num w-20 text-right text-lg font-light ${signal === 'critical' ? 'text-critical' : signal === 'warning' ? 'text-warning' : ''}`}>
            {grams(Math.max(0, it.grame))}
          </span>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={onAddRoll}>
            Rolă
          </Button>
          <Button size="sm" variant="ghost" icon={<Scale className="h-3.5 w-3.5" />} onClick={() => setWeigh(String(Math.max(0, Math.round(it.grame))))}>
            Corectează
          </Button>
        </div>
      </div>
      {weigh != null && (
        <form
          className="flex flex-wrap items-center gap-2 px-4 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            correct();
          }}
        >
          <span className="text-sm text-muted">Cât ai cântărit (fără tambur)?</span>
          <Input inputMode="decimal" value={weigh} onChange={(e) => setWeigh(e.target.value)} suffix="g" className="w-32" autoFocus aria-label="Grame cântărite" />
          <Button size="sm" type="submit" variant="primary">
            Salvează
          </Button>
          <IconButton label="Renunță" onClick={() => setWeigh(null)}>
            <X className="h-4 w-4" />
          </IconButton>
        </form>
      )}
      {open && (
        <ol className="num animate-fade-in border-t border-line bg-glass/40 px-4 py-2">
          {it.moves.slice(0, 30).map((m) => (
            <li key={m.id} className="flex h-8 items-center gap-3 text-sm">
              <span className="w-32 shrink-0 text-xs text-muted">{dateTime(m.created_at)}</span>
              <span className="flex-1 truncate">
                {MOVE_LABEL[m.tip]}
                {m.order_id && (
                  <button onClick={() => openOrder(m.order_id!)} className="ml-1 text-muted hover:text-fg hover:underline">
                    #{m.order_id}
                  </button>
                )}
                {m.note && <span className="ml-1 text-muted">· {m.note}</span>}
              </span>
              <span className={Number(m.grame) < 0 ? 'text-muted' : 'text-ok'}>
                {Number(m.grame) > 0 ? '+' : '−'}
                {grams(Math.abs(Number(m.grame)))}
              </span>
              {m.tip !== 'comanda' ? (
                <button onClick={() => removeMove(m)} className="text-muted-2 hover:text-critical" aria-label="Șterge mișcarea">
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="w-3.5" />
              )}
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

export default function FilamentPage() {
  const { stock, orders, loading, error, reload, migrated } = useData();
  const [adding, setAdding] = useState<{ material: string; culoare: string } | null>(null);
  const total = stock.reduce((a, s) => a + Math.max(0, s.grame), 0);

  // necesare pentru coadă, dar fără evidență în stoc
  const untracked = useMemo(() => {
    const keys = new Set(stock.map((s) => s.key));
    const need = reserved(orders);
    const names = new Map<string, { material: string; culoare: string }>();
    for (const o of orders) {
      for (const c of o.componente?.length ? o.componente : [{ material: o.material, culoare: o.culoare }]) {
        const k = stockKey(c.material, c.culoare);
        if (!names.has(k)) names.set(k, { material: c.material, culoare: c.culoare ?? '' });
      }
    }
    return [...need.entries()].filter(([k]) => !keys.has(k)).map(([k, g]) => ({ key: k, grame: g, ...names.get(k)! }));
  }, [stock, orders]);

  return (
    <>
      <PageHeader
        title="Filament"
        sub={migrated ? `${grams(total)} în stoc · consumul se scade automat când finalizezi o comandă` : 'stoc pe material și culoare'}
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding({ material: 'PLA', culoare: '' })} disabled={!migrated}>
            Rolă nouă
          </Button>
        }
      />

      {!migrated && !loading && <MigrationNotice what="Stocul de filament" />}
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={reload} />
        </div>
      )}

      {loading ? (
        <Card>
          <SkeletonRows rows={5} cols={4} />
        </Card>
      ) : (
        migrated && (
          <div className="stagger flex flex-col gap-4">
            {adding && (
              <Card>
                <CardHeader title="Adaugă filament" sub="o rolă Bambu are de obicei 1000 g" />
                <AddRoll key={`${adding.material}|${adding.culoare}`} initial={adding} onDone={() => setAdding(null)} />
              </Card>
            )}

            {untracked.length > 0 && (
              <Card>
                <CardHeader title="Necesar pentru coadă, fără evidență" sub="adaugă rolele ca să știi dacă ajunge filamentul" />
                <ul>
                  {untracked.map((u) => (
                    <li key={u.key} className="num flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
                      <Signal signal="neutral" label={`${u.material}${u.culoare ? ` · ${u.culoare}` : ''}`} className="flex-1" />
                      <span className="text-sm text-muted">necesar {grams(u.grame)}</span>
                      <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAdding({ material: u.material, culoare: u.culoare })}>
                        Rolă
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="overflow-hidden">
              <CardHeader title="Stoc" right={<span className="num text-xs text-muted">{stock.length}</span>} />
              {stock.length === 0 ? (
                <EmptyState
                  title="Nicio rolă încă"
                  text="Adaugă rolele pe care le ai. Când finalizezi o comandă, gramele ei se scad singure din stoc, iar aplicația te avertizează dacă nu ajunge filamentul pentru coadă."
                  action={
                    <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding({ material: 'PLA', culoare: '' })}>
                      Prima rolă
                    </Button>
                  }
                />
              ) : (
                <ul>
                  {stock.map((it) => (
                    <StockRow key={it.key} it={it} onAddRoll={() => setAdding({ material: it.material, culoare: it.culoare ?? '' })} />
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )
      )}
    </>
  );
}
