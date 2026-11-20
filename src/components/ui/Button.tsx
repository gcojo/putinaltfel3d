import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'text-white border border-white/10 bg-gradient-to-r from-accent to-[#6A8BFF] shadow-[0_8px_24px_-10px_rgba(139,123,255,0.9)] hover:shadow-glow hover:brightness-110',
  secondary: 'bg-surface-2 text-fg border border-line backdrop-blur-md hover:border-line-strong hover:bg-surface-3',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2 border border-transparent',
  danger: 'text-critical border border-line hover:border-critical/60 hover:bg-critical/10 hover:shadow-[0_8px_24px_-12px_rgba(255,77,106,0.8)]',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, children, className = '', disabled, type = 'button', ...rest },
  ref,
) {
  const sz = size === 'sm' ? 'h-8 px-2.5 text-sm gap-1.5' : 'h-10 px-3.5 text-base gap-2 sm:h-9';
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded font-medium transition-all duration-200 ease-spring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${sz} ${VARIANTS[variant]} ${className}`}
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
      className={`inline-flex h-9 w-9 items-center justify-center rounded text-muted transition-all duration-200 hover:bg-surface-2 hover:text-fg active:scale-90 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
