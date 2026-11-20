import { useEffect, useState } from 'react';
import type { Client, ClientInput } from '@/types/db';
import * as api from '@/lib/api';
import { useData } from '@/hooks/useData';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { SlideOver } from '@/components/ui/SlideOver';
import { useFeedback } from '@/components/ui/Toast';

const empty = { nume: '', telefon: '', email: '', oras: '', note: '' };

export function ClientFormPanel({ open, client, onClose, onSaved }: { open: boolean; client?: Client; onClose: () => void; onSaved?: (c: Client) => void }) {
  const { reload } = useData();
  const { toast } = useFeedback();
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState<{ nume?: string; email?: string; telefon?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setF(client ? { nume: client.nume, telefon: client.telefon ?? '', email: client.email ?? '', oras: client.oras ?? '', note: client.note ?? '' } : empty);
      setErrors({});
    }
  }, [open, client]);

  const set = (k: keyof typeof empty, v: string) => {
    setF((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!f.nume.trim()) errs.nume = 'Numele este obligatoriu.';
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) errs.email = 'Adresa de email nu este validă.';
    if (f.telefon.trim() && !/^[+\d][\d\s().-]{5,}$/.test(f.telefon.trim())) errs.telefon = 'Numărul de telefon nu este valid.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const input: ClientInput = {
        nume: f.nume.trim(),
        telefon: f.telefon.trim() || null,
        email: f.email.trim() || null,
        oras: f.oras.trim() || null,
        note: f.note.trim() || null,
      };
      const saved = await api.saveClient(input, client?.id);
      toast(client ? 'Clientul a fost actualizat.' : `Clientul „${saved.nume}” a fost adăugat.`);
      await reload();
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast(api.friendlyError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={client ? 'Editează client' : 'Client nou'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Renunță
          </Button>
          <Button type="submit" form="client-form" variant="primary" loading={saving}>
            Salvează
          </Button>
        </div>
      }
    >
      <form id="client-form" onSubmit={submit} noValidate className="flex flex-col gap-4 px-5 py-5">
        <Field label="Nume" error={errors.nume} htmlFor="c-nume">
          <Input id="c-nume" value={f.nume} onChange={(e) => set('nume', e.target.value)} invalid={!!errors.nume} autoFocus={!client} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Telefon" error={errors.telefon} htmlFor="c-tel">
            <Input id="c-tel" type="tel" inputMode="tel" value={f.telefon} onChange={(e) => set('telefon', e.target.value)} invalid={!!errors.telefon} placeholder="07xx xxx xxx" />
          </Field>
          <Field label="Email" error={errors.email} htmlFor="c-email">
            <Input id="c-email" type="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} />
          </Field>
        </div>
        <Field label="Oraș" htmlFor="c-oras">
          <Input id="c-oras" value={f.oras} onChange={(e) => set('oras', e.target.value)} />
        </Field>
        <Field label="Note" htmlFor="c-note">
          <Textarea id="c-note" value={f.note} onChange={(e) => set('note', e.target.value)} rows={3} />
        </Field>
      </form>
    </SlideOver>
  );
}
