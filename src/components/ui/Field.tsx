import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

export function Field({
  label, error, hint, children, className = '', htmlFor,
}: { label: string; error?: string; hint?: ReactNode; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-critical" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Pe telefon nu deschidem tastatura singuri: câmpul primește focus doar când îl atingi. */
const TOUCH = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
const noTouchFocus = (autoFocus?: boolean) => (TOUCH ? false : autoFocus);

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; suffix?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, suffix, className = '', autoFocus, ...rest }, ref) {
  const input = (
    <input ref={ref} className={`input ${invalid ? 'input-error' : ''} ${suffix ? 'pr-10' : ''} ${className}`} autoFocus={noTouchFocus(autoFocus)} {...rest} />
  );
  if (!suffix) return input;
  return (
    <div className="relative">
      {input}
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{suffix}</span>
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { invalid, className = '', children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={`input appearance-none bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8 ${invalid ? 'input-error' : ''} ${className}`}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%236B6660' fill='none' stroke-width='1.2'/%3E%3C/svg%3E\")" }}
      {...rest}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = '', autoFocus, ...rest },
  ref,
) {
  return <textarea ref={ref} className={`input h-auto min-h-[72px] py-2 ${className}`} autoFocus={noTouchFocus(autoFocus)} {...rest} />;
});

/** Comutator segmentat (ex. Normală / Urgentă). */
export function Segmented<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex h-10 rounded border border-line bg-glass/60 p-0.5 sm:h-9" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-[8px] px-2 text-sm transition-all duration-300 ease-spring ${value === o.value ? 'bg-accent text-white shadow-glow' : 'text-muted hover:text-fg'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
