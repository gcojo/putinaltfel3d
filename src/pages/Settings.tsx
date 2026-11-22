import { useEffect, useState } from 'react';
import { Bell, Plus, X } from 'lucide-react';
import * as api from '@/lib/api';
import { useData } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { PRINTER_ALWAYS_ON } from '@/lib/constants';
import { PageHeader } from '@/components/layout/AppLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { SkeletonCard } from '@/components/ui/Feedback';
import { useFeedback } from '@/components/ui/Toast';
import { Dot } from '@/components/ui/Status';
import { NOTIF_KEY, notificationsOn, notificationsSupported, showNotification } from '@/hooks/usePrintNotifications';

const toNum = (s: string) => Number(String(s).replace(',', '.').trim());
const valid = (s: string) => String(s).trim() !== '' && Number.isFinite(toNum(s));

interface Form {
  prices: { material: string; price: string }[];
  markup: string;
  rate: string;
}

export default function SettingsPage() {
  const { settings, loading, reload, migrated } = useData();
  const [notif, setNotif] = useState(notificationsOn);
  const { session } = useAuth();
  const { toast } = useFeedback();
  const [f, setF] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    setF({
      prices: Object.entries(settings.pret_filament_lei_kg ?? {}).map(([material, price]) => ({ material, price: String(price) })),
      markup: String(settings.adaos_procent),
      rate: String(settings.tarif_proiectare_lei_ora ?? 50),
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
    if (!valid(f.markup) || toNum(f.markup) < 0) errs.markup = 'Adaos invalid.';
    if (migrated && (!valid(f.rate) || toNum(f.rate) < 0)) errs.rate = 'Tarif invalid.';
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast('Verifică valorile marcate cu roșu.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.saveSettings({
        pret_filament_lei_kg: Object.fromEntries(f.prices.map((p) => [p.material.trim(), toNum(p.price)])),
        // curentul nu mai intră în calcule: păstrăm valorile existente din baza de date
        cost_curent_lei_kwh: settings.cost_curent_lei_kwh,
        consum_imprimanta_w: settings.consum_imprimanta_w,
        // imprimanta merge non-stop, în fiecare zi
        ...PRINTER_ALWAYS_ON,
        adaos_procent: toNum(f.markup),
        // coloana există doar după migrația 0004
        ...(migrated ? { tarif_proiectare_lei_ora: toNum(f.rate) } : {}),
      });
      toast('Setările au fost salvate. Costurile comenzilor neprintate au fost recalculate.');
      await reload();
    } catch (err) {
      toast(api.friendlyError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

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

        <div className="stagger flex flex-col gap-4">
          <Card>
            <CardHeader title="Preț" />
            <div className="grid grid-cols-2 gap-4 p-4">
              <Field label="Adaos implicit" error={errors.markup} hint="peste costul materialului, pentru prețul sugerat" className="col-span-2">
                <Input inputMode="decimal" value={f.markup} onChange={(e) => set('markup', e.target.value)} invalid={!!errors.markup} suffix="%" />
              </Field>
              <Field
                label="Tarif proiectare"
                error={errors.rate}
                hint={migrated ? 'lei pentru fiecare oră de proiectare · se adaugă la prețul sugerat' : 'disponibil după migrația 0004 (vezi README)'}
                className="col-span-2"
              >
                <Input inputMode="decimal" value={f.rate} onChange={(e) => set('rate', e.target.value)} invalid={!!errors.rate} suffix="lei/h" disabled={!migrated} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Notificări" sub="când printul ar trebui să fie gata" right={<Dot signal={notif ? 'ok' : 'neutral'} />} />
            <div className="flex flex-col gap-3 p-4">
              {!notificationsSupported() ? (
                <p className="text-sm text-muted">Browserul acesta nu suportă notificări. Pe iPhone, instalează întâi aplicația pe ecranul principal.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    icon={<Bell className="h-3.5 w-3.5" />}
                    variant={notif ? 'ghost' : 'primary'}
                    onClick={async () => {
                      if (notif) {
                        try { localStorage.setItem(NOTIF_KEY, '0'); } catch { /* stocare indisponibilă */ }
                        setNotif(false);
                        return;
                      }
                      const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
                      if (perm !== 'granted') {
                        toast('Notificările sunt blocate. Permite-le din setările browserului pentru acest site.', 'error');
                        return;
                      }
                      try { localStorage.setItem(NOTIF_KEY, '1'); } catch { /* stocare indisponibilă */ }
                      setNotif(true);
                      toast('Notificările sunt pornite pe acest dispozitiv.');
                    }}
                  >
                    {notif ? 'Oprește notificările' : 'Pornește notificările'}
                  </Button>
                  {notif && (
                    <Button variant="ghost" onClick={() => showNotification('Test notificare', 'Așa arată anunțul când e gata un print.', 'test')}>
                      Trimite un test
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs text-muted">
                Anunțul apare la ora estimată de final cât timp aplicația e deschisă (și în fundal, pe calculator sau Android). Pentru o alarmă sigură pe telefon,
                apasă „Alarmă în calendar la final” în comanda care se printează.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Program imprimantă" />
            <p className="p-4 text-sm text-muted">
              Imprimanta merge <span className="text-fg">non-stop, 24/24, în fiecare zi</span>. Estimările din coadă se calculează fără pauze.
            </p>
          </Card>
        </div>
      </div>
    </form>
  );
}
