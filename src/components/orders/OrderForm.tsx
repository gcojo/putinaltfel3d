import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, ChevronDown, ImagePlus, PencilRuler, Sparkles, Trash2 } from 'lucide-react';
import type { Client, Order, OrderInput, OrderStatus, PaymentMethod, Priority } from '@/types/db';
import * as api from '@/lib/api';
import { costBreakdown } from '@/lib/calc';
import { DEFAULT_MATERIALS, PAYMENT_METHODS, PRIORITIES, STATUSES } from '@/lib/constants';
import { dateTime, deadlineEnd, hours, lei, parseYmd, signedHours, toYmd, todayYmd } from '@/lib/format';
import { parseDuration, parseNumber } from '@/lib/parse';
import { estimateIfAppended } from '@/lib/schedule';
import { missingPrintInfo } from '@/lib/design';
import { useData } from '@/hooks/useData';
import { Button } from '@/components/ui/Button';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Field';
import { Dot } from '@/components/ui/Status';
import { useFeedback } from '@/components/ui/Toast';
import { SlideOver } from '@/components/ui/SlideOver';
import { usePhotoUrl } from './usePhotoUrl';
import { ClientPicker, matchClient } from './ClientPicker';

interface FormState {
  /** '' = fără client sau client nou (după `client_text`) | id client existent */
  client_id: string;
  /** ce scrie în câmpul Client */
  client_text: string;
  client_tel: string;
  titlu: string;
  descriere: string;
  material: string;
  culoare: string;
  grame_filament: string;
  durata_print_ore: string;
  nr_bucati: string;
  pret_vanzare: string;
  status: OrderStatus;
  prioritate: Priority;
  data_comanda: string;
  deadline: string;
  note: string;
  poza_url: string | null;
  /** doar la comandă nouă: bani primiți deja (avans sau tot) */
  avans: string;
  avans_metoda: PaymentMethod;
}

type Errors = Partial<Record<keyof FormState, string>>;

const toNum = (s: string) => parseNumber(s);
const isNum = (s: string) => Number.isFinite(parseNumber(s));
const toHours = (s: string) => parseDuration(s);
const isHours = (s: string) => Number.isFinite(parseDuration(s));

/** Scurtături pentru deadline, relative la data comenzii. */
const DEADLINE_CHIPS = [
  { label: '+3 zile', days: 3 },
  { label: '+1 săpt.', days: 7 },
  { label: '+2 săpt.', days: 14 },
];
const addDays = (ymd: string, days: number) => {
  const d = parseYmd(ymd || todayYmd());
  d.setDate(d.getDate() + days);
  return toYmd(d);
};

const chip = (active: boolean) =>
  `rounded-full border px-2.5 py-0.5 text-xs transition-colors ${active ? 'border-accent bg-accent text-white' : 'border-line text-muted hover:border-fg hover:text-fg'}`;

function fromOrder(o: Partial<Order> | undefined, clients: Client[]): FormState {
  const client = o?.client_id ? clients.find((c) => c.id === o.client_id) : undefined;
  return {
    client_id: client ? String(client.id) : '',
    client_text: client?.nume ?? '',
    client_tel: '',
    titlu: o?.titlu ?? '',
    descriere: o?.descriere ?? '',
    material: o?.material ?? 'PLA',
    culoare: o?.culoare ?? '',
    grame_filament: Number(o?.grame_filament) > 0 ? String(o!.grame_filament) : '',
    durata_print_ore: Number(o?.durata_print_ore) > 0 ? String(o!.durata_print_ore) : '',
    nr_bucati: String(o?.nr_bucati ?? 1),
    pret_vanzare: o?.pret_vanzare != null ? String(o.pret_vanzare) : '',
    status: o?.status ?? 'noua',
    prioritate: o?.prioritate ?? 'normala',
    data_comanda: o?.data_comanda ?? todayYmd(),
    deadline: o?.deadline ?? '',
    note: o?.note ?? '',
    poza_url: o?.poza_url ?? null,
    avans: '',
    avans_metoda: 'numerar',
  };
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.titlu.trim()) e.titlu = 'Scrie un titlu pentru comandă.';
  // gramele și durata sunt opționale: se pot completa după proiectare
  if (f.grame_filament.trim() !== '' && (!isNum(f.grame_filament) || toNum(f.grame_filament) < 0)) e.grame_filament = 'Gramele nu sunt valide.';
  if (f.durata_print_ore.trim() !== '' && (!isHours(f.durata_print_ore) || toHours(f.durata_print_ore) < 0)) e.durata_print_ore = 'Durată invalidă (ex. 3.5 sau 2h 35m).';
  if (!isNum(f.nr_bucati) || !Number.isInteger(toNum(f.nr_bucati)) || toNum(f.nr_bucati) < 1) e.nr_bucati = 'Minim 1 bucată.';
  if (f.pret_vanzare.trim() !== '' && (!isNum(f.pret_vanzare) || toNum(f.pret_vanzare) < 0)) e.pret_vanzare = 'Preț invalid.';
  if (!f.data_comanda) e.data_comanda = 'Alege data comenzii.';
  if (f.deadline && f.data_comanda && f.deadline < f.data_comanda) e.deadline = 'Deadline-ul nu poate fi înaintea datei comenzii.';
  if (f.avans.trim() !== '' && (!isNum(f.avans) || toNum(f.avans) < 0)) e.avans = 'Sumă invalidă.';
  return e;
}

/** Valori unice nenule, în ordinea apariției (comenzile vin cele mai noi primele). */
const uniq = (list: (string | null)[], max = 200) => [...new Set(list.map((s) => s?.trim()).filter((s): s is string => !!s))].slice(0, max);

export function OrderFormPanel({
  open, order, prefill, onClose, onSaved,
}: {
  open: boolean;
  order?: Order;
  prefill?: Partial<Order>;
  onClose: () => void;
  onSaved: (o: Order) => void;
}) {
  const { clients, orders, settings, schedule, reload } = useData();
  const { toast, confirm } = useFeedback();
  const [f, setF] = useState<FormState>(() => fromOrder(order ?? prefill, clients));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState<false | 'save' | 'again'>(false);
  const [uploading, setUploading] = useState(false);
  const [markup, setMarkup] = useState(String(settings.adaos_procent));
  const [showMore, setShowMore] = useState(!!order);
  // comenzile noi se adaugă de obicei ÎNAINTE de proiectare: fără grame/timp/calculator
  const hasPrintInfo = (o?: Partial<Order>) => Number(o?.grame_filament) > 0 || Number(o?.durata_print_ore) > 0;
  const [showPrint, setShowPrint] = useState(() => !!order || hasPrintInfo(prefill));
  const [usedTemplate, setUsedTemplate] = useState<number | null>(null);
  const uploadedRef = useRef<string | null>(null);
  const initialRef = useRef('');
  const fileRef = useRef<HTMLInputElement>(null);
  const photo = usePhotoUrl(f.poza_url);

  const reset = (state: FormState) => {
    setF(state);
    initialRef.current = JSON.stringify(state);
    setErrors({});
    setUsedTemplate(null);
    uploadedRef.current = null;
  };

  useEffect(() => {
    if (open) {
      reset(fromOrder(order ?? prefill, clients));
      setMarkup(String(settings.adaos_procent));
      setShowMore(!!order);
      setShowPrint(!!order || hasPrintInfo(prefill));
    }
    // `clients` lipsește intenționat: o reîncărcare a datelor nu trebuie să golească formularul
  }, [open, order, prefill, settings.adaos_procent]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const materials = useMemo(() => {
    const list = Object.keys(settings.pret_filament_lei_kg ?? {});
    const all = list.length ? list : DEFAULT_MATERIALS;
    return all.includes(f.material) ? all : [...all, f.material];
  }, [settings.pret_filament_lei_kg, f.material]);

  // sugestii din comenzile anterioare
  const titles = useMemo(() => uniq(orders.map((o) => o.titlu)), [orders]);
  const colors = useMemo(() => uniq(orders.map((o) => o.culoare), 50), [orders]);

  // aceeași comandă făcută înainte? -> o poți folosi drept șablon
  const template = useMemo(() => {
    if (order) return undefined;
    const n = f.titlu.trim().toLowerCase();
    if (n.length < 2) return undefined;
    return orders.find((o) => o.titlu.trim().toLowerCase() === n && o.status !== 'anulata' && !missingPrintInfo(o));
  }, [orders, f.titlu, order]);

  const applyTemplate = (o: Order) => {
    setF((s) => {
      const c = !s.client_text.trim() && o.client_id ? clients.find((x) => x.id === o.client_id) : undefined;
      return {
        ...s,
        material: o.material,
        culoare: o.culoare ?? '',
        grame_filament: String(o.grame_filament),
        durata_print_ore: String(o.durata_print_ore),
        nr_bucati: String(o.nr_bucati),
        pret_vanzare: String(o.pret_vanzare),
        descriere: s.descriere || (o.descriere ?? ''),
        ...(c ? { client_id: String(c.id), client_text: c.nume } : {}),
      };
    });
    setErrors({});
    setUsedTemplate(o.id);
    setShowPrint(true);
  };

  const cost = costBreakdown(
    settings,
    {
      material: f.material,
      grame_filament: isNum(f.grame_filament) ? toNum(f.grame_filament) : 0,
      durata_print_ore: isHours(f.durata_print_ore) ? toHours(f.durata_print_ore) : 0,
      nr_bucati: isNum(f.nr_bucati) ? toNum(f.nr_bucati) : 1,
    },
    isNum(markup) ? toNum(markup) : Number(settings.adaos_procent),
  );
  const price = isNum(f.pret_vanzare) ? toNum(f.pret_vanzare) : 0;
  const profit = price - cost.total;
  const isNewClient = !f.client_id && f.client_text.trim() !== '';

  // Estimare: când ar fi gata dacă intră acum la finalul cozii (sau poziția actuală)
  const estimate = useMemo(() => {
    const hrs = isHours(f.durata_print_ore) ? toHours(f.durata_print_ore) : 0;
    if (!hrs || ['finalizata', 'livrata', 'anulata'].includes(f.status)) return null;
    const scheduled = order ? schedule.items.find((i) => i.order.id === order.id) : undefined;
    const end = scheduled && Number(order!.durata_print_ore) === hrs ? scheduled.end : estimateIfAppended(schedule, hrs, settings);
    const margin = f.deadline ? (deadlineEnd(f.deadline).getTime() - end.getTime()) / 3_600_000 : null;
    return { end, margin, inQueue: !!scheduled };
  }, [f.durata_print_ore, f.status, f.deadline, order, schedule, settings]);

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) return toast('Poza este prea mare (maxim 15 MB).', 'error');
    setUploading(true);
    try {
      const path = await api.uploadPhoto(file);
      if (uploadedRef.current) await api.removePhoto(uploadedRef.current);
      uploadedRef.current = path;
      set('poza_url', path);
    } catch (e) {
      toast(api.friendlyError(e), 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const cancel = async () => {
    if (saving) return;
    const dirty = JSON.stringify(f) !== initialRef.current || !!uploadedRef.current;
    if (
      dirty &&
      !(await confirm({
        title: order ? 'Renunți la modificări?' : 'Renunți la comanda nouă?',
        text: 'Ce ai completat în formular se pierde.',
        confirmLabel: 'Da, renunță',
        danger: true,
      }))
    )
      return;
    if (uploadedRef.current) await api.removePhoto(uploadedRef.current).catch(() => undefined);
    onClose();
  };

  /** `again` = salvează și golește formularul pentru următoarea comandă. */
  const save = async (again: boolean) => {
    if (saving || uploading) return;
    const errs = validate(f);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      if (errs.data_comanda) setShowMore(true);
      if (errs.grame_filament || errs.durata_print_ore) setShowPrint(true);
      toast('Verifică câmpurile marcate cu roșu.', 'error');
      return;
    }
    setSaving(again ? 'again' : 'save');
    try {
      const clientName = f.client_text.trim();
      let clientId: number | null = f.client_id ? Number(f.client_id) : null;
      if (!clientId && clientName) {
        const existing = matchClient(clients, clientName);
        if (existing) clientId = existing.id;
        else {
          const c = await api.saveClient({ nume: clientName, telefon: f.client_tel.trim() || null, email: null, oras: null, note: null });
          clientId = c.id;
          // dacă salvarea comenzii eșuează, la reîncercare nu mai creăm clientul încă o dată
          setF((s) => ({ ...s, client_id: String(c.id) }));
        }
      }
      const input: OrderInput = {
        client_id: clientId,
        titlu: f.titlu.trim(),
        descriere: f.descriere.trim() || null,
        material: f.material,
        culoare: f.culoare.trim() || null,
        grame_filament: f.grame_filament.trim() ? toNum(f.grame_filament) : 0,
        durata_print_ore: f.durata_print_ore.trim() ? Math.round(toHours(f.durata_print_ore) * 100) / 100 : 0,
        nr_bucati: toNum(f.nr_bucati),
        pret_vanzare: f.pret_vanzare.trim() === '' ? 0 : toNum(f.pret_vanzare),
        status: f.status,
        prioritate: f.prioritate,
        data_comanda: f.data_comanda,
        deadline: f.deadline || null,
        note: f.note.trim() || null,
        poza_url: f.poza_url,
      };
      const saved = await api.saveOrder(input, order?.id);
      // poza veche înlocuită/ștearsă -> curățăm storage-ul
      if (order?.poza_url && order.poza_url !== f.poza_url) await api.removePhoto(order.poza_url).catch(() => undefined);
      if (uploadedRef.current && uploadedRef.current !== f.poza_url) await api.removePhoto(uploadedRef.current).catch(() => undefined);
      uploadedRef.current = null;

      const pending = missingPrintInfo(saved) && !order;
      let msg = order
        ? `Comanda #${saved.id} a fost actualizată.`
        : pending
          ? `Comanda #${saved.id} a fost adăugată · de proiectat.`
          : `Comanda #${saved.id} a fost adăugată.`;
      const avans = !order && f.avans.trim() ? toNum(f.avans) : 0;
      if (avans > 0) {
        try {
          await api.addPayment({ order_id: saved.id, suma: avans, data: todayYmd(), metoda: f.avans_metoda, note: null });
          msg = `Comanda #${saved.id} a fost adăugată, cu ${lei(avans)} încasați.`;
        } catch (e) {
          toast(`Comanda #${saved.id} a fost salvată, dar încasarea nu: ${api.friendlyError(e)}`, 'error');
        }
      }
      toast(again ? `${msg} Poți completa următoarea.` : msg);
      await reload();
      if (again) {
        // păstrăm clientul și data: de obicei urmează altă comandă de la același client
        reset({
          ...fromOrder(undefined, []),
          client_id: clientId ? String(clientId) : '',
          client_text: clientName,
          data_comanda: f.data_comanda,
        });
        setShowPrint(false);
        document.getElementById('f-titlu')?.focus();
      } else onSaved(saved);
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
      title={order ? `Editează comanda #${order.id}` : 'Comandă nouă'}
      subtitle={order ? order.titlu : 'Doar titlul e obligatoriu. Gramele și timpul le adaugi după proiectare.'}
      width="max-w-[560px]"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={cancel} className="mr-auto sm:mr-0">
            Renunță
          </Button>
          {!order && (
            <Button onClick={() => save(true)} loading={saving === 'again'} disabled={uploading || !!saving} title="Salvează și deschide un formular gol pentru următoarea comandă">
              <span className="hidden sm:inline">Adaugă și&nbsp;</span>încă una
            </Button>
          )}
          <Button variant="primary" type="submit" form="order-form" loading={saving === 'save'} disabled={uploading || !!saving} title="Ctrl + Enter">
            {order ? 'Salvează' : 'Adaugă comanda'}
          </Button>
        </div>
      }
    >
      <form
        id="order-form"
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        onKeyDown={(e) => {
          // Ctrl/Cmd + Enter salvează de oriunde din formular
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            save(false);
          }
        }}
        noValidate
        className="flex flex-col gap-5 px-5 py-5"
      >
        <Field label="Titlu" error={errors.titlu} htmlFor="f-titlu">
          <Input
            id="f-titlu"
            value={f.titlu}
            onChange={(e) => set('titlu', e.target.value)}
            invalid={!!errors.titlu}
            placeholder="ex. Suport telefon birou"
            autoFocus={!order}
            list="f-titluri"
            autoComplete="off"
          />
          <datalist id="f-titluri">
            {titles.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          {template && usedTemplate !== template.id && (
            <button
              type="button"
              onClick={() => applyTemplate(template)}
              className="flex items-center gap-2 self-start rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs text-fg transition-colors hover:bg-accent/20"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Ai mai făcut-o (#{template.id}) · completează gramele, durata și prețul
            </button>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Client" htmlFor="f-client" hint={isNewClient ? 'Client nou · se adaugă automat la salvare' : undefined}>
            <ClientPicker
              id="f-client"
              clients={clients}
              text={f.client_text}
              onChange={(text, c) => setF((s) => ({ ...s, client_text: text, client_id: c ? String(c.id) : '' }))}
            />
          </Field>
          {isNewClient && (
            <Field label="Telefon client nou" hint="Opțional · pentru mesaje pe WhatsApp" htmlFor="f-client-tel">
              <Input id="f-client-tel" type="tel" inputMode="tel" value={f.client_tel} onChange={(e) => set('client_tel', e.target.value)} placeholder="07xx xxx xxx" />
            </Field>
          )}
        </div>

        <Field label="Material">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Material">
            {materials.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={f.material === m}
                onClick={() => set('material', m)}
                className={`h-9 rounded-[10px] border px-3 text-sm transition-colors ${f.material === m ? 'border-accent bg-accent text-white shadow-glow' : 'border-line text-muted hover:border-fg hover:text-fg'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Culoare" htmlFor="f-culoare">
            <Input id="f-culoare" value={f.culoare} onChange={(e) => set('culoare', e.target.value)} placeholder="ex. Negru mat" list="f-culori" autoComplete="off" />
            <datalist id="f-culori">
              {colors.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Nr. bucăți" error={errors.nr_bucati} htmlFor="f-buc">
            <Input id="f-buc" inputMode="numeric" value={f.nr_bucati} onChange={(e) => set('nr_bucati', e.target.value)} invalid={!!errors.nr_bucati} />
          </Field>
        </div>

        {!showPrint ? (
          <div className="flex flex-col gap-3 rounded-tile border border-dashed border-line px-4 py-3.5 sm:flex-row sm:items-center">
            <PencilRuler className="hidden h-5 w-5 shrink-0 text-accent sm:block" />
            <p className="flex-1 text-sm text-muted">
              <span className="text-fg">Gramele și timpul de print le adaugi după ce proiectezi.</span> Comanda apare la „De proiectat” pe Dashboard, cu buton direct pentru ele.
            </p>
            <Button size="sm" onClick={() => setShowPrint(true)} className="self-start sm:self-auto">
              Am deja datele
            </Button>
          </div>
        ) : (
        <>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Filament total" error={errors.grame_filament} htmlFor="f-grame">
            <Input id="f-grame" inputMode="decimal" value={f.grame_filament} onChange={(e) => set('grame_filament', e.target.value)} invalid={!!errors.grame_filament} suffix="g" placeholder="0" />
          </Field>
          <Field
            label="Durată print totală"
            error={errors.durata_print_ore}
            hint={isHours(f.durata_print_ore) && !isNum(f.durata_print_ore) ? `= ${hours(toHours(f.durata_print_ore))}` : 'merge și „2h 35m” din Bambu'}
            htmlFor="f-ore"
          >
            <Input id="f-ore" value={f.durata_print_ore} onChange={(e) => set('durata_print_ore', e.target.value)} invalid={!!errors.durata_print_ore} suffix="h" placeholder="3.5" />
          </Field>
        </div>

        {/* Calculator automat */}
        <div className="rounded-tile border border-line bg-glass/60">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
            <span className="label flex items-center gap-2">
              <Calculator className="h-3.5 w-3.5" /> Calculator cost
            </span>
            <label className="flex items-center gap-2 text-xs text-muted">
              Adaos
              <input
                inputMode="decimal"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                className="num h-7 w-14 rounded border border-line bg-surface px-2 text-right text-sm text-fg focus:border-accent/70 focus:outline-none"
                aria-label="Adaos procent"
              />
              %
            </label>
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
                {Number(f.nr_bucati) > 1 && <span className="ml-2 text-sm text-muted">{lei(cost.perPiece)}/buc</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {price > 0 && (
                <span className="num text-sm">
                  <span className="text-muted">Profit la prețul tău: </span>
                  <span className={profit < 0 ? 'text-critical' : 'text-fg'}>{lei(profit)}</span>
                </span>
              )}
              <Button size="sm" onClick={() => set('pret_vanzare', String(cost.suggested))} disabled={!cost.suggested}>
                Aplică
              </Button>
            </div>
          </div>
        </div>
        </>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Preț vânzare" error={errors.pret_vanzare} htmlFor="f-pret" hint={
              f.pret_vanzare.trim() !== ''
                ? undefined
                : cost.suggested
                  ? 'Gol = 0 lei · apasă „Aplică” pentru prețul sugerat'
                  : 'Opțional · îl stabilești și după proiectare'
            }>
            <Input id="f-pret" inputMode="decimal" value={f.pret_vanzare} onChange={(e) => set('pret_vanzare', e.target.value)} invalid={!!errors.pret_vanzare} suffix="lei" placeholder={cost.suggested ? String(cost.suggested) : '0'} />
          </Field>
          {!order && (
            <Field label="Încasat acum" error={errors.avans} htmlFor="f-avans" hint="Opțional · avans sau tot">
              <Input id="f-avans" inputMode="decimal" value={f.avans} onChange={(e) => set('avans', e.target.value)} invalid={!!errors.avans} suffix="lei" placeholder="0" />
              <div className="flex flex-wrap gap-1.5">
                {price > 0 && (
                  <button type="button" onClick={() => set('avans', String(price))} className={chip(f.avans === String(price))}>
                    tot · {lei(price)}
                  </button>
                )}
                {f.avans.trim() !== '' &&
                  PAYMENT_METHODS.slice(0, 3).map((m) => (
                    <button key={m.value} type="button" onClick={() => set('avans_metoda', m.value)} className={chip(f.avans_metoda === m.value)}>
                      {m.label}
                    </button>
                  ))}
              </div>
            </Field>
          )}
          <Field label="Prioritate">
            <Segmented value={f.prioritate} onChange={(v) => set('prioritate', v)} options={PRIORITIES} />
          </Field>
          <Field label="Deadline" error={errors.deadline} htmlFor="f-deadline">
            <Input id="f-deadline" type="date" value={f.deadline} onChange={(e) => set('deadline', e.target.value)} invalid={!!errors.deadline} />
            <div className="flex flex-wrap gap-1.5">
              {DEADLINE_CHIPS.map((c) => {
                const v = addDays(f.data_comanda, c.days);
                return (
                  <button key={c.days} type="button" onClick={() => set('deadline', v)} className={chip(f.deadline === v)}>
                    {c.label}
                  </button>
                );
              })}
              {f.deadline && (
                <button type="button" onClick={() => set('deadline', '')} className="rounded-full px-2 py-0.5 text-xs text-muted hover:text-fg">
                  fără deadline
                </button>
              )}
            </div>
          </Field>
        </div>

        {estimate && (
          <div className="flex items-start gap-2.5 rounded-card border border-line px-4 py-3 text-sm">
            <Dot signal={estimate.margin == null ? 'neutral' : estimate.margin < 0 ? 'critical' : estimate.margin < 24 ? 'warning' : 'ok'} className="mt-1.5" />
            <span className="num text-muted">
              {estimate.inQueue ? 'Final estimat în coadă: ' : 'Dacă intră acum la finalul cozii, e gata '}
              <span className="text-fg">{dateTime(estimate.end)}</span>
              {estimate.margin != null && (
                <>
                  {' · '}
                  <span className={estimate.margin < 0 ? 'text-critical' : estimate.margin < 24 ? 'text-warning' : 'text-fg'}>
                    {signedHours(estimate.margin)}
                  </span>{' '}
                  față de deadline
                </>
              )}
            </span>
          </div>
        )}

        {/* Câmpurile folosite mai rar stau ascunse la comenzile noi */}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="-my-1 flex items-center gap-2 self-start text-sm text-muted hover:text-fg"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showMore ? 'rotate-180' : ''}`} />
          {showMore ? 'Mai puține detalii' : 'Mai multe detalii · status, dată, descriere, note, poză'}
        </button>

        {showMore && (
          <div className="flex animate-fade-in flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Status" htmlFor="f-status">
                <Select id="f-status" value={f.status} onChange={(e) => set('status', e.target.value as OrderStatus)}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Data comenzii" error={errors.data_comanda} htmlFor="f-data">
                <Input id="f-data" type="date" value={f.data_comanda} onChange={(e) => set('data_comanda', e.target.value)} invalid={!!errors.data_comanda} />
              </Field>
            </div>

            <Field label="Descriere" htmlFor="f-desc">
              <Textarea id="f-desc" value={f.descriere} onChange={(e) => set('descriere', e.target.value)} rows={2} placeholder="Dimensiuni, fișier, detalii…" />
            </Field>
            <Field label="Note interne" htmlFor="f-note">
              <Textarea id="f-note" value={f.note} onChange={(e) => set('note', e.target.value)} rows={2} />
            </Field>

            <Field label="Poză">
              <div className="flex items-center gap-3">
                {photo ? (
                  <img src={photo} alt="" className="h-20 w-20 rounded border border-line object-cover" />
                ) : (
                  <div className="hatch h-20 w-20 rounded border border-line" />
                )}
                <div className="flex flex-col gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
                  <Button size="sm" icon={<ImagePlus className="h-3.5 w-3.5" />} onClick={() => fileRef.current?.click()} loading={uploading}>
                    {f.poza_url ? 'Schimbă poza' : 'Adaugă poză'}
                  </Button>
                  {f.poza_url && (
                    <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => set('poza_url', null)}>
                      Elimină
                    </Button>
                  )}
                </div>
              </div>
            </Field>
          </div>
        )}
      </form>
    </SlideOver>
  );
}
