import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { DataProvider } from '@/hooks/useData';
import { FeedbackProvider } from '@/components/ui/Toast';
import { OrderPanelProvider } from '@/components/orders/OrderPanelProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import DashboardPage from '@/pages/Dashboard';
import OrdersPage from '@/pages/Orders';
import QueuePage from '@/pages/Queue';
import ClientsPage from '@/pages/Clients';
import ClientDetailPage from '@/pages/ClientDetail';
import StatsPage from '@/pages/Stats';
import SettingsPage from '@/pages/Settings';
import LoginPage from '@/pages/Login';
import { NOW, clients, payments, seedLike, settings } from './fixtures';

function renderAt(path: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <DataProvider initial={{ clients, orders: seedLike(), payments, settings }} fixedNow={NOW}>
          <FeedbackProvider>
            <OrderPanelProvider>
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
}

describe('pagini', () => {
  it('Dashboard: printer board, coadă, KPI-uri, warning card cu recomandare', () => {
    renderAt('/');
    expect(screen.getByText('Printer board')).toBeTruthy();
    expect(screen.getByText('Următoarea comandă nouă poate începe')).toBeTruthy();
    expect(screen.getByText('Încasat luna asta')).toBeTruthy();
    expect(screen.getByText('Comanda #12 ratează deadline-ul')).toBeTruthy();
    expect(screen.getAllByText(/Mută #12 înaintea #/).length).toBeGreaterThan(0);
    expect(screen.getByText('Venituri pe luni')).toBeTruthy();
  });

  it('Comenzi: tabel, căutare, panou de detaliu', () => {
    renderAt('/comenzi');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(5);
    fireEvent.change(screen.getByLabelText('Caută'), { target: { value: 'Comanda 12' } });
    expect(within(screen.getByRole('table')).getAllByText('Comanda 12').length).toBe(1);
    fireEvent.click(within(screen.getByRole('table')).getByText('Comanda 12'));
    expect(screen.getByText('Financiar')).toBeTruthy();
    expect(screen.getByText('Istoric')).toBeTruthy();
  });

  it('Formular comandă: validare în română + calculator', () => {
    renderAt('/comenzi');
    fireEvent.click(screen.getAllByText('Comandă nouă')[0]);
    expect(screen.getByText('Calculator cost')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filament total'), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText('Durată print totală'), { target: { value: '5' } });
    expect(screen.getByText('25.00 lei')).toBeTruthy();
    fireEvent.click(screen.getByText('Adaugă comanda'));
    expect(screen.getByText('Scrie un titlu pentru comandă.')).toBeTruthy();
  });

  it('Coadă: timeline + listă sortabilă + neprogramate', () => {
    renderAt('/coada');
    expect(screen.getByText('Timeline')).toBeTruthy();
    expect(screen.getByText('Ordinea de printare')).toBeTruthy();
    expect(screen.getByLabelText('Mută comanda #12')).toBeTruthy();
    expect(screen.getByText('Pune în coadă')).toBeTruthy();
  });

  it('Clienți + pagină client', () => {
    renderAt('/clienti');
    expect(screen.getByText('Top după bani')).toBeTruthy();
    renderAt('/clienti/3');
    expect(screen.getByText('Comenzile clientului')).toBeTruthy();
  });

  it('Statistici și Setări', () => {
    renderAt('/statistici');
    expect(screen.getByText('Cele mai profitabile comenzi')).toBeTruthy();
    renderAt('/setari');
    expect(screen.getByText('Preț filament')).toBeTruthy();
    expect(screen.getByDisplayValue('PETG')).toBeTruthy();
  });
});
