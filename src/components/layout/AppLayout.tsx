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

/** Pătrățel cu gradient în care stă logo-ul. */
function LogoBadge({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-accent to-accent-2 text-white shadow-glow"
      style={{ width: size, height: size }}
    >
      <Logo size={Math.round(size * 0.56)} />
    </span>
  );
}

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

  // acoladele contează: în Chromium nou scrollTo() returnează un Promise, iar React
  // l-ar trata drept funcție de curățare și s-ar bloca la schimbarea paginii
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const sideBtn =
    'flex h-10 items-center gap-3 rounded-[12px] px-[12px] text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-fg';

  return (
    <div className="relative isolate min-h-screen md:flex">
      {/* Lumini difuze care plutesc lent în spatele sticlei */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-40 h-[34rem] w-[34rem] animate-drift rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/4 h-[30rem] w-[30rem] animate-drift rounded-full bg-accent-2/[0.12] blur-[120px] [animation-delay:-10s]" />
        <div className="absolute -bottom-40 left-1/3 h-[28rem] w-[28rem] animate-drift rounded-full bg-accent-3/[0.12] blur-[130px] [animation-delay:-20s]" />
      </div>

      {/* Sidebar desktop: panou de sticlă plutitor, doar iconițe + tooltip, extensibil */}
      <aside
        className={`glass sticky top-3 z-30 my-3 ml-3 hidden h-[calc(100vh-24px)] shrink-0 flex-col rounded-card transition-[width] duration-300 ease-spring md:flex ${expanded ? 'w-56' : 'w-[68px]'}`}
      >
        <div className="flex h-16 items-center gap-3 px-[17px]">
          <LogoBadge size={34} />
          {expanded && <span className="label animate-fade-in truncate text-fg">Print 3D · Control</span>}
        </div>
        <nav className="flex flex-1 flex-col gap-1.5 px-3 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group relative flex h-11 items-center gap-3 rounded-[12px] px-[12px] transition-all duration-300 ease-spring ${
                  isActive
                    ? 'bg-gradient-to-r from-accent/30 to-accent-2/10 text-fg shadow-[inset_0_0_0_1px_rgba(139,123,255,0.35),0_8px_24px_-10px_rgba(139,123,255,0.7)]'
                    : 'text-muted hover:translate-x-0.5 hover:bg-surface-2 hover:text-fg'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
              {expanded && <span className="animate-fade-in truncate text-base">{label}</span>}
              {to === '/' && critical > 0 && <Dot signal="critical" className={expanded ? 'ml-auto' : 'absolute right-2 top-2'} />}
              {to === '/coada' && printing && <Dot signal="ok" pulse className={expanded ? 'ml-auto' : 'absolute right-2 top-2'} />}
              {!expanded && (
                <span className="glass-panel pointer-events-none absolute left-full z-50 ml-4 -translate-x-1 whitespace-nowrap rounded px-2.5 py-1.5 text-sm text-fg opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-line px-3 py-3">
          <button onClick={() => setExpanded((e) => !e)} className={sideBtn} title={expanded ? 'Restrânge meniul' : 'Extinde meniul'}>
            {expanded ? <ChevronsLeft className="h-[18px] w-[18px]" strokeWidth={1.6} /> : <ChevronsRight className="h-[18px] w-[18px]" strokeWidth={1.6} />}
            {expanded && <span className="text-base">Restrânge</span>}
          </button>
          <button onClick={signOut} className={sideBtn} title={`Deconectare (${session?.user.email ?? ''})`}>
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
            {expanded && <span className="truncate text-base">Deconectare</span>}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Header mobil */}
        <header className="pt-safe glass sticky top-0 z-20 flex h-13 items-center justify-between rounded-none border-x-0 border-t-0 px-4 md:hidden">
          <div className="flex items-center gap-2.5">
            <LogoBadge size={28} />
            <span className="label text-fg">Print 3D</span>
          </div>
          <div className="flex items-center gap-1">
            <NavLink to="/setari" className="flex h-9 w-9 items-center justify-center rounded text-muted" aria-label="Setări">
              <Settings className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </NavLink>
            <button onClick={signOut} className="flex h-9 w-9 items-center justify-center rounded text-muted" aria-label="Deconectare">
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-7">
          {/* cheia pe rută repornește animația de intrare la fiecare schimbare de pagină */}
          <div key={location.pathname} className="animate-rise">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Buton rapid „comandă nouă” pe mobil */}
      <button
        onClick={() => newOrder()}
        className="fixed bottom-[76px] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-white shadow-glow transition-transform duration-200 active:scale-95 md:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Comandă nouă"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Navigare jos pe mobil */}
      <nav className="pb-safe glass fixed inset-x-0 bottom-0 z-30 rounded-none border-x-0 border-b-0 md:hidden">
        <div className="grid h-15 grid-cols-5">
          {NAV.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${isActive ? 'text-accent' : 'text-muted'}`
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.6} />
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-gradient text-xl font-light">{title}</h1>
        {sub && <div className="num mt-1 text-sm text-muted">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
