import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

export default function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof fieldErr = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Introdu o adresă de email validă.';
    if (!password) errs.password = 'Introdu parola.';
    setFieldErr(errs);
    if (errs.email || errs.password) return;
    setBusy(true);
    setError(await signIn(email, password));
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <Logo size={28} />
          <div>
            <div className="label text-fg">Print 3D · Control</div>
            <div className="text-xs text-muted">Bambu Lab A1</div>
          </div>
        </div>
        <form onSubmit={submit} noValidate className="card flex flex-col gap-4 p-5">
          <h1 className="text-lg font-light">Autentificare</h1>
          <Field label="Email" error={fieldErr.email} htmlFor="email">
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!fieldErr.email} autoFocus />
          </Field>
          <Field label="Parolă" error={fieldErr.password} htmlFor="password">
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!fieldErr.password} />
          </Field>
          {error && (
            <div className="flex items-center gap-2 text-sm text-critical" role="alert">
              <span className="h-1.5 w-1.5 rounded-full bg-critical" />
              {error}
            </div>
          )}
          <Button type="submit" variant="primary" loading={busy} className="mt-1">
            Intră în cont
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-2">Acces doar pentru administrator.</p>
      </div>
    </div>
  );
}
