import { createContext, useContext } from 'react';
import type { Order, OrderStatus } from '@/types/db';

export interface OrderPanelCtx {
  /** deschide panoul lateral de detaliu */
  openOrder: (id: number) => void;
  /** formular comandă nouă (opțional precompletat) */
  newOrder: (prefill?: Partial<Order>) => void;
  editOrder: (order: Order) => void;
  /**
   * după proiectare: gramele, timpul și prețul.
   * `thenStatus` = statusul cerut înainte (ex. „Pune în coadă”), aplicat după salvare.
   */
  editPrintInfo: (order: Order, thenStatus?: OrderStatus) => void;
}

export const OrderPanelContext = createContext<OrderPanelCtx | null>(null);

export function useOrderPanel() {
  const ctx = useContext(OrderPanelContext);
  if (!ctx) throw new Error('useOrderPanel în afara OrderPanelProvider');
  return ctx;
}

/** La fel, dar fără eroare în afara providerului (ex. hook-uri folosite și în teste izolate). */
export function useOrderPanelOptional() {
  return useContext(OrderPanelContext);
}
