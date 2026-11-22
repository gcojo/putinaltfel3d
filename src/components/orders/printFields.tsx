// Bucăți de formular comune pentru datele de print: lipire din slicer, culori multiple, stoc.
import { useMemo, useState } from 'react';
import { ClipboardPaste, Plus, X } from 'lucide-react';
import type { Component } from '@/types/db';
import { DEFAULT_MATERIALS } from '@/lib/constants';
import { hours, smart } from '@/lib/format';
import { parseNumber, parseSlicerText, type SlicerInfo } from '@/lib/parse';
import { stockFor } from '@/lib/stock';
import { useData } from '@/hooks/useData';
import { IconButton } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Dot } from '@/components/ui/Status';

/** Materialele din setări (+ cel curent, dacă lipsește). */
export function useMaterials(current?: string) {
  const { settings } = useData();
  return useMemo(() => {
    const list = Object.keys(settings.pret_filament_lei_kg ?? {});
    const all = list.length ? list : DEFAULT_MATERIALS;
    return current && !all.includes(current) ? [...all, current] : all;
  }, [settings.pret_filament_lei_kg, current]);
}

/** Culorile folosite deja (comenzi + stoc), pentru sugestii. */
export function useColors() {
  const { orders, stock } = useData();
  return useMemo(() => {
    const all = [...stock.map((s) => s.culoare), ...orders.map((o) => o.culoare)];
    return [...new Set(all.map((c) => c?.trim()).filter((c): c is string => !!c && !c.includes(' + ')))].slice(0, 80);
  }, [orders, stock]);
}

/**
 * Câmp în care lipești rezumatul din Bambu Studio / MakerWorld (Ctrl+V):
 * gramele și timpul se completează singure.
 */
export function SlicerPaste({ onFound }: { onFound: (info: SlicerInfo) => void }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const handle = (text: string) => {
    if (!text.trim()) return;
    const info = parseSlicerText(text);
    if (info.grams == null && info.hours == null) {
      setMsg({ ok: false, text: 'N-am găsit grame sau timp în textul lipit.' });
      return;
    }
    onFound(info);
    setMsg({
      ok: true,
      text: `Am găsit: ${[info.grams != null ? `${smart(info.grams, 2)} g` : null, info.hours != null ? hours(info.hours) : null].filter(Boolean).join(' · ')}`,
    });
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <ClipboardPaste className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
        <textarea
          rows={2}
          aria-label="Lipește din Bambu Studio"
          placeholder="Lipește aici rezumatul din Bambu Studio (Ctrl+V): grame și timp se completează singure"
          className="input min-h-[52px] resize-none py-2.5 pl-9 text-sm"
          onPaste={(e) => {
            e.preventDefault();
            handle(e.clipboardData.getData('text'));
          }}
          onChange={(e) => {
            // tastat / lipit din meniul telefonului
            if (e.target.value.length > 3) {
              handle(e.target.value);
              e.target.value = '';
            }
          }}
        />
      </div>
      {msg && <p className={`text-xs ${msg.ok ? 'text-ok' : 'text-warning'}`}>{msg.text}</p>}
    </div>
  );
}

/** „În stoc: 640 g” pentru materialul + culoarea aleasă (doar dacă îi ții evidența). */
export function StockHint({ material, culoare, need }: { material: string; culoare: string | null | undefined; need: number }) {
  const { stock, migrated } = useData();
  if (!migrated || !material) return null;
  const it = stockFor(stock, material, culoare);
  if (!it) return <span className="text-xs text-muted-2">fără evidență în stoc</span>;
  // ce e deja rezervat de alte comenzi nu e disponibil pentru aceasta
  const free = Math.round(it.grame - it.rezervat);
  const sig = need > 0 && free < need ? 'critical' : free < 150 ? 'warning' : 'ok';
  return (
    <span className="num inline-flex items-center gap-1.5 text-xs text-muted">
      <Dot signal={sig} />
      în stoc {Math.max(0, Math.round(it.grame))} g{it.rezervat > 0 ? ` (liber ${Math.max(0, free)} g)` : ''}
      {sig === 'critical' && <span className="text-critical">· nu ajunge</span>}
    </span>
  );
}

export interface PartRow {
  material: string;
  culoare: string;
  grame: string;
}

export const toParts = (list: Component[] | null | undefined): PartRow[] =>
  (list ?? []).map((c) => ({ material: c.material, culoare: c.culoare ?? '', grame: String(Number(c.grame)) }));

export const partsTotal = (rows: PartRow[]) => rows.reduce((a, r) => a + (Number.isFinite(parseNumber(r.grame)) ? parseNumber(r.grame) : 0), 0);

/** Lista de culori / materiale pentru o comandă multicoloră (grame pentru ce scrie în titlul câmpului). */
export function PartsEditor({ rows, onChange, mult = 1, label = 'g' }: { rows: PartRow[]; onChange: (rows: PartRow[]) => void; mult?: number; label?: string }) {
  const materials = useMaterials();
  const colors = useColors();
  const set = (i: number, patch: Partial<PartRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r, i) => {
        const g = parseNumber(r.grame);
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="grid grid-cols-[96px_1fr_92px_32px] items-center gap-2">
              <Select value={r.material} onChange={(e) => set(i, { material: e.target.value })} aria-label={`Material ${i + 1}`}>
                {(materials.includes(r.material) ? materials : [...materials, r.material]).map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
              <Input value={r.culoare} onChange={(e) => set(i, { culoare: e.target.value })} placeholder="Culoare" list="parts-colors" aria-label={`Culoare ${i + 1}`} autoComplete="off" />
              <Input inputMode="decimal" value={r.grame} onChange={(e) => set(i, { grame: e.target.value })} suffix={label} placeholder="0" aria-label={`Grame ${i + 1}`} />
              <IconButton label="Elimină culoarea" onClick={() => onChange(rows.filter((_, j) => j !== i))} disabled={rows.length <= 1} className="hover:text-critical">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="pl-1">
              <StockHint material={r.material} culoare={r.culoare} need={Number.isFinite(g) ? g * mult : 0} />
            </div>
          </div>
        );
      })}
      <datalist id="parts-colors">
        {colors.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <button
        type="button"
        onClick={() => onChange([...rows, { material: rows[rows.length - 1]?.material ?? 'PLA', culoare: '', grame: '' }])}
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted hover:text-fg"
      >
        <Plus className="h-3.5 w-3.5" /> Încă o culoare
      </button>
    </div>
  );
}
