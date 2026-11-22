import { forwardRef, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

/** Undă de lumină care pornește din punctul apăsat și se stinge (efect „ripple”). */
export function spawnRipple(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const dot = document.createElement('span');
  dot.className = 'ripple';
  dot.setAttribute('aria-hidden', 'true');
  dot.style.width = dot.style.height = `${size}px`;
  dot.style.left = `${e.clientX - r.left - size / 2}px`;
  dot.style.top = `${e.clientY - r.top - size / 2}px`;
  el.appendChild(dot);
  dot.addEventListener('animationend', () => dot.remove());
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'text-white border border-accent bg-accent shadow-glow hover:bg-accent-soft hover:border-accent-soft hover:-translate-y-px',
  secondary: 'bg-glass/70 text-fg border border-line backdrop-blur-md hover:border-fg hover:bg-glass',
  ghost: 'text-muted hover:text-fg hover:bg-glass/70 border border-transparent',
  danger: 'text-critical border border-critical/30 bg-glass/60 hover:border-critical hover:bg-critical hover:text-white',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, children, className = '', disabled, type = 'button', onPointerDown, ...rest },
  ref,
) {
  const sz = size === 'sm' ? 'h-8 px-2.5 text-sm gap-1.5' : 'h-10 px-3.5 text-base gap-2 sm:h-9';
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onPointerDown={(e) => {
        spawnRipple(e);
        onPointerDown?.(e);
      }}
      className={`relative isolate inline-flex shrink-0 select-none overflow-hidden items-center justify-center whitespace-nowrap rounded font-medium transition-all duration-200 ease-spring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${sz} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function IconButton({ label, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded text-muted transition-all duration-200 hover:bg-glass/80 hover:text-fg active:scale-90 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
