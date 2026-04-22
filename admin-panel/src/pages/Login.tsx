import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithPassword } from '~/lib/api';
import { setToken, setUser, clearAuth } from '~/lib/auth';
import { getAvailableTenants, setActiveTenant, isMultiTenant } from '~/lib/tenant';
import { BRAND_NAME } from '~/lib/brand';
import type { TenantInfo } from '~/lib/tenant';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('401') || /invalid|incorrect|credentials/i.test(msg)) {
    return 'E-mail ou senha incorretos.';
  }
  if (msg.includes('403')) return 'Sua conta não tem permissão de administrador.';
  if (msg.includes('404')) return 'Servidor não encontrado. Verifique o servidor selecionado.';
  if (msg.includes('502') || msg.includes('503') || msg.includes('500')) {
    return 'Erro no servidor. Tente novamente em instantes.';
  }
  if (/failed to fetch|networkerror|network/i.test(msg)) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  }
  return msg || 'Erro ao fazer login. Tente novamente.';
}

export function Login() {
  const navigate = useNavigate();
  const tenants = getAvailableTenants();
  const multi = isMultiTenant();

  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(tenants[0] ?? null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenant) {
      setError('Selecione um servidor.');
      return;
    }
    setError('');
    setLoading(true);
    clearAuth();
    try {
      setActiveTenant(selectedTenant);
      const res = await loginWithPassword(email, password);
      setToken(res.token);
      setUser(res.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-primary">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.svg" alt={BRAND_NAME} className="h-8 w-auto" />
          <p className="text-sm text-muted-foreground">Painel de administração</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {multi && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary" htmlFor="tenant">
                Servidor
              </label>
              <select
                id="tenant"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedTenant?.id ?? ''}
                onChange={(e) => {
                  setError('');
                  setSelectedTenant(tenants.find((x) => x.id === e.target.value) ?? null);
                }}
                required
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary" htmlFor="email">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              placeholder="admin@exemplo.com"
              value={email}
              onChange={(e) => { setError(''); setEmail(e.target.value); }}
              className={cn(error && 'border-destructive focus-visible:ring-destructive')}
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
              onChange={(e) => { setError(''); setPassword(e.target.value); }}
              className={cn(error && 'border-destructive focus-visible:ring-destructive')}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
