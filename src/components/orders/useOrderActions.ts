import { useCallback } from 'react';
import type { Order, OrderStatus } from '@/types/db';
import * as api from '@/lib/api';
import { STATUS_MAP } from '@/lib/constants';
import { useData } from '@/hooks/useData';
import { useFeedback } from '@/components/ui/Toast';
import { missingPrintInfo } from '@/lib/design';
import { useOrderPanelOptional } from './orderPanelContext';

/** Schimbare de status cu actualizare optimistă + confirmări unde e cazul. */
export function useChangeStatus() {
  const { patchOrders, reload, orders } = useData();
  const { toast, confirm } = useFeedback();
  const panel = useOrderPanelOptional();

  return useCallback(
    async (order: Order, status: OrderStatus) => {
      // fără grame/timp comanda nu poate fi programată: întâi datele de print (după proiectare)
      if ((status === 'in_coada' || status === 'se_printeaza') && missingPrintInfo(order) && panel) {
        panel.editPrintInfo(order, status);
        return;
      }
      if (status === 'anulata') {
        const ok = await confirm({ title: `Anulezi comanda #${order.id}?`, text: 'Comanda iese din coadă. O poți reactiva oricând.', confirmLabel: 'Anulează comanda', danger: true });
        if (!ok) return;
      }
      // „Anulează” e sigur doar dacă nu repornim un print (ora de start s-ar reseta)
      // și nu am finalizat automat altă comandă.
      let undoable = order.status !== 'se_printeaza';
      if (status === 'se_printeaza') {
        const other = orders.find((o) => o.status === 'se_printeaza' && o.id !== order.id);
        if (other) {
          undoable = false;
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
        const prev = { status: order.status, pozitie: order.pozitie_in_coada };
        toast(
          `#${order.id} → ${STATUS_MAP[status].label}`,
          'ok',
          undoable
            ? {
                label: 'Anulează',
                onClick: async () => {
                  patchOrders((all) => all.map((o) => (o.id === order.id ? { ...o, status: prev.status, pozitie_in_coada: prev.pozitie } : o)));
                  try {
                    await api.restoreStatus(order.id, prev.status, prev.pozitie);
                    toast(`#${order.id} înapoi la ${STATUS_MAP[prev.status].label}`, 'info');
                  } catch (e) {
                    toast(api.friendlyError(e), 'error');
                  } finally {
                    await reload();
                  }
                },
              }
            : undefined,
        );
      } catch (e) {
        toast(api.friendlyError(e), 'error');
      } finally {
        await reload();
      }
    },
    [patchOrders, reload, orders, toast, confirm, panel],
  );
}
