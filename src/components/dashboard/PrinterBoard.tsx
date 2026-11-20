import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PRINTER_NAME } from '@/lib/constants';
import { dateShort, hours, pct, relativeDateTime, signedHours, time } from '@/lib/format';
import { dailyUsage, efficiency } from '@/lib/stats';
import { useData } from '@/hooks/useData';
import { Card, CardHeader, ProgressBar } from '@/components/ui/Card';
import { Dot, Signal, riskSignal } from '@/components/ui/Status';
import { Button } from '@/components/ui/Button';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';
import { useChangeStatus } from '@/components/orders/useOrderActions';
import { QueueTimeline } from '@/components/queue/QueueTimeline';

/** Echivalentul „hărții live”: imprimanta, comanda curentă, progres, utilizare. */
export function PrinterBoard() {
  const { schedule, orders, settings, now, clientById } = useData();
  const { openOrder } = useOrderPanel();
  const changeStatus = useChangeStatus();
  const current = schedule.items.find((i) => i.isPrinting);
  const upcoming = schedule.items.filter((i) => !i.isPrinting);
  const usage = dailyUsage(orders, settings, now, 7);
  const eff = efficiency(orders, settings, now, 7);
  const client = current ? clientById(current.order.client_id) : undefined;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Printer board"
        sub={PRINTER_NAME}
        right={current ? <Signal signal={current.overdue ? 'warning' : 'ok'} label={current.overdue ? 'Verifică' : 'Printează'} pulse={!current.overdue} /> : <Signal signal="neutral" label="Liber" />}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        {/* Comanda curentă */}
        <div className="relative border-b border-line p-4 lg:border-b-0 lg:border-r md:p-5">
          {current ? (
            <>
              <button onClick={() => openOrder(current.order.id)} className="group block w-full text-left">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span className="num">#{current.order.id}</span>
                  {client && <span>· {client.nume}</span>}
                </div>
                <div className="mt-1 truncate text-lg group-hover:underline">{current.order.titlu}</div>
              </button>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <div className="num text-hero font-light">{Math.round(current.progress * 100)}%</div>
                </div>
                <div className="num grid grid-cols-2 gap-x-6 gap-y-2 text-right">
                  <div>
                    <div className="label">Final estimat</div>
                    <div className="mt-1 text-md">{relativeDateTime(current.end, now)}</div>
                  </div>
                  <div>
                    <div className="label">Rămas</div>
                    <div className="mt-1 text-md">{hours(current.remainingHours)}</div>
                  </div>
                  <div>
                    <div className="label">Început</div>
                    <div className="mt-1 text-md text-muted">{time(current.start)}</div>
                  </div>
                  <div>
                    <div className="label">Deadline</div>
                    <div className={`mt-1 text-md ${current.risk === 'late' ? 'text-critical' : current.risk === 'tight' ? 'text-warning' : ''}`}>
                      {current.marginHours == null ? '—' : signedHours(current.marginHours)}
                    </div>
                  </div>
                </div>
              </div>
              <ProgressBar value={current.progress} signal={current.overdue ? 'warning' : 'ok'} className="mt-4" />
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
                <span className="num">
                  {current.order.material} · {current.order.culoare ?? '—'} · {current.order.nr_bucati} buc
                </span>
                <Button size="sm" variant={current.overdue ? 'primary' : 'ghost'} onClick={() => changeStatus(current.order, 'finalizata')}>
                  Marchează finalizată
                </Button>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[180px] flex-col justify-between">
              <div>
                <div className="num text-hero font-light text-muted-2">0%</div>
                <p className="mt-2 text-sm text-muted">Imprimanta e liberă.</p>
              </div>
              {upcoming[0] ? (
                <Button variant="primary" className="self-start" onClick={() => changeStatus(upcoming[0].order, 'se_printeaza')}>
                  Pornește #{upcoming[0].order.id} · {upcoming[0].order.titlu}
                </Button>
              ) : (
                <p className="text-sm text-muted">Coada e goală.</p>
              )}
            </div>
          )}
        </div>

        {/* Utilizare + următoarele */}
        <div className="flex flex-col">
          <div className="border-b border-line p-4 md:p-5">
            <div className="flex items-baseline justify-between">
              <span className="label">Utilizare · 7 zile</span>
              <span className="num text-xl font-light">{pct(eff.pct)}</span>
            </div>
            <div className="mt-3 flex h-16 items-end gap-1.5" role="img" aria-label="Utilizare zilnică ultimele 7 zile">
              {usage.map((d, i) => (
                <div key={d.key} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div className="relative w-full flex-1 overflow-hidden rounded-[3px] bg-line/60">
                    <div className={`absolute inset-x-0 bottom-0 rounded-t-[3px] ${i === usage.length - 1 ? 'bg-gradient-to-t from-accent to-accent-2' : 'bg-accent/25'}`} style={{ height: `${d.pct}%` }} />
                  </div>
                  <span className="text-[10px] leading-none text-muted">{d.label}</span>
                  <span className="num pointer-events-none absolute -top-6 z-10 whitespace-nowrap rounded glass-panel px-1.5 py-0.5 text-[10px] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    {hours(d.hours)} · {pct(d.pct)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 p-4 md:p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="label">Urmează</span>
              <span className="num text-xs text-muted">Coadă: {hours(schedule.queueHours)}</span>
            </div>
            {upcoming.length === 0 ? (
              <p className="py-2 text-sm text-muted">Nicio comandă în coadă.</p>
            ) : (
              <ul className="flex flex-col">
                {upcoming.slice(0, 3).map((i) => (
                  <li key={i.order.id}>
                    <button onClick={() => openOrder(i.order.id)} className="num flex h-8 w-full items-center gap-2.5 text-left text-sm transition-colors duration-150 hover:text-fg">
                      <Dot signal={riskSignal(i.risk)} />
                      <span className="w-8 text-muted">#{i.order.id}</span>
                      <span className="flex-1 truncate">{i.order.titlu}</span>
                      <span className="text-muted">{dateShort(i.start)} {time(i.start)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {upcoming.length > 3 && (
              <Link to="/coada" className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
                +{upcoming.length - 3} în coadă <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
      {schedule.items.length > 0 && (
        <div className="border-t border-line px-4 py-3 md:px-5">
          <QueueTimeline items={schedule.items} settings={settings} now={now} pxPerHour={7} compact />
        </div>
      )}
    </Card>
  );
}
