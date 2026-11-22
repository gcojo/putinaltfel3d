// Previzualizare locală cu date de test (fără Supabase): npm run dev -> http://localhost:5173/preview.html#/
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@fontsource/plus-jakarta-sans/300.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/500.css';
import '@fontsource/playfair-display/400-italic.css';
import '@/index.css';
import { AuthProvider } from '@/hooks/useAuth';
import { DataProvider } from '@/hooks/useData';
import { FeedbackProvider } from '@/components/ui/Toast';
import { OrderPanelProvider, useOrderPanel } from '@/components/orders/OrderPanelProvider';
import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import DashboardPage from '@/pages/Dashboard';
import OrdersPage from '@/pages/Orders';
import QueuePage from '@/pages/Queue';
import ClientsPage from '@/pages/Clients';
import ClientDetailPage from '@/pages/ClientDetail';
import StatsPage from '@/pages/Stats';
import SettingsPage from '@/pages/Settings';
import LoginPage from '@/pages/Login';
import { NOW, clients, order, payments, seedLike, settings } from './fixtures';
import { toYmd } from '@/lib/format';

const titles: Record<number, string> = {
  1: 'Suport căști birou', 6: 'Organizator birou modular', 8: 'Suport telefon birou', 9: 'Panouri decorative hexagon',
  10: 'Prototip carcasă senzor', 11: 'Lampă lithophane', 12: 'Nume 3D cadou aniversare', 13: 'Clipsuri cablu x50', 14: 'Mânere sertar x8',
};
const d = (days: number) => toYmd(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + days));
const orders = [
  ...seedLike().map((o) => ({ ...o, titlu: titles[o.id] ?? o.titlu, pret_vanzare: o.id * 17 + 40, cost_material: o.id * 2 + 8 })),
  ...[2, 3, 4, 5].map((id) =>
    order({ id, titlu: ['Brelocuri logo', 'Carcasă Raspberry Pi', 'Vază spirală', 'Piese dronă'][id - 2], status: 'livrata', data_comanda: d(-id * 28), data_finalizare: new Date(NOW.getTime() - id * 27 * 864e5).toISOString(), data_start: new Date(NOW.getTime() - id * 27 * 864e5 - 5 * 36e5).toISOString(), pret_vanzare: 60 + id * 20, suma_incasata: 60 + id * 20, platit: 'da', client_id: (id % 3) + 1, durata_print_ore: 3 + id }),
  ),
];
const pays = [...payments, ...[2, 3, 4, 5].map((id) => ({ ...payments[0], id: 10 + id, order_id: id, suma: 60 + id * 20, data: d(-id * 27) }))];

const [path, query] = (location.hash.slice(1) || '/').split('?');
const q = new URLSearchParams(query);

/** #/comenzi?open=12 deschide panoul; ?new=1 deschide formularul */
function AutoOpen() {
  const { openOrder, newOrder } = useOrderPanel();
  useEffect(() => {
    if (q.get('open')) openOrder(Number(q.get('open')));
    if (q.get('new')) newOrder();
  }, [openOrder, newOrder]);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <MemoryRouter initialEntries={[path]}>
      <DataProvider initial={{ clients, orders, payments: pays, settings }} fixedNow={NOW}>
        <FeedbackProvider>
          <OrderPanelProvider>
            <AutoOpen />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="comenzi" element={<OrdersPage />} />
                <Route path="coada" element={<QueuePage />} />
                <Route path="clienti" element={<ClientsPage />} />
                <Route path="clienti/:id" element={<ClientDetailPage />} />
                <Route path="statistici" element={<StatsPage />} />
                <Route path="setari" element={<SettingsPage />} />
              </Route>
            </Routes>
          </OrderPanelProvider>
        </FeedbackProvider>
      </DataProvider>
    </MemoryRouter>
  </AuthProvider>,
);
