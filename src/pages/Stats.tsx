import { useMemo } from 'react';
import { useData } from '@/hooks/useData';
import { efficiency, generalStats, monthlySeries } from '@/lib/stats';
import { electricityCost } from '@/lib/calc';
import { hours, lei, num, pct, smart } from '@/lib/format';
import { PageHeader } from '@/components/layout/AppLayout';
import { Card, CardHeader, Kpi } from '@/components/ui/Card';
import { EmptyState, SkeletonCard } from '@/components/ui/Feedback';
import { MonthlyBarChart } from '@/components/dashboard/MonthlyBarChart';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';

export default function StatsPage() {
  const { orders, payments, settings, now, loading, clientById } = useData();
  const { openOrder } = useOrderPanel();

  const g = useMemo(() => generalStats(orders, settings), [orders, settings]);
  const months = useMemo(() => monthlySeries(orders, payments, settings, now, 12), [orders, payments, settings, now]);
  const eff30 = efficiency(orders, settings, now, 30);
  const eff90 = efficiency(orders, settings, now, 90);
  const maxKg = Math.max(0.001, ...g.byMaterial.map((m) => m.kg));

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Statistici" sub={`${orders.length} comenzi analizate · ${g.cancelled} anulate`} />
      {orders.length === 0 ? (
        <Card>
          <EmptyState title="Încă nu există date" text="Statisticile apar după primele comenzi." />
        </Card>
      ) : (
        <div className="stagger flex flex-col gap-4">
          <Card>
            <div className="stagger grid grid-cols-2 gap-3 p-3 lg:grid-cols-4">
              <div className="tile p-4 md:p-5">
                <Kpi label="Durată medie / comandă" value={hours(g.avgHours)} sub={`preț mediu ${lei(g.avgPrice)}`} />
              </div>
              <div className="tile p-4 md:p-5">
                <Kpi label="Ore totale de printare" value={hours(g.totalHours)} sub={`curent ≈ ${lei(electricityCost(settings, g.totalHours))}`} />
              </div>
              <div className="tile p-4 md:p-5">
                <Kpi label="Material consumat" value={`${smart(g.totalKg, 2)} kg`} sub="comenzi finalizate + livrate" />
              </div>
              <div className="tile p-4 md:p-5">
                <Kpi
                  label="Eficiență imprimantă · 30 zile"
                  value={pct(eff30.pct)}
                  sub={`${hours(eff30.busy)} ocupate din ${hours(eff30.available)} · 90 zile: ${pct(eff90.pct)}`}
                />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Material pe lună" sub="kg, comenzi finalizate" />
              <div className="p-4">
                <MonthlyBarChart data={months} dataKey="kg" format={(v) => `${smart(v, 2)} kg`} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Ore printate pe lună" sub="comenzi finalizate" />
              <div className="p-4">
                <MonthlyBarChart data={months} dataKey="ore" format={(v) => hours(v)} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Profit estimat pe lună" sub="după data comenzii" />
              <div className="p-4">
                <MonthlyBarChart data={months} dataKey="profit" format={(v) => lei(v)} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Material după tip" sub="kg consumate" />
              {g.byMaterial.length === 0 ? (
                <p className="px-4 py-5 text-sm text-muted">Nicio comandă finalizată încă.</p>
              ) : (
                <ul className="flex flex-col gap-3 p-4">
                  {g.byMaterial.map((m, i) => (
                    <li key={m.material} className="num">
                      <div className="flex justify-between text-sm">
                        <span>{m.material}</span>
                        <span>{smart(m.kg, 2)} kg</span>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-white/[0.07]">
                        <div className={`h-full rounded-full ${i === 0 ? 'bg-gradient-to-r from-accent to-accent-2' : 'bg-accent/30'}`} style={{ width: `${(m.kg / maxKg) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader title="Cele mai profitabile comenzi" sub="profit = preț − material − curent" />
            <div className="overflow-x-auto">
              <table className="table-dense num w-full">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Comandă</th>
                    <th>Client</th>
                    <th className="text-right">Preț</th>
                    <th className="text-right">Cost</th>
                    <th className="text-right">Profit</th>
                    <th className="text-right">Profit / oră</th>
                    <th className="text-right">Marjă</th>
                  </tr>
                </thead>
                <tbody>
                  {g.profitable.slice(0, 10).map((p) => (
                    <tr key={p.order.id} className="cursor-pointer" onClick={() => openOrder(p.order.id)}>
                      <td className="text-muted">{p.order.id}</td>
                      <td className="max-w-[240px] truncate">{p.order.titlu}</td>
                      <td className="max-w-[160px] truncate text-muted">{clientById(p.order.client_id)?.nume ?? '—'}</td>
                      <td className="text-right">{lei(Number(p.order.pret_vanzare))}</td>
                      <td className="text-right text-muted">{lei(Number(p.order.pret_vanzare) - p.profit, { decimals: true })}</td>
                      <td className={`text-right ${p.profit < 0 ? 'text-critical' : ''}`}>{lei(p.profit)}</td>
                      <td className="text-right">{lei(p.perHour)}/h</td>
                      <td className="text-right">{num(p.margin)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
