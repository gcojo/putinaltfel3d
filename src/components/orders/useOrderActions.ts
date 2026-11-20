import { useCallback } from 'react';
import type { Order, OrderStatus } from '@/types/db';
import * as api from '@/lib/api';
import { STATUS_MAP } from '@/lib/constants';
import { useData } from '@/hooks/useData';
import { useFeedback } from '@/components/ui/Toast';

/** Schimbare de status cu actualizare optimistă + confirmări unde e cazul. */
export function useChangeStatus() {
  const { patchOrders, reload, orders } = useData();
  const { toast, confirm } = useFeedback();

  return useCallback(
    async (order: Order, status: OrderStatus) => {
      if (status === 'anulata') {
        const ok = await confirm({ title: `Anulezi comanda #${order.id}?`, text: 'Comanda iese din coadă. O poți reactiva oricând.', confirmLabel: 'Anulează comanda', danger: true });
        if (!ok) return;
      }
      if (status === 'se_printeaza') {
        const other = orders.find((o) => o.status === 'se_printeaza' && o.id !== order.id);
        if (other) {
          const ok = await confirm({
            title: 'Imprimanta e deja ocupată',
            text: `Comanda #${other.id} „${other.titlu}” se printează acum. O marchez ca finalizată și pornesc #${order.id}?`,
            confirmLabel: 'Da, finalizează și pornește',
          });
          if (!ok) return;
          await api.setOrderStatus(other.id, 'finalizata').catch(() => undefined);
        }
      }
      patchOrders((all) => all.map((o) => (o.id === order.id ? { ...o, status } : o)));
      try {
        await api.setOrderStatus(order.id, status);
        toast(`#${order.id} → ${STATUS_MAP[status].label}`);
      } catch (e) {
        toast(api.friendlyError(e), 'error');
      } finally {
        await reload();
      }
    },
    [patchOrders, reload, orders, toast, confirm],
  );
}
