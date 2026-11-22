import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, MessageCircle, Pencil, Phone, Plus, Trash2, X } from 'lucide-react';
import { messageTemplates, telLink, waLink } from '@/lib/contact';
import type { Order, OrderEvent, PaymentMethod } from '@/types/db';
import * as api from '@/lib/api';
import { amountDue, electricityCost, orderProfit } from '@/lib/calc';
import { PAYMENT_METHODS } from '@/lib/constants';
import { date, dateTime, grams, hours, lei, relativeDateTime, signedHours, smart, todayYmd } from '@/lib/format';
import { parseNumber } from '@/lib/parse';
import { useData } from '@/hooks/useData';
import { Button, IconButton } from '@/components/ui/Button';
import { ProgressBar, Stat } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { Dot, PaidSignal, Signal, riskSignal } from '@/components/ui/Status';
import { SlideOver } from '@/components/ui/SlideOver';
import { Skeleton } from '@/components/ui/Feedback';
import { useFeedback } from '@/components/ui/Toast';
import { StatusMenu, nextStep } from './StatusMenu';
import { useChangeStatus } from './useOrderActions';
import { usePhotoUrl } from './usePhotoUrl';

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="label">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function OrderDetailPanel({
  orderId, onClose, onEdit, onDuplicate,
}: {
  orderId: number | null;
  onClose: () => void;
  onEdit: (o: Order) => void;
  /** comandă nouă precompletată cu datele acesteia (comenzi repetate) */
  onDuplicate: (prefill: Partial<Order>) => void;
}) {
  const { orders, payments, settings, schedule, clientById, reload, now } = useData();
  const { toast, confirm } = useFeedback();
  const changeStatus = useChangeStatus();
  const order = orders.find((o) => o.id === orderId) ?? null;
  const photo = usePhotoUrl(order?.poza_url);
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [pay, setPay] = useState({ suma: '', data: todayYmd(), metoda: 'numerar' as PaymentMethod });
  const [busy, setBusy] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!orderId) return;
    try {
      setEvents(await api.fetchEvents(orderId));
    } catch {
      setEvents([]);
    }
  }, [orderId]);

  useEffect(() => {
    setEvents(null);
    setPayOpen(false);
    loadEvents();
  }, [loadEvents, order?.updated_at]);

  if (!orderId) return null;
  if (!order) {
    return (
      <SlideOver open onClose={onClose} title="Comandă inexistentă">
        <p className="px-5 py-6 text-sm text-muted">Comanda a fost ștearsă sau nu există.</p>
      </SlideOver>
    );
  }

  const client = clientById(order.client_id);
  const item = schedule.items.find((i) => i.order.id === order.id);
  const due = amountDue(order);
  const elec = electricityCost(settings, Number(order.durata_print_ore));
  const profit = orderProfit(settings, order);
  const orderPayments = payments.filter((p) => p.order_id === order.id);
  const next = nextStep(order.status);
  const wa = (text: string) => waLink(client?.telefon, text);
  const tel = telLink(client?.telefon);
  const templates = client?.telefon ? messageTemplates(order, client.nume) : [];

  const duplicate = () =>
    onDuplicate({
      client_id: order.client_id,
      titlu: order.titlu,
      descriere: order.descriere,
      material: order.material,
      culoare: order.culoare,
      grame_filament: order.grame_filament,
      durata_print_ore: order.durata_print_ore,
      nr_bucati: order.nr_bucati,
      pret_vanzare: order.pret_vanzare,
      prioritate: order.prioritate,
      note: order.note,
    });

  const addPayment = async (suma: number) => {
    if (!(suma > 0)) return toast('Introdu o sumă mai mare ca 0.', 'error');
    setBusy(true);
    try {
      await api.addPayment({ order_id: order.id, suma, data: pay.data || todayYmd(), metoda: pay.metoda, note: null });
      toast(`Încasare de ${lei(suma)} înregistrată.`);
      setPayOpen(false);
      setPay({ suma: '', data: todayYmd(), metoda: 'numerar' });
      await reload();
    } catch (e) {
      toast(api.friendlyError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removePayment = async (id: number, suma: number) => {
    if (!(await confirm({ title: `Ștergi încasarea de ${lei(suma)}?`, confirmLabel: 'Șterge', danger: true }))) return;
    try {
      await api.deletePayment(id);
      toast('Încasarea a fost ștearsă.');
      await reload();
    } catch (e) {
      toast(api.friendlyError(e), 'error');
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Ștergi comanda #${order.id}?`,
      text: 'Se șterg definitiv comanda, încasările și istoricul ei. Acțiunea nu poate fi anulată.',
      confirmLabel: 'Șterge definitiv',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteOrder(order);
      toast(`Comanda #${order.id} a fost ștearsă.`);
      onClose();
      await reload();
    } catch (e) {
      toast(api.friendlyError(e), 'error');
    }
  };

  return (
    <SlideOver
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="num text-muted">#{order.id}</span>
          <span className="truncate">{order.titlu}</span>
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusMenu order={order} />
          {order.prioritate === 'urgenta' && <Signal signal="warning" label="Urgentă" />}
          {client ? (
            <Link to={`/clienti/${client.id}`} onClick={onClose} className="hover:text-fg hover:underline">
              {client.nume}
            </Link>
          ) : (
            <span>Fără client</span>
          )}
        </span>
      }
      footer={
        <div className="flex items-center gap-2">
          {next && order.status !== 'anulata' && (
            <Button variant="primary" className="flex-1 sm:flex-none" onClick={() => changeStatus(order, next.status)}>
              {next.label}
            </Button>
          )}
          <Button icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => onEdit(order)}>
            Editează
          </Button>
          <IconButton label="Duplică (comandă nouă la fel)" onClick={duplicate} className="ml-auto">
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton label="Șterge comanda" onClick={remove} className="hover:text-critical">
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      }
    >
      {/* Programare */}
      {item && (
        <Section title={item.isPrinting ? 'Se printează acum' : `În coadă · poziția ${schedule.items.indexOf(item) + 1}`}>
          {item.isPrinting && (
            <div className="mb-4">
              <div className="num mb-2 flex items-baseline justify-between">
                <span className="text-kpi font-light">{Math.round(item.progress * 100)}%</span>
                <span className="text-sm text-muted">rămas {hours(item.remainingHours)}</span>
              </div>
              <ProgressBar value={item.progress} signal={item.overdue ? 'warning' : 'ok'} />
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <Stat label={item.isPrinting ? 'Început' : 'Start estimat'} value={relativeDateTime(item.start, now)} />
            <Stat label="Final estimat" value={relativeDateTime(item.end, now)} />
            <Stat
              label="Față de deadline"
              value={
                item.marginHours == null ? (
                  <span className="text-muted">fără deadline</span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Dot signal={riskSignal(item.risk)} />
                    <span className={item.risk === 'late' ? 'text-critical' : item.risk === 'tight' ? 'text-warning' : ''}>{signedHours(item.marginHours)}</span>
                  </span>
                )
              }
            />
          </div>
        </Section>
      )}

      {/* Contact rapid: mesaj precompletat pe WhatsApp */}
      {client && (!client.telefon || templates.length > 0) && (
        <Section
          title="Scrie clientului"
          right={
            tel && (
              <a href={tel} className="flex items-center gap-1.5 text-xs text-muted hover:text-fg">
                <Phone className="h-3.5 w-3.5" /> {client.telefon}
              </a>
            )
          }
        >
          {templates.length ? (
            <div className="flex flex-wrap gap-2">
              {templates.map((t, i) => {
                const href = wa(t.text);
                return href ? (
                  <a
                    key={t.id}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    title={t.text}
                    className={`inline-flex h-8 items-center gap-1.5 rounded border px-2.5 text-sm transition-colors ${
                      i === 0 ? 'border-ok/40 bg-ok/10 text-fg hover:bg-ok/20' : 'border-line text-muted hover:border-fg hover:text-fg'
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> {t.label}
                  </a>
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Adaugă un număr de telefon la{' '}
              <Link to={`/clienti/${client.id}`} onClick={onClose} className="text-fg underline">
                {client.nume}
              </Link>{' '}
              ca să-i trimiți mesaje pe WhatsApp dintr-o apăsare.
            </p>
          )}
        </Section>
      )}

      {/* Bani */}
      <Section title="Financiar" right={<PaidSignal platit={order.platit} />}>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Preț" value={lei(Number(order.pret_vanzare))} />
          <Stat label="Cost material" value={lei(Number(order.cost_material), { decimals: true })} />
          <Stat label="Cost curent" value={lei(elec, { decimals: true })} />
          <Stat label="Profit estimat" value={<span className={profit < 0 ? 'text-critical' : ''}>{lei(profit)}</span>} />
          <Stat label="Încasat" value={lei(Number(order.suma_incasata))} />
          <Stat label="Rest de plată" value={<span className={due > 0 && ['finalizata', 'livrata'].includes(order.status) ? 'text-warning' : ''}>{lei(due)}</span>} />
        </div>

        <div className="mt-4 flex flex-col">
          {orderPayments.map((p) => (
            <div key={p.id} className="num flex h-9 items-center gap-3 border-t border-line text-sm">
              <Dot signal="ok" />
              <span className="w-24 text-muted">{date(p.data)}</span>
              <span className="flex-1">{lei(Number(p.suma))}</span>
              <span className="text-muted">{PAYMENT_METHODS.find((m) => m.value === p.metoda)?.label}</span>
              <button onClick={() => removePayment(p.id, Number(p.suma))} className="text-muted-2 hover:text-critical" aria-label="Șterge încasarea">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {order.status !== 'anulata' && (
          <div className="mt-3">
            {!payOpen ? (
              <div className="flex flex-wrap gap-2">
                {due > 0 && (
                  <Button size="sm" variant="primary" loading={busy} onClick={() => addPayment(due)}>
                    Încasează restul · {lei(due)}
                  </Button>
                )}
                <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setPayOpen(true)}>
                  Altă sumă
                </Button>
              </div>
            ) : (
              <form
                className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                onSubmit={(e) => {
                  e.preventDefault();
                  addPayment(parseNumber(pay.suma));
                }}
              >
                <Input inputMode="decimal" placeholder="Sumă" suffix="lei" value={pay.suma} onChange={(e) => setPay({ ...pay, suma: e.target.value })} autoFocus aria-label="Sumă" />
                <Input type="date" value={pay.data} onChange={(e) => setPay({ ...pay, data: e.target.value })} aria-label="Data încasării" />
                <Select value={pay.metoda} onChange={(e) => setPay({ ...pay, metoda: e.target.value as PaymentMethod })} aria-label="Metodă">
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" loading={busy}>
                    Salvează
                  </Button>
                  <IconButton label="Renunță" onClick={() => setPayOpen(false)}>
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </form>
            )}
          </div>
        )}
      </Section>

      {/* Detalii */}
      <Section title="Detalii print">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Material" value={order.material} />
          <Stat label="Culoare" value={order.culoare || '—'} />
          <Stat label="Bucăți" value={order.nr_bucati} />
          <Stat label="Filament" value={grams(Number(order.grame_filament))} />
          <Stat label="Durată" value={hours(Number(order.durata_print_ore))} />
          <Stat label="Pe bucată" value={`${smart(Number(order.durata_print_ore) / order.nr_bucati, 1)} h`} />
          <Stat label="Data comenzii" value={date(order.data_comanda)} />
          <Stat label="Deadline" value={date(order.deadline)} />
          <Stat label={order.data_finalizare ? 'Finalizată' : 'Început'} value={order.data_finalizare ? dateTime(order.data_finalizare) : dateTime(order.data_start)} />
        </div>
        {order.descriere && <p className="mt-4 whitespace-pre-wrap text-sm text-fg/90">{order.descriere}</p>}
        {order.note && (
          <p className="mt-3 whitespace-pre-wrap rounded border border-line bg-glass/60 px-3 py-2 text-sm text-muted">
            <span className="label mr-2">Notă</span>
            {order.note}
          </p>
        )}
      </Section>

      {order.poza_url && (
        <Section title="Poză">
          {photo ? (
            <a href={photo} target="_blank" rel="noreferrer">
              <img src={photo} alt={order.titlu} className="max-h-72 w-full rounded border border-line object-contain" />
            </a>
          ) : (
            <Skeleton className="h-48 w-full" />
          )}
        </Section>
      )}

      {/* Istoric */}
      <Section title="Istoric">
        {events === null ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted">Fără evenimente.</p>
        ) : (
          <ol className="relative flex flex-col gap-3 border-l border-line pl-4">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span className={`absolute -left-[19.5px] top-1.5 h-1.5 w-1.5 rounded-full ${e.tip === 'incasare' ? 'bg-ok' : 'bg-muted-2'}`} />
                <div className="text-sm">{e.detalii}</div>
                <div className="num text-xs text-muted">{dateTime(e.created_at)}</div>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </SlideOver>
  );
}
