import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { DataProvider } from '@/hooks/useData';
import { FeedbackProvider } from '@/components/ui/Toast';
import { OrderPanelProvider } from '@/components/orders/OrderPanelProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import DashboardPage from '@/pages/Dashboard';
import CatalogPage from '@/pages/Catalog';
import FilamentPage from '@/pages/Filament';
import type { FilamentMove, Product } from '@/types/db';
import OrdersPage from '@/pages/Orders';
import QueuePage from '@/pages/Queue';
import ClientsPage from '@/pages/Clients';
import ClientDetailPage from '@/pages/ClientDetail';
import StatsPage from '@/pages/Stats';
import SettingsPage from '@/pages/Settings';
import LoginPage from '@/pages/Login';
import { NOW, clients, payments, seedLike, settings } from './fixtures';

function renderAt(path: string, extras?: { products: Product[]; moves: FilamentMove[] }) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <DataProvider initial={{ clients, orders: seedLike(), payments, settings, ...(extras ? { ...extras, migrated: true } : {}) }} fixedNow={NOW}>
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
                  <Route path="catalog" element={<CatalogPage />} />
                  <Route path="filament" element={<FilamentPage />} />
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
    // comanda nouă nu cere date de print: le adaugi după proiectare
    expect(screen.queryByText('Calculator cost')).toBeNull();
    fireEvent.click(screen.getByText('Am deja datele'));
    expect(screen.getByText('Calculator cost')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filament total'), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText('Durată print totală'), { target: { value: '5' } });
    expect(screen.getByText('25.00 lei')).toBeTruthy(); // cost material
    expect(screen.getAllByText('50 lei').length).toBeGreaterThan(0); // preț sugerat = 25 × 2 (adaos 100%), fără curent
    // 2 ore de proiectare × 50 lei/oră se adaugă la prețul sugerat
    fireEvent.change(screen.getByLabelText('Timp de proiectare'), { target: { value: '2' } });
    expect(screen.getByText('100.00 lei')).toBeTruthy();
    expect(screen.getAllByText('150 lei').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Adaugă comanda'));
    expect(screen.getByText('Scrie un titlu pentru comandă.')).toBeTruthy();
  });

  it('Formular comandă: client cu căutare, client nou, șablon din comandă anterioară', () => {
    renderAt('/comenzi');
    fireEvent.click(screen.getAllByText('Comandă nouă')[0]);
    const client = document.getElementById('f-client')!;
    fireEvent.focus(client);
    fireEvent.change(client, { target: { value: 'mari' } });
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: /Maria Ionescu/ }));
    expect((client as HTMLInputElement).value).toBe('Maria Ionescu');
    expect(screen.queryByLabelText('Telefon client nou')).toBeNull();

    fireEvent.change(client, { target: { value: 'Ion Nou' } });
    expect(screen.getByLabelText('Telefon client nou')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Titlu'), { target: { value: 'comanda 10' } });
    fireEvent.click(screen.getByText(/Ai mai făcut-o \(#10\)/));
    expect((screen.getByLabelText('Durată print totală') as HTMLInputElement).value).toBe('12');
    expect((screen.getByLabelText('Preț vânzare') as HTMLInputElement).value).toBe('50');
  });

  it('De proiectat: card pe Dashboard, atenționare, panou cu gramele și timpul', () => {
    renderAt('/');
    expect(screen.getAllByText('De proiectat').length).toBeGreaterThan(0);
    expect(screen.getByText('Comanda #15 nu e proiectată încă')).toBeTruthy();
    fireEvent.click(screen.getByText('Adaugă datele'));
    expect(screen.getByText('Date de print')).toBeTruthy();
    fireEvent.click(screen.getByText('O singură bucată'));
    fireEvent.change(screen.getByLabelText('Filament / bucată'), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText('Durată / bucată'), { target: { value: '1h 30m' } });
    expect(screen.getByText('total 120 g')).toBeTruthy();
    expect(screen.getByText(/= 1.5 h · total 4.5 h/)).toBeTruthy();
    expect(screen.getByText('Pune comanda în coadă după salvare')).toBeTruthy();
    expect(screen.getByText(/Gol = prețul sugerat/)).toBeTruthy();
  });

  it('De proiectat: filtru în Comenzi și buton în panoul comenzii', () => {
    renderAt('/comenzi?status=proiectat');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row').length).toBe(3); // antet + 1 rând + total
    fireEvent.click(within(table).getByText('Figurină dragon'));
    expect(screen.getAllByText('Adaugă gramele și timpul').length).toBe(2);
  });

  it('Lipire din Bambu Studio completează gramele și timpul', () => {
    renderAt('/');
    fireEvent.click(screen.getByText('Adaugă datele'));
    fireEvent.paste(screen.getByLabelText('Lipește din Bambu Studio'), {
      clipboardData: { getData: () => 'Total time: 2h30m\nTotal filament: 45.5 g' },
    });
    expect((screen.getByLabelText('Filament total') as HTMLInputElement).value).toBe('45.5');
    expect((screen.getByLabelText('Durată totală') as HTMLInputElement).value).toBe('2.5');
    expect(screen.getByText('Am găsit: 45.5 g · 2.5 h')).toBeTruthy();
    // mai multe culori
    fireEvent.click(screen.getByText('Mai multe culori'));
    expect(screen.getByLabelText('Culoare 2')).toBeTruthy();
  });

  it('Fără migrația 0004: catalogul și stocul explică pasul din Supabase', () => {
    renderAt('/catalog');
    expect(screen.getByText(/0004_proiectare_stoc_catalog.sql/)).toBeTruthy();
  });

  it('Catalog: produs → comandă nouă cu valorile înmulțite', () => {
    const products: Product[] = [
      { id: 1, user_id: 'u', nume: 'Breloc inimă', descriere: null, material: 'PLA', culoare: 'Roșu', componente: null, grame: 12, ore: 0.5, pret: 15, note: null, created_at: '' },
    ];
    renderAt('/catalog', { products, moves: [] });
    expect(screen.getByText('Breloc inimă')).toBeTruthy();
    fireEvent.click(screen.getByText('Comandă'));
    expect((screen.getByLabelText('Titlu') as HTMLInputElement).value).toBe('Breloc inimă');
    fireEvent.change(screen.getByLabelText('Nr. bucăți'), { target: { value: '10' } });
    expect((screen.getByLabelText('Filament total') as HTMLInputElement).value).toBe('120');
    expect((screen.getByLabelText('Preț vânzare') as HTMLInputElement).value).toBe('150');
  });

  it('Filament: stoc, rezervat pentru coadă și avertizare când nu ajunge', () => {
    const moves: FilamentMove[] = [
      { id: 1, user_id: 'u', material: 'PLA', culoare: null, grame: 1000, tip: 'rola', order_id: null, note: null, created_at: '2026-11-01T10:00:00Z' },
      { id: 2, user_id: 'u', material: 'PLA', culoare: null, grame: -700, tip: 'comanda', order_id: 1, note: null, created_at: '2026-11-10T10:00:00Z' },
    ];
    renderAt('/filament', { products: [], moves });
    expect(screen.getByText('300 g')).toBeTruthy();
    // coada din fixture are 6 comenzi PLA × 100 g = 600 g rezervate
    expect(screen.getByText(/rezervat pentru coadă 600 g/)).toBeTruthy();
    renderAt('/', { products: [], moves });
    expect(screen.getByText('Nu ai destul PLA')).toBeTruthy();
  });

  it('Formular comandă: Escape cu date completate cere confirmare', () => {
    renderAt('/comenzi');
    fireEvent.click(screen.getAllByText('Comandă nouă')[0]);
    fireEvent.change(screen.getByLabelText('Titlu'), { target: { value: 'Ceva' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('Renunți la comanda nouă?')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Renunți la comanda nouă?')).toBeNull();
    expect((screen.getByLabelText('Titlu') as HTMLInputElement).value).toBe('Ceva');
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
