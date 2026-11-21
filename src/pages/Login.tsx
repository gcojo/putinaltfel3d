import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { loginToEmail } from '@/lib/login';

export default function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ login?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof fieldErr = {};
    const email = loginToEmail(login);
    if (!email) errs.login = 'Introdu utilizatorul (ex. admin) sau o adresă de email.';
    if (!password) errs.password = 'Introdu parola.';
    setFieldErr(errs);
    if (!email || errs.password) return;
    setBusy(true);
    setError(await signIn(email, password));
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <Logo size={72} />
          <div>
            <div className="font-display text-xl font-normal">putinaltfel3d</div>
            <div className="text-xs text-muted">Bambu Lab A1</div>
          </div>
        </div>
        <form onSubmit={submit} noValidate className="card flex animate-pop-in flex-col gap-4 p-6">
          <div className="eyebrow">Departament printare 3D</div>
          <h1 className="display -mt-1 text-[30px] leading-tight">Bine ai <em>revenit.</em></h1>
          <Field label="Utilizator sau email" error={fieldErr.login} htmlFor="login">
            <Input
              id="login"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="admin"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              invalid={!!fieldErr.login}
              autoFocus
            />
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
