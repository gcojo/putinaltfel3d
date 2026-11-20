import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import * as api from '@/lib/api';
import type { Warning } from '@/lib/warnings';
import { useData } from '@/hooks/useData';
import { Button } from '@/components/ui/Button';
import { Dot } from '@/components/ui/Status';
import { useFeedback } from '@/components/ui/Toast';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';
import { useChangeStatus } from '@/components/orders/useOrderActions';

/** Card de avertizare: problema, comenzile afectate, acțiunea recomandată. */
export function WarningCard({ w, compact = false }: { w: Warning; compact?: boolean }) {
  const { reload, patchOrders, orders } = useData();
  const { openOrder } = useOrderPanel();
  const { toast } = useFeedback();
  const changeStatus = useChangeStatus();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const critical = w.level === 'critical';

  const run = async () => {
    const a = w.action;
    if (!a) return;
    if (a.kind === 'open') return openOrder(a.orderId);
    if (a.kind === 'link') return navigate(a.to);
    if (a.kind === 'status') {
      const o = orders.find((x) => x.id === a.orderId);
      if (o) await changeStatus(o, a.status);
      return;
    }
    setBusy(true);
    patchOrders((all) => all.map((o) => (a.queue.includes(o.id) ? { ...o, pozitie_in_coada: a.queue.indexOf(o.id) + 1 } : o)));
    try {
      await api.reorderQueue(a.queue);
      toast('Coada a fost reordonată.');
    } catch (e) {
      toast(api.friendlyError(e), 'error');
    } finally {
      await reload();
      setBusy(false);
    }
  };

  return (
    <article className={`card flex flex-col animate-fade-in ${critical ? 'border-critical/40' : 'border-warning/30'}`}>
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <span className="flex items-center gap-2">
          <Dot signal={critical ? 'critical' : 'warning'} />
          <span className={`text-micro font-medium uppercase ${critical ? 'text-critical' : 'text-warning'}`}>{critical ? 'Critic' : 'Atenție'}</span>
        </span>
        <span className={`num text-lg font-light ${critical ? 'text-critical' : 'text-warning'}`}>{w.metric}</span>
      </div>
      <div className="px-4 pb-3 pt-1.5">
        <h3 className="text-md">{w.title}</h3>
        {!compact && <p className="num mt-1 text-sm leading-[18px] text-muted">{w.detail}</p>}
      </div>
      {w.orders.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {w.orders.slice(0, 6).map((o, i) => (
            <button
              key={o.id}
              onClick={() => openOrder(o.id)}
              className="num flex h-6 items-center gap-1.5 rounded border border-line px-2 text-xs text-muted transition-colors duration-150 hover:border-line-strong hover:text-fg"
              title={o.titlu}
            >
              {i === 0 && <Dot signal={critical ? 'critical' : 'warning'} />}#{o.id}
              <span className="max-w-[120px] truncate">{o.titlu}</span>
            </button>
          ))}
          {w.orders.length > 6 && <span className="text-xs text-muted">+{w.orders.length - 6}</span>}
        </div>
      )}
      {(w.recommendation || w.action) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
          {w.recommendation && (
            <p className="flex min-w-0 flex-1 items-start gap-2 text-sm">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
              <span>{w.recommendation}</span>
            </p>
          )}
          {w.action && (
            <Button size="sm" variant={w.action.kind === 'reorder' ? 'primary' : 'secondary'} onClick={run} loading={busy}>
              {w.action.label}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
