import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, ImagePlus, Trash2 } from 'lucide-react';
import type { Order, OrderInput, OrderStatus, Priority } from '@/types/db';
import * as api from '@/lib/api';
import { costBreakdown } from '@/lib/calc';
import { DEFAULT_MATERIALS, PRIORITIES, STATUSES } from '@/lib/constants';
import { dateTime, deadlineEnd, lei, signedHours, todayYmd } from '@/lib/format';
import { estimateIfAppended } from '@/lib/schedule';
import { useData } from '@/hooks/useData';
import { Button } from '@/components/ui/Button';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Field';
import { Dot } from '@/components/ui/Status';
import { useFeedback } from '@/components/ui/Toast';
import { SlideOver } from '@/components/ui/SlideOver';
import { usePhotoUrl } from './usePhotoUrl';

interface FormState {
  client_id: string; // '' | 'new' | id
  client_nou: string;
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
}

type Errors = Partial<Record<keyof FormState, string>>;

const toNum = (s: string) => Number(String(s).replace(',', '.').trim());
const isNum = (s: string) => s.trim() !== '' && Number.isFinite(toNum(s));

function fromOrder(o?: Partial<Order>): FormState {
  return {
    client_id: o?.client_id ? String(o.client_id) : '',
    client_nou: '',
    titlu: o?.titlu ?? '',
    descriere: o?.descriere ?? '',
    material: o?.material ?? 'PLA',
    culoare: o?.culoare ?? '',
    grame_filament: o?.grame_filament != null ? String(o.grame_filament) : '',
    durata_print_ore: o?.durata_print_ore != null ? String(o.durata_print_ore) : '',
    nr_bucati: String(o?.nr_bucati ?? 1),
    pret_vanzare: o?.pret_vanzare != null ? String(o.pret_vanzare) : '',
    status: o?.status ?? 'noua',
    prioritate: o?.prioritate ?? 'normala',
    data_comanda: o?.data_comanda ?? todayYmd(),
    deadline: o?.deadline ?? '',
    note: o?.note ?? '',
    poza_url: o?.poza_url ?? null,
  };
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.titlu.trim()) e.titlu = 'Scrie un titlu pentru comandă.';
  if (f.client_id === 'new' && !f.client_nou.trim()) e.client_nou = 'Scrie numele clientului nou.';
  if (!isNum(f.grame_filament) || toNum(f.grame_filament) < 0) e.grame_filament = 'Introdu gramele (0 sau mai mult).';
  if (!isNum(f.durata_print_ore) || toNum(f.durata_print_ore) < 0) e.durata_print_ore = 'Introdu durata în ore (ex. 3.5).';
  if (!isNum(f.nr_bucati) || !Number.isInteger(toNum(f.nr_bucati)) || toNum(f.nr_bucati) < 1) e.nr_bucati = 'Minim 1 bucată.';
  if (f.pret_vanzare.trim() !== '' && (!isNum(f.pret_vanzare) || toNum(f.pret_vanzare) < 0)) e.pret_vanzare = 'Preț invalid.';
  if (!f.data_comanda) e.data_comanda = 'Alege data comenzii.';
  if (f.deadline && f.data_comanda && f.deadline < f.data_comanda) e.deadline = 'Deadline-ul nu poate fi înaintea datei comenzii.';
  return e;
}

export function OrderFormPanel({
  open, order, prefill, onClose, onSaved,
}: {
  open: boolean;
  order?: Order;
  prefill?: Partial<Order>;
  onClose: () => void;
  onSaved: (o: Order) => void;
}) {
  const { clients, settings, schedule, reload } = useData();
  const { toast } = useFeedback();
  const [f, setF] = useState<FormState>(() => fromOrder(order ?? prefill));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [markup, setMarkup] = useState(String(settings.adaos_procent));
  const uploadedRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photo = usePhotoUrl(f.poza_url);

  useEffect(() => {
    if (open) {
      setF(fromOrder(order ?? prefill));
      setErrors({});
      setMarkup(String(settings.adaos_procent));
      uploadedRef.current = null;
    }
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

  const cost = costBreakdown(
    settings,
    {
      material: f.material,
      grame_filament: isNum(f.grame_filament) ? toNum(f.grame_filament) : 0,
      durata_print_ore: isNum(f.durata_print_ore) ? toNum(f.durata_print_ore) : 0,
      nr_bucati: isNum(f.nr_bucati) ? toNum(f.nr_bucati) : 1,
    },
    isNum(markup) ? toNum(markup) : Number(settings.adaos_procent),
  );
  const price = isNum(f.pret_vanzare) ? toNum(f.pret_vanzare) : 0;
  const profit = price - cost.total;

  // Estimare: când ar fi gata dacă intră acum la finalul cozii (sau poziția actuală)
  const estimate = useMemo(() => {
    const hrs = isNum(f.durata_print_ore) ? toNum(f.durata_print_ore) : 0;
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
    if (uploadedRef.current) await api.removePhoto(uploadedRef.current).catch(() => undefined);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      toast('Verifică câmpurile marcate cu roșu.', 'error');
      return;
    }
    setSaving(true);
    try {
      let clientId: number | null = f.client_id && f.client_id !== 'new' ? Number(f.client_id) : null;
      if (f.client_id === 'new') {
        const c = await api.saveClient({ nume: f.client_nou.trim(), telefon: null, email: null, oras: null, note: null });
        clientId = c.id;
      }
      const input: OrderInput = {
        client_id: clientId,
        titlu: f.titlu.trim(),
        descriere: f.descriere.trim() || null,
        material: f.material,
        culoare: f.culoare.trim() || null,
        grame_filament: toNum(f.grame_filament),
        durata_print_ore: toNum(f.durata_print_ore),
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
      toast(order ? `Comanda #${saved.id} a fost actualizată.` : `Comanda #${saved.id} a fost adăugată.`);
      await reload();
      onSaved(saved);
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
      subtitle={order ? order.titlu : 'Completează detaliile; costul se calculează automat.'}
      width="max-w-[560px]"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={cancel}>
            Renunță
          </Button>
          <Button variant="primary" type="submit" form="order-form" loading={saving} disabled={uploading}>
            {order ? 'Salvează' : 'Adaugă comanda'}
          </Button>
        </div>
      }
    >
      <form id="order-form" onSubmit={submit} noValidate className="flex flex-col gap-5 px-5 py-5">
        <Field label="Titlu" error={errors.titlu} htmlFor="f-titlu">
          <Input id="f-titlu" value={f.titlu} onChange={(e) => set('titlu', e.target.value)} invalid={!!errors.titlu} placeholder="ex. Suport telefon birou" autoFocus={!order} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Client" htmlFor="f-client">
            <Select id="f-client" value={f.client_id} onChange={(e) => set('client_id', e.target.value)}>
              <option value="">— fără client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nume}
                </option>
              ))}
              <option value="new">+ Client nou…</option>
            </Select>
          </Field>
          {f.client_id === 'new' && (
            <Field label="Nume client nou" error={errors.client_nou} htmlFor="f-client-nou">
              <Input id="f-client-nou" value={f.client_nou} onChange={(e) => set('client_nou', e.target.value)} invalid={!!errors.client_nou} placeholder="Nume și prenume" />
            </Field>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Material" htmlFor="f-material">
            <Select id="f-material" value={f.material} onChange={(e) => set('material', e.target.value)}>
              {materials.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Culoare" htmlFor="f-culoare">
            <Input id="f-culoare" value={f.culoare} onChange={(e) => set('culoare', e.target.value)} placeholder="ex. Negru mat" />
          </Field>
          <Field label="Filament total" error={errors.grame_filament} htmlFor="f-grame">
            <Input id="f-grame" inputMode="decimal" value={f.grame_filament} onChange={(e) => set('grame_filament', e.target.value)} invalid={!!errors.grame_filament} suffix="g" placeholder="0" />
          </Field>
          <Field label="Durată print totală" error={errors.durata_print_ore} htmlFor="f-ore">
            <Input id="f-ore" inputMode="decimal" value={f.durata_print_ore} onChange={(e) => set('durata_print_ore', e.target.value)} invalid={!!errors.durata_print_ore} suffix="h" placeholder="3.5" />
          </Field>
          <Field label="Nr. bucăți" error={errors.nr_bucati} htmlFor="f-buc">
            <Input id="f-buc" inputMode="numeric" value={f.nr_bucati} onChange={(e) => set('nr_bucati', e.target.value)} invalid={!!errors.nr_bucati} />
          </Field>
          <Field label="Preț vânzare" error={errors.pret_vanzare} htmlFor="f-pret">
            <Input id="f-pret" inputMode="decimal" value={f.pret_vanzare} onChange={(e) => set('pret_vanzare', e.target.value)} invalid={!!errors.pret_vanzare} suffix="lei" placeholder={cost.suggested ? String(cost.suggested) : '0'} />
          </Field>
        </div>

        {/* Calculator automat */}
        <div className="rounded-card border border-line bg-bg">
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
                className="num h-7 w-14 rounded border border-line bg-surface px-2 text-right text-sm text-fg focus:border-muted focus:outline-none"
                aria-label="Adaos procent"
              />
              %
            </label>
          </div>
          <dl className="num grid grid-cols-3 gap-px bg-line text-sm">
            {[
              ['Material', lei(cost.material, { decimals: true })],
              ['Curent', lei(cost.electricity, { decimals: true })],
              ['Cost real', lei(cost.total, { decimals: true })],
            ].map(([k, v]) => (
              <div key={k} className="bg-bg px-4 py-2.5">
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
          <Field label="Prioritate">
            <Segmented value={f.prioritate} onChange={(v) => set('prioritate', v)} options={PRIORITIES} />
          </Field>
          <Field label="Data comenzii" error={errors.data_comanda} htmlFor="f-data">
            <Input id="f-data" type="date" value={f.data_comanda} onChange={(e) => set('data_comanda', e.target.value)} invalid={!!errors.data_comanda} />
          </Field>
          <Field label="Deadline" error={errors.deadline} htmlFor="f-deadline">
            <Input id="f-deadline" type="date" value={f.deadline} onChange={(e) => set('deadline', e.target.value)} invalid={!!errors.deadline} />
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
      </form>
    </SlideOver>
  );
}
