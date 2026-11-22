import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, PencilRuler } from 'lucide-react';
import type { Order, OrderInput, OrderStatus } from '@/types/db';
import * as api from '@/lib/api';
import { costBreakdown } from '@/lib/calc';
import { DEFAULT_MATERIALS, STATUS_MAP } from '@/lib/constants';
import { priceMessage, waLink } from '@/lib/contact';
import { dateTime, deadlineEnd, grams, hours, lei, signedHours } from '@/lib/format';
import { parseDuration, parseNumber } from '@/lib/parse';
import { estimateIfAppended } from '@/lib/schedule';
import { useData } from '@/hooks/useData';
import { Button } from '@/components/ui/Button';
import { Field, Input, Segmented } from '@/components/ui/Field';
import { Dot } from '@/components/ui/Status';
import { SlideOver } from '@/components/ui/SlideOver';
import { useFeedback } from '@/components/ui/Toast';
import { useChangeStatus } from './useOrderActions';

const isNum = (s: string) => Number.isFinite(parseNumber(s));
const isHours = (s: string) => Number.isFinite(parseDuration(s));
const round2 = (n: number) => Math.round(n * 100) / 100;

type Mode = 'total' | 'buc';

interface State {
  grame: string;
  durata: string;
  mode: Mode;
  material: string;
  culoare: string;
  pret: string;
  queue: boolean;
}

function fromOrder(o: Order | undefined): State {
  return {
    grame: o && Number(o.grame_filament) > 0 ? String(Number(o.grame_filament)) : '',
    durata: o && Number(o.durata_print_ore) > 0 ? String(Number(o.durata_print_ore)) : '',
    mode: 'total',
    material: o?.material ?? 'PLA',
    culoare: o?.culoare ?? '',
    pret: o && Number(o.pret_vanzare) > 0 ? String(Number(o.pret_vanzare)) : '',
    queue: o?.status === 'noua',
  };
}

const THEN_LABEL: Partial<Record<OrderStatus, string>> = {
  in_coada: 'După salvare, comanda intră în coadă.',
  se_printeaza: 'După salvare, pornește printarea.',
};

/**
 * Pasul de după proiectare: gramele și timpul din slicer (Bambu Studio),
 * prețul calculat automat și, opțional, intrarea directă în coadă.
 */
export function PrintInfoPanel({
  open, order: initial, thenStatus, onClose,
}: {
  open: boolean;
  order?: Order;
  /** statusul cerut înainte de a avea datele (ex. „Pune în coadă”) */
  thenStatus?: OrderStatus;
  onClose: () => void;
}) {
  const { orders, settings, schedule, clientById, reload } = useData();
  const { toast, confirm } = useFeedback();
  const changeStatus = useChangeStatus();
  // mereu varianta proaspătă din date (ex. o încasare adăugată între timp)
  const order = initial ? orders.find((o) => o.id === initial.id) ?? initial : undefined;
  const [s, setS] = useState<State>(() => fromOrder(order));
  const [errors, setErrors] = useState<{ grame?: string; durata?: string; pret?: string }>({});
  const [saving, setSaving] = useState(false);
  const initialRef = useRef('');

  useEffect(() => {
    if (open && initial) {
      const st = fromOrder(orders.find((o) => o.id === initial.id) ?? initial);
      setS(st);
      initialRef.current = JSON.stringify(st);
      setErrors({});
    }
    // doar la deschidere: o reîncărcare a datelor nu trebuie să golească formularul
  }, [open, initial?.id]);

  const set = <K extends keyof State>(k: K, v: State[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const materials = useMemo(() => {
    const list = Object.keys(settings.pret_filament_lei_kg ?? {});
    const all = list.length ? list : DEFAULT_MATERIALS;
    return all.includes(s.material) ? all : [...all, s.material];
  }, [settings.pret_filament_lei_kg, s.material]);

  if (!order) return null;

  const pieces = Math.max(1, Number(order.nr_bucati) || 1);
  const mult = s.mode === 'buc' ? pieces : 1;
  const g = isNum(s.grame) ? parseNumber(s.grame) : 0;
  const h = isHours(s.durata) ? parseDuration(s.durata) : 0;
  const totalG = round2(g * mult);
  const totalH = round2(h * mult);
  const cost = costBreakdown(settings, { material: s.material, grame_filament: totalG, durata_print_ore: totalH, nr_bucati: pieces });
  const price = s.pret.trim() && isNum(s.pret) ? parseNumber(s.pret) : cost.suggested;
  const profit = price - cost.total;
  const client = clientById(order.client_id);
  const target: OrderStatus | undefined = thenStatus ?? (s.queue && order.status === 'noua' ? 'in_coada' : undefined);

  const willSchedule = target === 'in_coada' || target === 'se_printeaza' || order.status === 'noua';
  const end = totalH > 0 && willSchedule ? estimateIfAppended(schedule, totalH, settings) : null;
  const margin = end && order.deadline ? (deadlineEnd(order.deadline).getTime() - end.getTime()) / 3_600_000 : null;

  const cancel = async () => {
    if (saving) return;
    if (JSON.stringify(s) !== initialRef.current && !(await confirm({ title: 'Renunți la datele de print?', text: 'Ce ai completat se pierde.', confirmLabel: 'Da, renunță', danger: true }))) return;
    onClose();
  };

  const save = async () => {
    if (saving) return;
    const e: typeof errors = {};
    if (!isNum(s.grame) || g <= 0) e.grame = 'Introdu gramele din slicer.';
    if (!isHours(s.durata) || h <= 0) e.durata = 'Introdu timpul (ex. 3.5 sau 2h 35m).';
    if (s.pret.trim() && (!isNum(s.pret) || parseNumber(s.pret) < 0)) e.pret = 'Preț invalid.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;

    setSaving(true);
    try {
      const patch: Partial<OrderInput> = {
        grame_filament: totalG,
        durata_print_ore: totalH,
        material: s.material,
        culoare: s.culoare.trim() || null,
        pret_vanzare: round2(price),
      };
      if (target === 'in_coada' && order.status !== 'in_coada') patch.status = 'in_coada';
      const saved = await api.patchOrder(order.id, patch);
      await reload();
      onClose();
      if (target === 'se_printeaza') {
        await changeStatus(saved, 'se_printeaza');
        return;
      }
      const href = client?.telefon ? waLink(client.telefon, priceMessage(saved, client.nume)) : null;
      toast(
        `#${saved.id}: ${grams(totalG)} · ${hours(totalH)} · ${lei(saved.pret_vanzare)}${patch.status ? ' · pusă în coadă' : ''}`,
        'ok',
        href ? { label: 'Trimite prețul', onClick: () => window.open(href, '_blank', 'noopener') } : undefined,
      );
    } catch (err) {
      toast(api.friendlyError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={cancel}
      title={
        <span className="flex items-center gap-2">
          <PencilRuler className="h-4 w-4 text-accent" />
          <span className="num text-muted">#{order.id}</span>
          <span className="truncate">Date de print</span>
        </span>
      }
      subtitle={
        <span>
          {order.titlu} · {pieces} {pieces === 1 ? 'bucată' : 'bucăți'}
          {client ? ` · ${client.nume}` : ''}
        </span>
      }
      width="max-w-[520px]"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={cancel} className="mr-auto sm:mr-0">
            Renunță
          </Button>
          <Button variant="primary" type="submit" form="print-form" loading={saving} title="Ctrl + Enter">
            {target ? `Salvează · ${STATUS_MAP[target].label}` : 'Salvează'}
          </Button>
        </div>
      }
    >
      <form
        id="print-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            save();
          }
        }}
        className="flex flex-col gap-5 px-5 py-5"
      >
        {thenStatus && THEN_LABEL[thenStatus] && (
          <p className="rounded-card border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm">
            Comanda nu are încă gramele și timpul de print. Completează-le din slicer. {THEN_LABEL[thenStatus]}
          </p>
        )}

        {pieces > 1 && (
          <Field label="Ce ai în slicer?">
            <Segmented
              value={s.mode}
              onChange={(v) => set('mode', v)}
              options={[
                { value: 'total', label: `Toate ${pieces} bucățile` },
                { value: 'buc', label: 'O singură bucată' },
              ]}
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field
            label={s.mode === 'buc' ? 'Filament / bucată' : 'Filament total'}
            error={errors.grame}
            htmlFor="p-grame"
            hint={s.mode === 'buc' && g > 0 ? `total ${grams(totalG)}` : undefined}
          >
            <Input id="p-grame" inputMode="decimal" value={s.grame} onChange={(e) => set('grame', e.target.value)} invalid={!!errors.grame} suffix="g" placeholder="ex. 120" autoFocus />
          </Field>
          <Field
            label={s.mode === 'buc' ? 'Durată / bucată' : 'Durată totală'}
            error={errors.durata}
            htmlFor="p-ore"
            hint={
              h > 0
                ? `${!isNum(s.durata) ? `= ${hours(h)}` : ''}${s.mode === 'buc' ? `${!isNum(s.durata) ? ' · ' : ''}total ${hours(totalH)}` : ''}` || 'merge și „2h 35m” din Bambu'
                : 'merge și „2h 35m” din Bambu'
            }
          >
            <Input id="p-ore" value={s.durata} onChange={(e) => set('durata', e.target.value)} invalid={!!errors.durata} suffix="h" placeholder="3.5" />
          </Field>
        </div>

        <Field label="Material">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Material">
            {materials.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={s.material === m}
                onClick={() => set('material', m)}
                className={`h-8 rounded-[10px] border px-3 text-sm transition-colors ${s.material === m ? 'border-accent bg-accent text-white shadow-glow' : 'border-line text-muted hover:border-fg hover:text-fg'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>

        {/* Calculator */}
        <div className="rounded-tile border border-line bg-glass/60">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <span className="label flex items-center gap-2">
              <Calculator className="h-3.5 w-3.5" /> Calculator cost · adaos {settings.adaos_procent}%
            </span>
          </div>
          <dl className="num grid grid-cols-3 divide-x divide-line text-sm">
            {[
              ['Material', lei(cost.material, { decimals: true })],
              ['Curent', lei(cost.electricity, { decimals: true })],
              ['Cost real', lei(cost.total, { decimals: true })],
            ].map(([k, v]) => (
              <div key={k} className="px-4 py-2.5">
                <dt className="label">{k}</dt>
                <dd className="mt-1 text-md">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <div>
              <div className="label">Preț sugerat</div>
              <div className="num mt-1 text-xl font-light">
                {lei(cost.suggested)}
                {pieces > 1 && <span className="ml-2 text-sm text-muted">{lei(cost.perPiece)}/buc</span>}
              </div>
            </div>
            {price > 0 && (
              <span className="num text-sm">
                <span className="text-muted">Profit: </span>
                <span className={profit < 0 ? 'text-critical' : 'text-fg'}>{lei(profit)}</span>
              </span>
            )}
          </div>
        </div>

        <Field
          label="Preț vânzare"
          error={errors.pret}
          htmlFor="p-pret"
          hint={
            s.pret.trim() === ''
              ? cost.suggested
                ? `Gol = prețul sugerat (${lei(cost.suggested)})`
                : 'Completează gramele și timpul pentru prețul sugerat'
              : Number(order.pret_vanzare) > 0 && parseNumber(s.pret) === Number(order.pret_vanzare)
                ? 'Prețul stabilit la comandă'
                : undefined
          }
        >
          <Input id="p-pret" inputMode="decimal" value={s.pret} onChange={(e) => set('pret', e.target.value)} invalid={!!errors.pret} suffix="lei" placeholder={cost.suggested ? String(cost.suggested) : '0'} />
          {cost.suggested > 0 && s.pret.trim() !== '' && parseNumber(s.pret) !== cost.suggested && (
            <button
              type="button"
              onClick={() => set('pret', String(cost.suggested))}
              className="self-start rounded-full border border-line px-2.5 py-0.5 text-xs text-muted transition-colors hover:border-fg hover:text-fg"
            >
              folosește prețul sugerat · {lei(cost.suggested)}
            </button>
          )}
        </Field>

        {order.status === 'noua' && !thenStatus && (
          <label className="flex cursor-pointer items-center gap-3 rounded-card border border-line px-4 py-3 text-sm">
            <input type="checkbox" checked={s.queue} onChange={(e) => set('queue', e.target.checked)} className="h-4 w-4 accent-accent" />
            <span>
              Pune comanda în coadă după salvare
              <span className="block text-xs text-muted">o poți reordona apoi din pagina Coadă</span>
            </span>
          </label>
        )}

        {end && (
          <div className="flex items-start gap-2.5 rounded-card border border-line px-4 py-3 text-sm">
            <Dot signal={margin == null ? 'neutral' : margin < 0 ? 'critical' : margin < 24 ? 'warning' : 'ok'} className="mt-1.5" />
            <span className="num text-muted">
              La finalul cozii ar fi gata <span className="text-fg">{dateTime(end)}</span>
              {margin != null && (
                <>
                  {' · '}
                  <span className={margin < 0 ? 'text-critical' : margin < 24 ? 'text-warning' : 'text-fg'}>{signedHours(margin)}</span> față de deadline
                </>
              )}
            </span>
          </div>
        )}
      </form>
    </SlideOver>
  );
}
