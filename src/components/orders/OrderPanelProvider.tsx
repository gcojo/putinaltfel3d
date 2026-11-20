import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Order } from '@/types/db';
import { OrderDetailPanel } from './OrderDetail';
import { OrderFormPanel } from './OrderForm';

interface Ctx {
  /** deschide panoul lateral de detaliu */
  openOrder: (id: number) => void;
  /** formular comandă nouă (opțional precompletat) */
  newOrder: (prefill?: Partial<Order>) => void;
  editOrder: (order: Order) => void;
}

const OrderPanelContext = createContext<Ctx | null>(null);

/** Panourile de comandă sunt globale: pot fi deschise din orice pagină fără a o părăsi. */
export function OrderPanelProvider({ children }: { children: ReactNode }) {
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState<{ open: boolean; order?: Order; prefill?: Partial<Order> }>({ open: false });

  const openOrder = useCallback((id: number) => setDetailId(id), []);
  const newOrder = useCallback((prefill?: Partial<Order>) => setForm({ open: true, prefill }), []);
  const editOrder = useCallback((order: Order) => setForm({ open: true, order }), []);
  const value = useMemo(() => ({ openOrder, newOrder, editOrder }), [openOrder, newOrder, editOrder]);

  return (
    <OrderPanelContext.Provider value={value}>
      {children}
      {!form.open && <OrderDetailPanel orderId={detailId} onClose={() => setDetailId(null)} onEdit={editOrder} />}
      <OrderFormPanel
        open={form.open}
        order={form.order}
        prefill={form.prefill}
        onClose={() => setForm({ open: false })}
        onSaved={(o) => {
          setForm({ open: false });
          setDetailId(o.id);
        }}
      />
    </OrderPanelContext.Provider>
  );
}

export function useOrderPanel() {
  const ctx = useContext(OrderPanelContext);
  if (!ctx) throw new Error('useOrderPanel în afara OrderPanelProvider');
  return ctx;
}
