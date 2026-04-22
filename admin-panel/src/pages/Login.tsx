import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server } from 'lucide-react';
import { loginWithPassword } from '~/lib/api';
import { setToken, setUser } from '~/lib/auth';
import { getAvailableTenants, setActiveTenant, isMultiTenant } from '~/lib/tenant';
import type { TenantInfo } from '~/lib/tenant';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

export function Login() {
  const navigate = useNavigate();
  const tenants = getAvailableTenants();
  const multi = isMultiTenant();

  const [step, setStep] = useState<'tenant' | 'credentials'>(multi ? 'tenant' : 'credentials');
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(
    multi ? null : (tenants[0] ?? null),
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSelectTenant(tenant: TenantInfo) {
    setSelectedTenant(tenant);
    setActiveTenant(tenant);
    setStep('credentials');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginWithPassword(email, password);
      setToken(res.token);
      setUser(res.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-primary">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold text-text-primary">LibreChat Admin</h1>
          <p className="text-sm text-muted-foreground">
            {step === 'tenant' ? 'Selecione o servidor' : 'Entre com sua conta de administrador'}
          </p>
        </div>

        {step === 'tenant' && (
          <div className="space-y-2">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-colors',
                  'hover:border-primary hover:bg-surface-hover',
                )}
              >
                <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-text-primary">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">{tenant.id}</p>
                </div>
              </button>
            ))}

            {tenants.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Nenhum servidor configurado (VITE_TENANTS)
              </p>
            )}
          </div>
        )}

        {step === 'credentials' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {multi && selectedTenant && (
              <div className="flex items-center justify-between rounded-md bg-surface-hover px-3 py-2">
                <div className="flex items-center gap-2">
                  <Server className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-text-secondary">{selectedTenant.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setError(''); setStep('tenant'); }}
                  className="text-xs text-primary hover:underline"
                >
                  Trocar
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary" htmlFor="password">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
