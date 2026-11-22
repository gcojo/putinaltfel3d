import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { useData } from '@/hooks/useData';
import { date, dateTime, hours, lei, pct, relativeDateTime, signedHours } from '@/lib/format';
import { efficiency, kpis, monthlySeries } from '@/lib/stats';
import { PageHeader } from '@/components/layout/AppLayout';
import { Card, CardHeader, Kpi } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { Dot, Signal } from '@/components/ui/Status';
import { ErrorBanner, Skeleton, SkeletonCard } from '@/components/ui/Feedback';
import { PrinterBoard } from '@/components/dashboard/PrinterBoard';
import { WarningCard } from '@/components/dashboard/WarningCard';
import { MonthlyBarChart } from '@/components/dashboard/MonthlyBarChart';
import { DesignQueue } from '@/components/dashboard/DesignQueue';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="card flex flex-col gap-5 p-5 lg:col-span-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-14 w-40" />
        <Skeleton className="h-1 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <SkeletonCard />
      <div className="grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { loading, error, reload, orders, payments, settings, schedule, warnings, now } = useData();
  const { newOrder } = useOrderPanel();

  const k = kpis(orders, payments, settings, now);
  const months = monthlySeries(orders, payments, settings, now, 12);
  const eff = efficiency(orders, settings, now, 30);
  const queued = schedule.items.filter((i) => !i.isPrinting);
  const capacity = Number(settings.ore_de_printare_pe_zi) || 24;
  const late = schedule.items.filter((i) => i.risk === 'late').length;
  const tight = schedule.items.filter((i) => i.risk === 'tight').length;
  const monthDelta = k.incasatLunaTrecuta > 0 ? ((k.incasatLuna - k.incasatLunaTrecuta) / k.incasatLunaTrecuta) * 100 : null;

  return (
    <>
      <PageHeader
        title="Dashboard"
        sub={
          <span>
            {date(now)} · Coadă: {hours(schedule.queueHours)} · Eficiență imprimantă: {pct(eff.pct)}
          </span>
        }
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => newOrder()} className="hidden md:inline-flex">
            Comandă nouă
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onRetry={reload} />
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="stagger flex flex-col gap-4">
          {/* Rândul 1: printer board + coadă (pe mobil: pods stivuite) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PrinterBoard />
            </div>

            {/* Pod: Coadă */}
            <Card className="flex flex-col">
              <CardHeader
                title="Coadă"
                right={
                  late ? <Signal signal="critical" label={`${late} întârzie`} /> : tight ? <Signal signal="warning" label={`${tight} strâns`} /> : <Signal signal="ok" label="În termen" />
                }
              />
              <div className="flex flex-1 flex-col gap-5 p-4 md:p-5">
                <div>
                  <div className="label">Următoarea comandă nouă poate începe</div>
                  <div className="num mt-2 text-kpi font-light">{relativeDateTime(schedule.nextStart, now).replace(',', '')}</div>
                  <div className="num mt-1 text-xs text-muted">{dateTime(schedule.nextStart)}</div>
                </div>
                <div className="num grid grid-cols-3 gap-3 border-t border-line pt-4">
                  <div>
                    <div className="label">Ore</div>
                    <div className="mt-1 text-xl font-light">{hours(schedule.queueHours)}</div>
                  </div>
                  <div>
                    <div className="label">Zile</div>
                    <div className="mt-1 text-xl font-light">{(schedule.queueHours / capacity).toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="label">Comenzi</div>
                    <div className="mt-1 text-xl font-light">{queued.length}</div>
                  </div>
                </div>
                <div className="mt-auto flex flex-col">
                  {schedule.items
                    .filter((i) => i.marginHours != null)
                    .sort((a, b) => (a.marginHours ?? 0) - (b.marginHours ?? 0))
                    .slice(0, 3)
                    .map((i) => (
                      <div key={i.order.id} className="num flex h-8 items-center gap-2.5 border-t border-line text-sm">
                        <Dot signal={i.risk === 'late' ? 'critical' : i.risk === 'tight' ? 'warning' : 'ok'} />
                        <span className="w-8 text-muted">#{i.order.id}</span>
                        <span className="flex-1 truncate">{i.order.titlu}</span>
                        <span className={i.risk === 'late' ? 'text-critical' : i.risk === 'tight' ? 'text-warning' : 'text-muted'}>{signedHours(i.marginHours!)}</span>
                      </div>
                    ))}
                  <Link to="/coada" className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
                    Deschide coada <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </Card>
          </div>

          <DesignQueue />

          {/* Pod: Încasări (KPI-uri) */}
          <Card>
            <CardHeader title="Încasări" sub={settings.adaos_procent ? `adaos implicit ${settings.adaos_procent}%` : undefined} />
            <div className="stagger grid grid-cols-2 gap-3 p-3 lg:grid-cols-4">
              <div className="tile p-4 md:p-5">
                <Kpi
                  label="Încasat luna asta"
                  value={<Money value={k.incasatLuna} />}
                  sub={monthDelta == null ? 'luna trecută: 0 lei' : `${monthDelta >= 0 ? '+' : '−'}${Math.abs(Math.round(monthDelta))}% față de luna trecută`}
                />
              </div>
              <div className="tile p-4 md:p-5">
                <Kpi label="Total încasat" value={<Money value={k.totalIncasat} />} sub={`${payments.length} încasări`} />
              </div>
              <div className="tile p-4 md:p-5">
                <Kpi
                  label="De încasat"
                  value={<Money value={k.deIncasat} />}
                  signal={k.deIncasat > 0 ? 'warning' : undefined}
                  sub={`${k.comenziDeIncasat} comenzi cu rest de plată`}
                />
              </div>
              <div className="tile p-4 md:p-5">
                <Kpi label="Profit estimat" value={<Money value={k.profitEstimat} />} sub={`luna asta: ${lei(k.profitLuna)} · preț − material − curent`} />
              </div>
            </div>
          </Card>

          {/* Pod: Atenționări */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="eyebrow">Atenționări</h2>
              <span className="num text-xs text-muted">{warnings.length}</span>
            </div>
            {warnings.length === 0 ? (
              <Card className="flex items-center gap-3 px-4 py-4">
                <Dot signal="ok" />
                <span className="text-sm">Totul e în termen. Nicio comandă nu riscă deadline-ul și nu există neplăți.</span>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {warnings.map((w) => (
                  <WarningCard key={w.id} w={w} />
                ))}
              </div>
            )}
          </section>

          {/* Grafice */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Venituri pe luni" sub="încasări, ultimele 12 luni" right={<span className="num text-sm">{lei(months.reduce((a, m) => a + m.venit, 0))}</span>} />
              <div className="p-4">
                <MonthlyBarChart data={months} dataKey="venit" format={(v) => lei(v)} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Comenzi pe luni" sub="după data comenzii" right={<span className="num text-sm">{months.reduce((a, m) => a + m.comenzi, 0)}</span>} />
              <div className="p-4">
                <MonthlyBarChart data={months} dataKey="comenzi" format={(v) => `${v} ${v === 1 ? 'comandă' : 'comenzi'}`} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
