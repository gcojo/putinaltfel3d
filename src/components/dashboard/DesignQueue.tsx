import { PencilRuler } from 'lucide-react';
import { useData } from '@/hooks/useData';
import { needsDesign } from '@/lib/design';
import { dateShort, daysBetween, deadlineEnd } from '@/lib/format';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Signal } from '@/components/ui/Status';
import { useOrderPanel } from '@/components/orders/orderPanelContext';

/** Comenzile adăugate fără grame/timp: de proiectat, cele cu deadline apropiat primele. */
export function DesignQueue() {
  const { orders, clientById, now } = useData();
  const { openOrder, editPrintInfo } = useOrderPanel();
  const list = orders
    .filter(needsDesign)
    .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') || (a.prioritate === 'urgenta' ? -1 : 0) - (b.prioritate === 'urgenta' ? -1 : 0) || a.id - b.id);

  if (!list.length) return null;

  return (
    <Card>
      <CardHeader
        title="De proiectat"
        sub="comenzi fără gramele și timpul de print"
        right={<span className="num text-sm">{list.length}</span>}
      />
      <ul>
        {list.map((o) => {
          const days = o.deadline ? daysBetween(now, deadlineEnd(o.deadline)) : null;
          const sig = days == null ? null : days < 1 ? 'critical' : days < 3 ? 'warning' : 'neutral';
          return (
            <li key={o.id} className="num flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-2.5 last:border-b-0">
              <button onClick={() => openOrder(o.id)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2">
                  <span className="text-muted">#{o.id}</span>
                  <span className="truncate">{o.titlu}</span>
                  {o.prioritate === 'urgenta' && <Signal signal="warning" label="Urg" />}
                </span>
                <span className="block truncate text-xs text-muted">
                  {clientById(o.client_id)?.nume ?? 'Fără client'} · {o.nr_bucati} buc · {o.material}
                  {o.culoare ? ` ${o.culoare}` : ''}
                </span>
              </button>
              {o.deadline && sig && (
                <Signal
                  signal={sig}
                  label={`deadline ${dateShort(o.deadline)}${days! < 0 ? ' · depășit' : days! < 1 ? ' · azi' : ` · ${Math.floor(days!)} ${Math.floor(days!) === 1 ? 'zi' : 'zile'}`}`}
                />
              )}
              <Button size="sm" icon={<PencilRuler className="h-3.5 w-3.5" />} onClick={() => editPrintInfo(o)}>
                Adaugă datele
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
