import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { DataProvider } from '@/hooks/useData';
import { FeedbackProvider } from '@/components/ui/Toast';
import { OrderPanelProvider } from '@/components/orders/OrderPanelProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import { Logo } from '@/components/ui/Logo';
import { isConfigured } from '@/lib/supabase';
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';

// paginile secundare se încarcă la cerere (bundle inițial mai mic pe telefon)
const OrdersPage = lazy(() => import('@/pages/Orders'));
const QueuePage = lazy(() => import('@/pages/Queue'));
const ClientsPage = lazy(() => import('@/pages/Clients'));
const ClientDetailPage = lazy(() => import('@/pages/ClientDetail'));
const StatsPage = lazy(() => import('@/pages/Stats'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const CatalogPage = lazy(() => import('@/pages/Catalog'));
const FilamentPage = lazy(() => import('@/pages/Filament'));

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Logo size={64} still className="animate-heartbeat" />
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          <span className="label text-warning">Configurare lipsă</span>
        </div>
        <h1 className="text-lg">Lipsesc cheile Supabase</h1>
        <p className="mt-2 text-sm text-muted">
          Copiază fișierul <code className="text-fg">.env.example</code> ca <code className="text-fg">.env.local</code>, completează{' '}
          <code className="text-fg">VITE_SUPABASE_URL</code> și <code className="text-fg">VITE_SUPABASE_ANON_KEY</code>, apoi repornește
          aplicația. Pe Cloudflare/Netlify, adaugă-le ca variabile de mediu și refă deploy-ul. Detalii în README.
        </p>
      </div>
    </div>
  );
}

function Protected() {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/login" replace />;
  return (
    <DataProvider>
      <FeedbackProvider>
        <OrderPanelProvider>
          <AppLayout />
        </OrderPanelProvider>
      </FeedbackProvider>
    </DataProvider>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Protected />}>
          <Route index element={<DashboardPage />} />
          <Route path="comenzi" element={<OrdersPage />} />
          <Route path="coada" element={<QueuePage />} />
          <Route path="clienti" element={<ClientsPage />} />
          <Route path="clienti/:id" element={<ClientDetailPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="filament" element={<FilamentPage />} />
          <Route path="statistici" element={<StatsPage />} />
          <Route path="setari" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  if (!isConfigured) return <NotConfigured />;
  return (
    <AuthProvider>
      {/* basename: pe GitHub Pages aplicația stă în /putinaltfel3d/ */}
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
