import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Client, Order, Payment, Settings } from '@/types/db';
import * as api from '@/lib/api';
import { buildSchedule, type Schedule } from '@/lib/schedule';
import { buildWarnings, type Warning } from '@/lib/warnings';
import { useNow } from './useNow';

export interface DataState {
  clients: Client[];
  orders: Order[];
  payments: Payment[];
  settings: Settings;
  loading: boolean;
  error: string | null;
  now: Date;
  schedule: Schedule;
  warnings: Warning[];
  clientById: (id: number | null | undefined) => Client | undefined;
  reload: () => Promise<void>;
  /** actualizare locală imediată (optimistă) */
  patchOrders: (fn: (orders: Order[]) => Order[]) => void;
}

const DataContext = createContext<DataState | null>(null);

export const DEFAULT_SETTINGS: Settings = {
  user_id: '',
  pret_filament_lei_kg: { PLA: 100, PETG: 110, TPU: 170, ABS: 110, ASA: 140, 'PLA-CF': 190, Altul: 120 },
  cost_curent_lei_kwh: 1.3,
  consum_imprimanta_w: 100,
  ore_de_printare_pe_zi: 16,
  ora_inceput_zi: 8,
  zile_libere: [],
  date_libere: [],
  adaos_procent: 100,
  updated_at: '',
};

export interface RawData {
  clients: Client[];
  orders: Order[];
  payments: Payment[];
  settings: Settings;
}

/** `initial` permite injectarea datelor (teste); `fixedNow` fixează ora. */
export function DataProvider({ children, initial, fixedNow }: { children: ReactNode; initial?: RawData; fixedNow?: Date }) {
  const [raw, setRaw] = useState<RawData>(initial ?? { clients: [], orders: [], payments: [], settings: DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const tick = useNow(30_000);
  const now = fixedNow ?? tick;

  const reload = useCallback(async () => {
    if (initial) return;
    try {
      const data = await api.fetchAll();
      const settings = data.settings ?? (await api.ensureSettings());
      setRaw({ ...data, settings });
      setError(null);
    } catch (e) {
      setError(api.friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [initial]);

  useEffect(() => {
    reload();
    // reîncarcă la revenirea în aplicație (ex. pe telefon)
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const schedule = useMemo(() => buildSchedule(raw.orders, raw.settings, now), [raw.orders, raw.settings, now]);
  const warnings = useMemo(
    () => buildWarnings(raw.orders, raw.clients, schedule, raw.settings, now),
    [raw.orders, raw.clients, schedule, raw.settings, now],
  );
  const clientMap = useMemo(() => new Map(raw.clients.map((c) => [c.id, c])), [raw.clients]);

  const value: DataState = {
    ...raw,
    loading,
    error,
    now,
    schedule,
    warnings,
    clientById: (id) => (id == null ? undefined : clientMap.get(id)),
    reload,
    patchOrders: (fn) => setRaw((r) => ({ ...r, orders: fn(r.orders) })),
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData în afara DataProvider');
  return ctx;
}
