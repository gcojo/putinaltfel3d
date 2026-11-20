import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

type Kind = 'ok' | 'error' | 'info';
interface ToastItem { id: number; kind: Kind; text: string }
interface ConfirmOpts { title: string; text?: string; confirmLabel?: string; danger?: boolean }

interface Ctx {
  toast: (text: string, kind?: Kind) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}

const FeedbackContext = createContext<Ctx | null>(null);

/** Notificări (toast) + dialog de confirmare, în română. */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const seq = useRef(0);

  const toast = useCallback((text: string, kind: Kind = 'ok') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3000);
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), []);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

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
                {t.text}
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
