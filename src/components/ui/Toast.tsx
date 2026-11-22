import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

type Kind = 'ok' | 'error' | 'info';
export interface ToastAction { label: string; onClick: () => void }
interface ToastItem { id: number; kind: Kind; text: string; action?: ToastAction }
interface ConfirmOpts { title: string; text?: string; confirmLabel?: string; danger?: boolean }

interface Ctx {
  /** cu `action` (ex. „Anulează”), notificarea stă mai mult pe ecran */
  toast: (text: string, kind?: Kind, action?: ToastAction) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}

const FeedbackContext = createContext<Ctx | null>(null);

/** Notificări (toast) + dialog de confirmare, în română. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (text: string, kind: Kind = 'ok', action?: ToastAction) => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-3), { id, kind, text, action }]);
      setTimeout(() => dismiss(id), action ? 7000 : kind === 'error' ? 6000 : 3000);
    },
    [dismiss],
  );

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), []);

  const close = useCallback(
    (v: boolean) => {
      dialog?.resolve(v);
      setDialog(null);
    },
    [dialog],
  );

  // Escape = Renunță
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      {createPortal(
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
            {toasts.map((t) => (
              <div
                key={t.id}
                role="status"
                className="glass-panel pointer-events-auto flex max-w-sm animate-pop-in items-center gap-2.5 rounded-tile px-4 py-3 text-sm"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.kind === 'ok' ? 'bg-ok' : t.kind === 'error' ? 'bg-critical' : 'bg-muted'}`} />
                <span className="flex-1">{t.text}</span>
                {t.action && (
                  <button
                    onClick={() => {
                      dismiss(t.id);
                      t.action!.onClick();
                    }}
                    className="-my-1 ml-1 shrink-0 rounded px-2 py-1 text-sm font-medium text-accent hover:bg-ink/[0.06]"
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>
          {dialog && (
            <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center" role="alertdialog" aria-modal="true">
              <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm" onClick={() => close(false)} />
              <div className="glass-panel relative w-full max-w-sm animate-pop-in rounded-card p-5">
                <h3 className="text-md">{dialog.title}</h3>
                {dialog.text && <p className="mt-2 text-sm text-muted">{dialog.text}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => close(false)}>
                    Renunță
                  </Button>
                  <Button variant={dialog.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
                    {dialog.confirmLabel ?? 'Confirmă'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body,
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback în afara FeedbackProvider');
  return ctx;
}
