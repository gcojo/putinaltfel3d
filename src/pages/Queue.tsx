import { useState } from 'react';
import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxisModifier } from '@/components/queue/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, PencilRuler, Plus } from 'lucide-react';
import * as api from '@/lib/api';
import { useData } from '@/hooks/useData';
import { dateShort, dateTime, deadlineEnd, hours, relativeDateTime, signedHours, time } from '@/lib/format';
import { estimateIfAppended, type ScheduledItem } from '@/lib/schedule';
import { needsDesign } from '@/lib/design';
import { PageHeader } from '@/components/layout/AppLayout';
import { Card, CardHeader, ProgressBar } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dot, Signal, riskSignal } from '@/components/ui/Status';
import { EmptyState, ErrorBanner, SkeletonRows } from '@/components/ui/Feedback';
import { useFeedback } from '@/components/ui/Toast';
import { QueueTimeline } from '@/components/queue/QueueTimeline';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';
import { useChangeStatus } from '@/components/orders/useOrderActions';

function Margin({ item }: { item: ScheduledItem }) {
  if (item.marginHours == null) return <span className="text-muted-2">fără deadline</span>;
  return (
    <span className={`flex items-center gap-1.5 ${item.risk === 'late' ? 'text-critical' : item.risk === 'tight' ? 'text-warning' : 'text-muted'}`}>
      <Dot signal={riskSignal(item.risk)} />
      {signedHours(item.marginHours)}
    </span>
  );
}

function Row({ item, index, draggable }: { item: ScheduledItem; index: number; draggable: boolean }) {
  const { clientById, now } = useData();
  const { openOrder } = useOrderPanel();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.order.id, disabled: !draggable });
  const o = item.order;
  const client = clientById(o.client_id);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`num relative flex items-stretch border-b border-line bg-surface ${isDragging ? 'z-10 border-line-strong bg-surface-2 opacity-95' : ''} ${
        item.risk === 'late' ? 'shadow-[inset_3px_0_0_#C62F2C]' : item.risk === 'tight' ? 'shadow-[inset_3px_0_0_#D98324]' : ''
      }`}
    >
      {draggable ? (
        <button
          {...attributes}
          {...listeners}
          className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center text-muted-2 hover:text-fg active:cursor-grabbing"
          aria-label={`Mută comanda #${o.id}`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex w-10 shrink-0 items-center justify-center">
          <Dot signal="ok" pulse />
        </div>
      )}
      <button onClick={() => openOrder(o.id)} className="flex min-w-0 flex-1 flex-col gap-1 py-2.5 pr-3 text-left md:grid md:grid-cols-[28px_minmax(0,2fr)_70px_150px_150px_120px] md:items-center md:gap-3">
        <span className="hidden text-muted md:block">{index + 1}</span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-muted">#{o.id}</span>
            <span className="truncate text-base">{o.titlu}</span>
            {o.prioritate === 'urgenta' && <Signal signal="warning" label="Urg" />}
          </span>
          <span className="block truncate text-xs text-muted">
            {client?.nume ?? 'Fără client'} · {o.material}
            {o.deadline ? ` · deadline ${dateShort(o.deadline)}` : ''}
          </span>
          {item.isPrinting && <ProgressBar value={item.progress} className="mt-1.5 max-w-[240px]" signal={item.overdue ? 'warning' : 'ok'} />}
        </span>
        <span className="flex items-center justify-between gap-3 text-sm md:contents">
          <span className="md:text-right">{hours(item.isPrinting ? item.remainingHours : Number(o.durata_print_ore))}</span>
          <span className="text-muted">
            <span className="md:hidden">→ </span>
            {item.isPrinting ? `început ${time(item.start)}` : relativeDateTime(item.start, now)}
          </span>
          <span>
            <span className="label mr-1 md:hidden">gata</span>
            {relativeDateTime(item.end, now)}
          </span>
          <Margin item={item} />
        </span>
      </button>
    </li>
  );
}

export default function QueuePage() {
  const { schedule, orders, settings, now, loading, error, reload, patchOrders, clientById } = useData();
  const { toast } = useFeedback();
  const { openOrder, newOrder, editPrintInfo } = useOrderPanel();
  const changeStatus = useChangeStatus();
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const printing = schedule.items.filter((i) => i.isPrinting);
  const queued = schedule.items.filter((i) => !i.isPrinting);
  const fresh = orders.filter((o) => o.status === 'noua').sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'));
  const capacity = Number(settings.ore_de_printare_pe_zi) || 24;

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = queued.map((i) => i.order.id);
    const next = arrayMove(ids, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id)));
    patchOrders((all) => all.map((o) => (next.includes(o.id) ? { ...o, pozitie_in_coada: next.indexOf(o.id) + 1 } : o)));
    setSaving(true);
    try {
      await api.reorderQueue(next);
    } catch (err) {
      toast(api.friendlyError(err), 'error');
      await reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Coadă"
        sub={
          <span>
            {hours(schedule.queueHours)} · {(schedule.queueHours / capacity).toFixed(1)} zile la {hours(capacity)}/zi · comandă nouă de la{' '}
            <span className="text-fg">{dateTime(schedule.nextStart)}</span>
          </span>
        }
        actions={saving ? <Signal signal="neutral" label="Se salvează…" /> : undefined}
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={reload} />
        </div>
      )}

      {loading ? (
        <Card>
          <SkeletonRows rows={6} cols={5} />
        </Card>
      ) : (
        <div className="stagger flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Timeline"
              sub="non-stop · 24/24"
              right={
                <span className="hidden items-center gap-3 text-xs text-muted sm:flex">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-px bg-critical" />deadline ratat</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-px bg-warning" />deadline strâns</span>
                </span>
              }
            />
            <div className="p-4">
              {schedule.items.length ? (
                <QueueTimeline items={schedule.items} settings={settings} now={now} pxPerHour={12} />
              ) : (
                <p className="py-6 text-center text-sm text-muted">Coada e goală — imprimanta e liberă.</p>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Ordinea de printare" sub="trage de mâner pentru a reordona" right={<span className="num text-xs text-muted">{schedule.items.length}</span>} />
            <div className="label hidden h-8 items-center border-b border-line pl-10 pr-3 md:grid md:grid-cols-[28px_minmax(0,2fr)_70px_150px_150px_120px] md:gap-3">
              <span>Poz</span>
              <span>Comandă</span>
              <span className="text-right">Durată</span>
              <span>Start estimat</span>
              <span>Final estimat</span>
              <span>Față de deadline</span>
            </div>
            {schedule.items.length === 0 ? (
              <EmptyState title="Nimic în coadă" text="Pune în coadă comenzile noi de mai jos sau adaugă o comandă." />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxisModifier]}>
                <ul>
                  {printing.map((i, idx) => (
                    <Row key={i.order.id} item={i} index={idx} draggable={false} />
                  ))}
                  <SortableContext items={queued.map((i) => i.order.id)} strategy={verticalListSortingStrategy}>
                    {queued.map((i, idx) => (
                      <Row key={i.order.id} item={i} index={idx + printing.length} draggable />
                    ))}
                  </SortableContext>
                </ul>
              </DndContext>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Neprogramate"
              sub="comenzi cu status Nouă"
              right={
                <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => newOrder()}>
                  Comandă nouă
                </Button>
              }
            />
            {fresh.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">Nicio comandă nouă în așteptare.</p>
            ) : (
              <ul>
                {fresh.map((o) => {
                  if (needsDesign(o)) {
                    return (
                      <li key={o.id} className="num flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 last:border-b-0">
                        <button onClick={() => openOrder(o.id)} className="min-w-0 flex-1 text-left">
                          <span className="flex items-center gap-2">
                            <span className="text-muted">#{o.id}</span>
                            <span className="truncate">{o.titlu}</span>
                          </span>
                          <span className="block text-xs text-muted">
                            {clientById(o.client_id)?.nume ?? 'Fără client'} · {o.nr_bucati} buc
                            {o.deadline ? ` · deadline ${dateShort(o.deadline)}` : ''}
                          </span>
                        </button>
                        <Signal signal="neutral" label="De proiectat" />
                        <Button size="sm" icon={<PencilRuler className="h-3.5 w-3.5" />} onClick={() => editPrintInfo(o)}>
                          Adaugă datele
                        </Button>
                      </li>
                    );
                  }
                  const end = estimateIfAppended(schedule, Number(o.durata_print_ore), settings);
                  const margin = o.deadline ? (deadlineEnd(o.deadline).getTime() - end.getTime()) / 3_600_000 : null;
                  const sig = margin == null ? 'neutral' : margin < 0 ? 'critical' : margin < 24 ? 'warning' : 'ok';
                  return (
                    <li key={o.id} className="num flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 last:border-b-0">
                      <button onClick={() => openOrder(o.id)} className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-2">
                          <span className="text-muted">#{o.id}</span>
                          <span className="truncate">{o.titlu}</span>
                        </span>
                        <span className="block text-xs text-muted">
                          {clientById(o.client_id)?.nume ?? 'Fără client'} · {hours(Number(o.durata_print_ore))}
                          {o.deadline ? ` · deadline ${dateShort(o.deadline)}` : ''}
                        </span>
                      </button>
                      <span className="flex items-center gap-1.5 text-sm text-muted">
                        <Dot signal={sig} />
                        la final: gata {relativeDateTime(end, now)}
                        {margin != null && <span className={margin < 0 ? 'text-critical' : margin < 24 ? 'text-warning' : ''}>({signedHours(margin)})</span>}
                      </span>
                      <Button size="sm" onClick={() => changeStatus(o, 'in_coada')}>
                        Pune în coadă
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
