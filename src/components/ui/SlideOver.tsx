import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';

/** Panou lateral de detaliu (dreapta). Pe mobil ocupă tot ecranul. */
export function SlideOver({
  open, onClose, title, subtitle, children, footer, width = 'max-w-[480px]',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className={`pt-safe relative flex h-full w-full ${width} animate-slide-in flex-col rounded-none border-y-0 border-r-0 glass-panel sm:my-2 sm:mr-2 sm:h-[calc(100%-16px)] sm:rounded-card sm:border-y sm:border-r`}>
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-lg font-normal">{title}</div>
            {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
          </div>
          <IconButton label="Închide" onClick={onClose} className="-mr-2 -mt-1">
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <footer className="pb-safe border-t border-line px-5 py-3">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}
