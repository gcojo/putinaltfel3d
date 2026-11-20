import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import * as api from '@/lib/api';
import { useData } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { electricityCost } from '@/lib/calc';
import { WEEKDAYS } from '@/lib/constants';
import { date, lei } from '@/lib/format';
import { PageHeader } from '@/components/layout/AppLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { SkeletonCard } from '@/components/ui/Feedback';
import { useFeedback } from '@/components/ui/Toast';

const toNum = (s: string) => Number(String(s).replace(',', '.').trim());
const valid = (s: string) => String(s).trim() !== '' && Number.isFinite(toNum(s));

interface Form {
  prices: { material: string; price: string }[];
  kwh: string;
  watt: string;
  hoursPerDay: string;
  startHour: string;
  markup: string;
  freeDays: number[];
  freeDates: string[];
}

export default function SettingsPage() {
  const { settings, loading, reload } = useData();
  const { session } = useAuth();
  const { toast } = useFeedback();
  const [f, setF] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    if (loading) return;
    setF({
      prices: Object.entries(settings.pret_filament_lei_kg ?? {}).map(([material, price]) => ({ material, price: String(price) })),
      kwh: String(settings.cost_curent_lei_kwh),
      watt: String(settings.consum_imprimanta_w),
      hoursPerDay: String(settings.ore_de_printare_pe_zi),
      startHour: String(settings.ora_inceput_zi),
      markup: String(settings.adaos_procent),
      freeDays: [...(settings.zile_libere ?? [])],
      freeDates: [...(settings.date_libere ?? [])].sort(),
    });
  }, [loading, settings]);

  if (!f) return <SkeletonCard />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF({ ...f, [k]: v });
    setErrors({});
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const names = new Set<string>();
    f.prices.forEach((p, i) => {
      if (!p.material.trim()) errs[`m${i}`] = 'Numele materialului lipsește.';
      else if (names.has(p.material.trim())) errs[`m${i}`] = 'Material duplicat.';
      names.add(p.material.trim());
      if (!valid(p.price) || toNum(p.price) < 0) errs[`p${i}`] = 'Preț invalid.';
    });
    if (!valid(f.kwh) || toNum(f.kwh) < 0) errs.kwh = 'Introdu prețul curentului (ex. 1.30).';
    if (!valid(f.watt) || toNum(f.watt) < 0) errs.watt = 'Introdu consumul în wați.';
    if (!valid(f.hoursPerDay) || toNum(f.hoursPerDay) <= 0 || toNum(f.hoursPerDay) > 24) errs.hoursPerDay = 'Între 1 și 24 de ore.';
    if (!valid(f.startHour) || !Number.isInteger(toNum(f.startHour)) || toNum(f.startHour) < 0 || toNum(f.startHour) > 23) errs.startHour = 'O oră între 0 și 23.';
    if (!valid(f.markup) || toNum(f.markup) < 0) errs.markup = 'Adaos invalid.';
    if (f.freeDays.length === 7) errs.freeDays = 'Trebuie să rămână cel puțin o zi lucrătoare.';
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast('Verifică valorile marcate cu roșu.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.saveSettings({
        pret_filament_lei_kg: Object.fromEntries(f.prices.map((p) => [p.material.trim(), toNum(p.price)])),
        cost_curent_lei_kwh: toNum(f.kwh),
        consum_imprimanta_w: toNum(f.watt),
        ore_de_printare_pe_zi: toNum(f.hoursPerDay),
        ora_inceput_zi: toNum(f.startHour),
        adaos_procent: toNum(f.markup),
        zile_libere: f.freeDays,
        date_libere: f.freeDates,
      });
      toast('Setările au fost salvate. Costurile comenzilor neprintate au fost recalculate.');
      await reload();
    } catch (err) {
      toast(api.friendlyError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const perHour = valid(f.kwh) && valid(f.watt) ? electricityCost({ cost_curent_lei_kwh: toNum(f.kwh), consum_imprimanta_w: toNum(f.watt), pret_filament_lei_kg: {}, adaos_procent: 0 }, 1) : 0;
  const endRaw = valid(f.startHour) && valid(f.hoursPerDay) ? toNum(f.startHour) + toNum(f.hoursPerDay) : 0;
  const endHour = endRaw === 24 ? 24 : endRaw % 24;

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title="Setări"
        sub={session?.user.email}
        actions={
          <Button type="submit" variant="primary" loading={saving}>
            Salvează setările
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Preț filament" sub="lei / kg" />
          <div className="flex flex-col gap-2 p-4">
            {f.prices.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_130px_36px] items-start gap-2">
                <div>
                  <Input
                    value={p.material}
                    onChange={(e) => set('prices', f.prices.map((x, j) => (j === i ? { ...x, material: e.target.value } : x)))}
                    invalid={!!errors[`m${i}`]}
                    aria-label="Material"
                  />
                  {errors[`m${i}`] && <p className="mt-1 text-xs text-critical">{errors[`m${i}`]}</p>}
                </div>
                <div>
                  <Input
                    inputMode="decimal"
                    value={p.price}
                    onChange={(e) => set('prices', f.prices.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                    invalid={!!errors[`p${i}`]}
                    suffix="lei"
                    aria-label={`Preț ${p.material}`}
                  />
                  {errors[`p${i}`] && <p className="mt-1 text-xs text-critical">{errors[`p${i}`]}</p>}
                </div>
                <IconButton label="Elimină materialul" onClick={() => set('prices', f.prices.filter((_, j) => j !== i))} className="hover:text-critical">
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} className="self-start" onClick={() => set('prices', [...f.prices, { material: '', price: '' }])}>
              Adaugă material
            </Button>
            <p className="text-xs text-muted">Materialul „Altul” se folosește când un material nu are preț setat.</p>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Curent & preț" />
            <div className="grid grid-cols-2 gap-4 p-4">
              <Field label="Preț curent" error={errors.kwh} hint="lei / kWh">
                <Input inputMode="decimal" value={f.kwh} onChange={(e) => set('kwh', e.target.value)} invalid={!!errors.kwh} suffix="lei" />
              </Field>
              <Field label="Consum imprimantă" error={errors.watt} hint={`≈ ${lei(perHour, { decimals: true })} / oră de print`}>
                <Input inputMode="decimal" value={f.watt} onChange={(e) => set('watt', e.target.value)} invalid={!!errors.watt} suffix="W" />
              </Field>
              <Field label="Adaos implicit" error={errors.markup} hint="peste costul real, pentru prețul sugerat" className="col-span-2">
                <Input inputMode="decimal" value={f.markup} onChange={(e) => set('markup', e.target.value)} invalid={!!errors.markup} suffix="%" />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Program imprimantă" sub="pentru estimarea cozii" />
            <div className="flex flex-col gap-4 p-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Ore de printare / zi" error={errors.hoursPerDay}>
                  <Input inputMode="decimal" value={f.hoursPerDay} onChange={(e) => set('hoursPerDay', e.target.value)} invalid={!!errors.hoursPerDay} suffix="h" />
                </Field>
                <Field label="Începe la ora" error={errors.startHour} hint={`interval ${String(toNum(f.startHour) || 0).padStart(2, '0')}:00–${String(Math.floor(endHour)).padStart(2, '0')}:${endHour % 1 ? '30' : '00'}`}>
                  <Input inputMode="numeric" value={f.startHour} onChange={(e) => set('startHour', e.target.value)} invalid={!!errors.startHour} suffix=":00" />
                </Field>
              </div>
              <Field label="Zile libere în fiecare săptămână" error={errors.freeDays}>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                    const on = f.freeDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => set('freeDays', on ? f.freeDays.filter((x) => x !== d) : [...f.freeDays, d])}
                        className={`h-9 rounded border px-3 text-sm transition-colors duration-150 ${on ? 'border-fg bg-fg text-bg' : 'border-line text-muted hover:text-fg'}`}
                        aria-pressed={on}
                      >
                        {WEEKDAYS[d].slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Zile libere punctuale (concediu, sărbători)">
                <div className="flex gap-2">
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} aria-label="Dată liberă" />
                  <Button
                    onClick={() => {
                      if (newDate && !f.freeDates.includes(newDate)) set('freeDates', [...f.freeDates, newDate].sort());
                      setNewDate('');
                    }}
                    disabled={!newDate}
                  >
                    Adaugă
                  </Button>
                </div>
                {f.freeDates.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.freeDates.map((d) => (
                      <span key={d} className="num flex h-7 items-center gap-1 rounded border border-line pl-2.5 pr-1 text-xs">
                        {date(d)}
                        <button type="button" onClick={() => set('freeDates', f.freeDates.filter((x) => x !== d))} className="p-1 text-muted hover:text-critical" aria-label={`Elimină ${d}`}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
