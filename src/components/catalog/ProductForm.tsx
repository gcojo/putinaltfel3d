import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Component, Product, ProductInput } from '@/types/db';
import * as api from '@/lib/api';
import { costBreakdown } from '@/lib/calc';
import { grams, hours, lei } from '@/lib/format';
import { parseDuration, parseNumber } from '@/lib/parse';
import { componentsLabel } from '@/lib/stock';
import { useData } from '@/hooks/useData';
import { Button } from '@/components/ui/Button';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Field';
import { SlideOver } from '@/components/ui/SlideOver';
import { useFeedback } from '@/components/ui/Toast';
import { PartsEditor, SlicerPaste, partsTotal, toParts, useColors, useMaterials, type PartRow } from '@/components/orders/printFields';

const isNum = (s: string) => Number.isFinite(parseNumber(s));
const isHours = (s: string) => Number.isFinite(parseDuration(s));
const r2 = (n: number) => Math.round(n * 100) / 100;

interface State {
  nume: string;
  descriere: string;
  material: string;
  culoare: string;
  multi: boolean;
  parts: PartRow[];
  grame: string;
  ore: string;
  pret: string;
  note: string;
}

const str = (n: number | null | undefined) => (Number(n) > 0 ? String(r2(Number(n))) : '');

function fromProduct(p?: Partial<Product>): State {
  const parts = toParts(p?.componente);
  return {
    nume: p?.nume ?? '',
    descriere: p?.descriere ?? '',
    material: p?.material ?? 'PLA',
    culoare: p?.culoare ?? '',
    multi: parts.length > 0,
    parts: parts.length ? parts : [{ material: p?.material ?? 'PLA', culoare: '', grame: '' }, { material: p?.material ?? 'PLA', culoare: '', grame: '' }],
    grame: str(p?.grame),
    ore: str(p?.ore),
    pret: str(p?.pret),
    note: p?.note ?? '',
  };
}

/** Adaugă / editează un produs din catalog. Toate valorile sunt PE BUCATĂ. */
export function ProductFormPanel({
  open, product, prefill, onClose, onSaved,
}: {
  open: boolean;
  product?: Product;
  /** ex. „Salvează în catalog” dintr-o comandă */
  prefill?: Partial<Product>;
  onClose: () => void;
  onSaved?: (p: Product) => void;
}) {
  const { settings, reload } = useData();
  const { toast, confirm } = useFeedback();
  const [s, setS] = useState<State>(() => fromProduct(product ?? prefill));
  const [errors, setErrors] = useState<Partial<Record<keyof State, string>>>({});
  const [saving, setSaving] = useState(false);
  const initialRef = useRef('');
  const materials = useMaterials(s.material);
  const colors = useColors();

  useEffect(() => {
    if (open) {
      const st = fromProduct(product ?? prefill);
      setS(st);
      initialRef.current = JSON.stringify(st);
      setErrors({});
    }
  }, [open, product, prefill]);

  const set = <K extends keyof State>(k: K, v: State[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const filled = s.parts.filter((p) => isNum(p.grame) && parseNumber(p.grame) > 0);
  const componente: Component[] | null = s.multi ? filled.map((p) => ({ material: p.material, culoare: p.culoare.trim() || null, grame: r2(parseNumber(p.grame)) })) : null;
  const g = s.multi ? partsTotal(s.parts) : isNum(s.grame) ? parseNumber(s.grame) : 0;
  const h = isHours(s.ore) ? parseDuration(s.ore) : 0;
  const cost = costBreakdown(settings, { material: s.material, grame_filament: g, nr_bucati: 1, componente });

  const cancel = async () => {
    if (saving) return;
    if (JSON.stringify(s) !== initialRef.current && !(await confirm({ title: 'Renunți la modificări?', confirmLabel: 'Da, renunță', danger: true }))) return;
    onClose();
  };

  const save = async () => {
    if (saving) return;
    const e: typeof errors = {};
    if (!s.nume.trim()) e.nume = 'Scrie numele produsului.';
    if (!s.multi && s.grame.trim() && (!isNum(s.grame) || g < 0)) e.grame = 'Grame invalide.';
    if (s.ore.trim() && (!isHours(s.ore) || h < 0)) e.ore = 'Durată invalidă (ex. 0.5 sau 35m).';
    if (s.pret.trim() && (!isNum(s.pret) || parseNumber(s.pret) < 0)) e.pret = 'Preț invalid.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    setSaving(true);
    try {
      const input: ProductInput = {
        nume: s.nume.trim(),
        descriere: s.descriere.trim() || null,
        material: componente?.length ? componente[0].material : s.material,
        culoare: componente?.length ? componentsLabel(componente) : s.culoare.trim() || null,
        componente: componente?.length ? componente : null,
        grame: r2(g),
        ore: r2(h),
        pret: s.pret.trim() ? r2(parseNumber(s.pret)) : cost.suggested,
        note: s.note.trim() || null,
      };
      const saved = await api.saveProduct(input, product?.id);
      toast(product ? `„${saved.nume}” a fost actualizat.` : `„${saved.nume}” a fost adăugat în catalog.`);
      await reload();
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast(api.friendlyError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!product) return;
    if (!(await confirm({ title: `Ștergi „${product.nume}” din catalog?`, text: 'Comenzile făcute deja nu sunt afectate.', confirmLabel: 'Șterge', danger: true }))) return;
    try {
      await api.deleteProduct(product.id);
      toast('Produsul a fost șters din catalog.');
      await reload();
      onClose();
    } catch (err) {
      toast(api.friendlyError(err), 'error');
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={cancel}
      title={product ? `Editează · ${product.nume}` : 'Produs nou în catalog'}
      subtitle="Valorile sunt pentru O BUCATĂ: la comandă se înmulțesc cu numărul de bucăți."
      width="max-w-[520px]"
      footer={
        <div className="flex items-center justify-end gap-2">
          {product && (
            <Button variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={remove} className="mr-auto hover:text-critical">
              Șterge
            </Button>
          )}
          <Button variant="ghost" onClick={cancel}>
            Renunță
          </Button>
          <Button variant="primary" type="submit" form="product-form" loading={saving}>
            {product ? 'Salvează' : 'Adaugă în catalog'}
          </Button>
        </div>
      }
    >
      <form
        id="product-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col gap-5 px-5 py-5"
      >
        <Field label="Nume produs" error={errors.nume} htmlFor="pr-nume">
          <Input id="pr-nume" value={s.nume} onChange={(e) => set('nume', e.target.value)} invalid={!!errors.nume} placeholder="ex. Breloc inimă" autoFocus />
        </Field>

        <SlicerPaste
          onFound={(info) =>
            setS((x) => ({
              ...x,
              ...(info.hours != null ? { ore: String(info.hours) } : {}),
              ...(info.grams != null && !x.multi ? { grame: String(info.grams) } : {}),
            }))
          }
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="label">Filament / bucată</span>
            <Segmented
              value={s.multi ? 'multi' : 'one'}
              onChange={(v) => set('multi', v === 'multi')}
              options={[
                { value: 'one', label: 'O culoare' },
                { value: 'multi', label: 'Mai multe culori' },
              ]}
            />
          </div>
          {s.multi ? (
            <PartsEditor rows={s.parts} onChange={(rows) => set('parts', rows)} label="g/buc" />
          ) : (
            <div className="grid grid-cols-[110px_1fr_110px] gap-2">
              <Select value={s.material} onChange={(e) => set('material', e.target.value)} aria-label="Material">
                {materials.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
              <Input value={s.culoare} onChange={(e) => set('culoare', e.target.value)} placeholder="Culoare" list="pr-culori" aria-label="Culoare" autoComplete="off" />
              <Input inputMode="decimal" value={s.grame} onChange={(e) => set('grame', e.target.value)} invalid={!!errors.grame} suffix="g" placeholder="0" aria-label="Grame pe bucată" />
              <datalist id="pr-culori">
                {colors.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          )}
          {errors.grame && <p className="text-xs text-critical">{errors.grame}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Timp print / bucată" error={errors.ore} htmlFor="pr-ore" hint={h > 0 && !isNum(s.ore) ? `= ${hours(h)}` : 'ex. 0.5 sau 35m'}>
            <Input id="pr-ore" value={s.ore} onChange={(e) => set('ore', e.target.value)} invalid={!!errors.ore} suffix="h" placeholder="0" />
          </Field>
          <Field
            label="Preț / bucată"
            error={errors.pret}
            htmlFor="pr-pret"
            hint={cost.suggested ? `sugerat ${lei(cost.suggested)} (material ${lei(cost.material, { decimals: true })}${g > 0 ? ` · ${grams(g)}` : ''})${s.pret.trim() ? '' : ' · gol = sugerat'}` : undefined}
          >
            <Input id="pr-pret" inputMode="decimal" value={s.pret} onChange={(e) => set('pret', e.target.value)} invalid={!!errors.pret} suffix="lei" placeholder={cost.suggested ? String(cost.suggested) : '0'} />
          </Field>
        </div>

        <Field label="Descriere" htmlFor="pr-desc">
          <Textarea id="pr-desc" value={s.descriere} onChange={(e) => set('descriere', e.target.value)} rows={2} placeholder="Dimensiuni, variante, fișier…" />
        </Field>
        <Field label="Note" htmlFor="pr-note">
          <Textarea id="pr-note" value={s.note} onChange={(e) => set('note', e.target.value)} rows={2} />
        </Field>
      </form>
    </SlideOver>
  );
}
