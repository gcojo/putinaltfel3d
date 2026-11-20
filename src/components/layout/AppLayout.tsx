import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ChartColumn, ChevronsLeft, ChevronsRight, LayoutGrid, ListOrdered, LogOut, Package, Plus, Settings, Users,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Dot } from '@/components/ui/Status';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/comenzi', label: 'Comenzi', icon: Package },
  { to: '/coada', label: 'Coadă', icon: ListOrdered },
  { to: '/clienti', label: 'Clienți', icon: Users },
  { to: '/statistici', label: 'Statistici', icon: ChartColumn },
  { to: '/setari', label: 'Setări', icon: Settings },
];

const EXPANDED_KEY = 'sidebar-expanded';

export function AppLayout() {
  const { signOut, session } = useAuth();
  const { warnings, schedule } = useData();
  const { newOrder } = useOrderPanel();
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(EXPANDED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const location = useLocation();
  const printing = schedule.items.some((i) => i.isPrinting);
  const critical = warnings.filter((w) => w.level === 'critical').length;

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_KEY, expanded ? '1' : '0');
    } catch {
      /* stocare indisponibilă */
    }
  }, [expanded]);

  useEffect(() => window.scrollTo(0, 0), [location.pathname]);

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar desktop: îngust, doar iconițe + tooltip, extensibil */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-bg transition-[width] duration-200 md:flex ${expanded ? 'w-52' : 'w-15'}`}
      >
        <div className="flex h-15 items-center gap-3 px-[18px]">
          <Logo size={24} className="shrink-0" />
          {expanded && <span className="label truncate text-fg">Print 3D · Control</span>}
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2.5 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group relative flex h-10 items-center gap-3 rounded px-[11px] transition-colors duration-150 ${
                  isActive ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface hover:text-fg'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
              {expanded && <span className="truncate text-base">{label}</span>}
              {to === '/' && critical > 0 && <Dot signal="critical" className={expanded ? 'ml-auto' : 'absolute right-2 top-2'} />}
              {to === '/coada' && printing && <Dot signal="ok" pulse className={expanded ? 'ml-auto' : 'absolute right-2 top-2'} />}
              {!expanded && (
                <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded border border-line bg-surface-2 px-2 py-1 text-sm text-fg opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-line px-2.5 py-3">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex h-10 items-center gap-3 rounded px-[11px] text-muted transition-colors duration-150 hover:bg-surface hover:text-fg"
            title={expanded ? 'Restrânge meniul' : 'Extinde meniul'}
          >
            {expanded ? <ChevronsLeft className="h-[18px] w-[18px]" strokeWidth={1.5} /> : <ChevronsRight className="h-[18px] w-[18px]" strokeWidth={1.5} />}
            {expanded && <span className="text-base">Restrânge</span>}
          </button>
          <button
            onClick={signOut}
            className="flex h-10 items-center gap-3 rounded px-[11px] text-muted transition-colors duration-150 hover:bg-surface hover:text-fg"
            title={`Deconectare (${session?.user.email ?? ''})`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
            {expanded && <span className="truncate text-base">Deconectare</span>}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Header mobil */}
        <header className="pt-safe sticky top-0 z-20 flex h-13 items-center justify-between border-b border-line bg-bg/95 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2.5">
            <Logo size={20} />
            <span className="label text-fg">Print 3D</span>
          </div>
          <div className="flex items-center gap-1">
            <NavLink to="/setari" className="flex h-9 w-9 items-center justify-center rounded text-muted" aria-label="Setări">
              <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </NavLink>
            <button onClick={signOut} className="flex h-9 w-9 items-center justify-center rounded text-muted" aria-label="Deconectare">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-6">
          <Outlet />
        </main>
      </div>

      {/* Buton rapid „comandă nouă” pe mobil */}
      <button
        onClick={() => newOrder()}
        className="fixed bottom-[76px] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-fg text-bg transition-transform duration-150 active:scale-95 md:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Comandă nouă"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Navigare jos pe mobil */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur md:hidden">
        <div className="grid h-15 grid-cols-5">
          {NAV.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${isActive ? 'text-fg' : 'text-muted'}`
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[10px] leading-none">{label}</span>
              {to === '/' && critical > 0 && <Dot signal="critical" className="absolute right-[30%] top-2.5" />}
              {to === '/coada' && printing && <Dot signal="ok" pulse className="absolute right-[30%] top-2.5" />}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-light">{title}</h1>
        {sub && <div className="num mt-1 text-sm text-muted">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
