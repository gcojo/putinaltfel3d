import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { Order, OrderStatus } from '@/types/db';
import { OrderDetailPanel } from './OrderDetail';
import { OrderFormPanel } from './OrderForm';
import { PrintInfoPanel } from './PrintInfoPanel';
import { OrderPanelContext } from './orderPanelContext';

export { useOrderPanel } from './orderPanelContext';

/** Panourile de comandă sunt globale: pot fi deschise din orice pagină fără a o părăsi. */
export function OrderPanelProvider({ children }: { children: ReactNode }) {
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState<{ open: boolean; order?: Order; prefill?: Partial<Order>; productId?: number }>({ open: false });
  const [print, setPrint] = useState<{ order: Order; thenStatus?: OrderStatus } | null>(null);

  const openOrder = useCallback((id: number) => setDetailId(id), []);
  const newOrder = useCallback((prefill?: Partial<Order>, productId?: number) => setForm({ open: true, prefill, productId }), []);
  const editOrder = useCallback((order: Order) => setForm({ open: true, order }), []);
  const editPrintInfo = useCallback((order: Order, thenStatus?: OrderStatus) => setPrint({ order, thenStatus }), []);
  const value = useMemo(() => ({ openOrder, newOrder, editOrder, editPrintInfo }), [openOrder, newOrder, editOrder, editPrintInfo]);

  return (
    <OrderPanelContext.Provider value={value}>
      {children}
      {!form.open && !print && <OrderDetailPanel orderId={detailId} onClose={() => setDetailId(null)} onEdit={editOrder} onDuplicate={(p) => newOrder(p)} />}
      <OrderFormPanel
        open={form.open}
        order={form.order}
        prefill={form.prefill}
        productId={form.productId}
        onClose={() => setForm({ open: false })}
        onSaved={(o) => {
          setForm({ open: false });
          setDetailId(o.id);
        }}
      />
      <PrintInfoPanel
        open={!!print}
        order={print?.order}
        thenStatus={print?.thenStatus}
        onClose={() => setPrint(null)}
      />
    </OrderPanelContext.Provider>
  );
}
