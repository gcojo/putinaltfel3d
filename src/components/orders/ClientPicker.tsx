import { useMemo, useRef, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import type { Client } from '@/types/db';
import { Input } from '@/components/ui/Field';

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Găsește clientul cu exact acest nume (fără diacritice / majuscule). */
export function matchClient(clients: Client[], text: string): Client | undefined {
  const n = norm(text);
  return n ? clients.find((c) => norm(c.nume) === n) : undefined;
}

/**
 * Câmp „Client” cu căutare: scrii câteva litere și alegi din listă.
 * Dacă numele nu există, clientul nou se creează automat la salvare.
 */
export function ClientPicker({
  id, clients, text, onChange,
}: {
  id?: string;
  clients: Client[];
  text: string;
  /** `client` e setat doar când textul corespunde unui client existent */
  onChange: (text: string, client: Client | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const exact = matchClient(clients, text);
  const options = useMemo(() => {
    const n = norm(text);
    const list = n ? clients.filter((c) => norm(c.nume).includes(n) || (c.telefon ?? '').replace(/\s/g, '').includes(n.replace(/\s/g, ''))) : clients;
    // cei care încep cu textul scris primii
    return [...list].sort((a, b) => Number(norm(b.nume).startsWith(n)) - Number(norm(a.nume).startsWith(n))).slice(0, 6);
  }, [clients, text]);
  const showNew = text.trim() !== '' && !exact;
  const count = options.length + (showNew ? 1 : 0);

  const pick = (c: Client | undefined) => {
    onChange(c ? c.nume : text.trim(), c);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={text}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder="Caută sau scrie un nume nou…"
        onChange={(e) => {
          onChange(e.target.value, matchClient(clients, e.target.value));
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || !count) return;
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setHi((h) => (h + (e.key === 'ArrowDown' ? 1 : count - 1)) % count);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(options[hi]);
          } else if (e.key === 'Escape') {
            // închide doar lista, nu tot panoul
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
        className={text ? 'pr-9' : ''}
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            onChange('', undefined);
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted hover:text-fg"
          aria-label="Golește clientul"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {open && count > 0 && !(exact && options.length === 1) && (
        <ul role="listbox" className="glass-panel absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-tile py-1">
          {options.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === hi}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${i === hi ? 'bg-ink/[0.06]' : ''}`}
              >
                <span className="truncate">{c.nume}</span>
                {(c.telefon || c.oras) && <span className="num shrink-0 text-xs text-muted">{c.telefon || c.oras}</span>}
              </button>
            </li>
          ))}
          {showNew && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={hi === options.length}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(undefined)}
                onMouseEnter={() => setHi(options.length)}
                className={`flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-sm text-accent ${hi === options.length ? 'bg-ink/[0.06]' : ''}`}
              >
                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Client nou: „{text.trim()}”</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
