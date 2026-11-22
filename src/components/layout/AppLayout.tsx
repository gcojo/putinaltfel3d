import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChartColumn, ChevronsLeft, ChevronsRight, LayoutGrid, ListOrdered, LogOut, Moon, Package, Plus, Settings, Sun, Users,
} from 'lucide-react';
import { BrandMark } from '@/components/ui/Logo';
import { Dot } from '@/components/ui/Status';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/hooks/useData';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';
import { useTheme } from '@/hooks/useTheme';

/** Soare / lună suprapuse: iconița activă intră rotindu-se, cealaltă iese. */
function ThemeIcon({ dark, className = 'h-[18px] w-[18px]' }: { dark: boolean; className?: string }) {
  const base = `absolute inset-0 transition-all duration-500 ease-bounce ${className}`;
  return (
    <span className={`relative shrink-0 ${className}`}>
      <Sun className={`${base} ${dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} strokeWidth={1.6} />
      <Moon className={`${base} ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} strokeWidth={1.6} />
    </span>
  );
}

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
  const { isDark, toggle: toggleTheme } = useTheme();
  const themeLabel = isDark ? 'Mod luminos' : 'Mod întunecat';
  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(EXPANDED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const location = useLocation();
  const navigate = useNavigate();
  const printing = schedule.items.some((i) => i.isPrinting);
  // poziția „pastilei” roșii care alunecă sub elementul activ din meniu
  const activeIndex = NAV.findIndex((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
  const critical = warnings.filter((w) => w.level === 'critical').length;

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_KEY, expanded ? '1' : '0');
    } catch {
      /* stocare indisponibilă */
    }
  }, [expanded]);

  // Scurtături (desktop): N = comandă nouă, / = caută în comenzi
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        newOrder();
      } else if (e.key === '/') {
        e.preventDefault();
        const box = document.getElementById('cauta-comenzi');
        if (box) box.focus();
        else navigate('/comenzi', { state: { focusSearch: true } });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [newOrder, navigate]);

  // lanterna de pe carduri: poziția cursorului, relativ la cardul de sub el
  useEffect(() => {
    if (typeof window.matchMedia === 'function' && !window.matchMedia('(hover: hover)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const card = (e.target as HTMLElement | null)?.closest?.('.card') as HTMLElement | null;
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // acoladele contează: în Chromium nou scrollTo() returnează un Promise, iar React
  // l-ar trata drept funcție de curățare și s-ar bloca la schimbarea paginii
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const sideBtn =
    'flex h-10 items-center gap-3 rounded-[12px] px-[12px] text-muted transition-colors duration-200 hover:bg-glass/80 hover:text-fg';

  return (
    <div className="relative isolate min-h-screen md:flex">
      {/* Lumini calde care plutesc lent în spatele sticlei + inimioara mare, estompată */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-55 transition-opacity duration-500 md:opacity-100 dark:opacity-40 md:dark:opacity-60" aria-hidden>
        {/* culori mai saturate: sticla are ce să estompeze, deci efectul se vede */}
        <div className="absolute -left-24 -top-32 h-[32rem] w-[32rem] animate-drift rounded-full bg-accent/[0.32] blur-[90px]" />
        <div className="absolute -right-32 top-[18%] h-[30rem] w-[30rem] animate-drift rounded-full bg-accent-2/[0.42] blur-[90px] [animation-delay:-8s]" />
        <div className="absolute bottom-[-10rem] left-[28%] h-[30rem] w-[30rem] animate-drift rounded-full bg-accent-3/[0.26] blur-[100px] [animation-delay:-16s]" />
        <div className="absolute left-[45%] top-[35%] h-[22rem] w-[22rem] animate-drift rounded-full bg-[#F7B2C4]/[0.4] blur-[90px] [animation-delay:-23s]" />
        <img
          src={`${import.meta.env.BASE_URL}heart-512.png`}
          alt=""
          className="absolute -bottom-20 -right-10 h-[min(72vh,640px)] w-auto animate-float opacity-[0.16] dark:opacity-[0.12]"
        />
      </div>

      {/* Sidebar desktop: panou de sticlă plutitor, doar iconițe + tooltip, extensibil */}
      <aside
        className={`glass sticky top-3 z-30 my-3 ml-3 hidden h-[calc(100vh-24px)] shrink-0 flex-col rounded-card transition-[width] duration-300 ease-spring md:flex ${expanded ? 'w-56' : 'w-[68px]'}`}
      >
        <div className={`flex h-[72px] items-center ${expanded ? 'px-4' : 'justify-center'}`}>
          <BrandMark size={48} compact={!expanded} />
        </div>
        <nav className="relative flex flex-1 flex-col gap-1.5 px-3 py-2">
          {/* pastila activă: alunecă (cu mic recul) de la un element la altul */}
          <span
            aria-hidden
            className={`pointer-events-none absolute left-3 right-3 top-2 h-11 rounded-[12px] bg-gradient-to-br from-accent to-accent-soft shadow-glow transition-[transform,opacity] duration-500 ease-bounce ${activeIndex < 0 ? 'opacity-0' : 'opacity-100'}`}
            style={{ transform: `translateY(${Math.max(0, activeIndex) * 50}px)` }}
          />
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group relative flex h-11 items-center gap-3 rounded-[12px] px-[12px] transition-all duration-300 ease-spring ${
                  isActive ? 'text-white' : 'text-muted hover:translate-x-0.5 hover:bg-glass/80 hover:text-fg'
                }`
              }
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 group-hover:animate-wiggle ${activeIndex >= 0 && NAV[activeIndex].to === to ? 'animate-bounce-once' : ''}`}
                strokeWidth={1.6}
              />
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
          <button onClick={toggleTheme} className={sideBtn} title={themeLabel} aria-label={themeLabel}>
            <ThemeIcon dark={isDark} />
            {expanded && <span className="truncate text-base">{themeLabel}</span>}
          </button>
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
            <BrandMark size={34} />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded text-muted" aria-label={themeLabel}>
              <ThemeIcon dark={isDark} />
            </button>
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
        className="group fixed bottom-[76px] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-white shadow-glow transition-transform duration-200 active:scale-95 md:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Comandă nouă"
      >
        {/* inel care „respiră” în jurul butonului */}
        <span aria-hidden className="absolute inset-0 -z-10 animate-ring-pulse rounded-full bg-accent" />
        <Plus className="h-5 w-5 transition-transform duration-300 ease-bounce group-active:rotate-90" />
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
              {({ isActive }) => (
                <>
                  <Icon className={`h-5 w-5 transition-transform duration-300 ease-bounce ${isActive ? 'animate-bounce-once' : ''}`} strokeWidth={1.6} />
                  <span className="text-[10px] leading-none">{label}</span>
                  {/* liniuța de sus a elementului activ se deschide din centru */}
                  <i
                    aria-hidden
                    className={`absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-accent transition-transform duration-500 ease-bounce ${isActive ? 'scale-x-100' : 'scale-x-0'}`}
                  />
                  {to === '/' && critical > 0 && <Dot signal="critical" className="absolute right-[30%] top-2.5" />}
                  {to === '/coada' && printing && <Dot signal="ok" pulse className="absolute right-[30%] top-2.5" />}
                </>
              )}
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
        <div className="eyebrow eyebrow-draw mb-2">Departament printare 3D</div>
        {/* fiecare cuvânt urcă din spatele unei măști, unul după altul */}
        <h1 className="display text-[28px] leading-[32px] md:text-xl" aria-label={title}>
          {title.split(' ').map((w, i) => (
            <span key={`${w}-${i}`} aria-hidden className="-mb-1 inline-block overflow-hidden pb-1 align-bottom">
              <span className="inline-block animate-reveal-up" style={{ animationDelay: `${80 + i * 90}ms` }}>
                {w}
              </span>
              {i < title.split(' ').length - 1 && ' '}
            </span>
          ))}
        </h1>
        {sub && <div className="num mt-1 text-sm text-muted">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
