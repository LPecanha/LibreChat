import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithPassword } from '~/lib/api';
import { setToken, setUser } from '~/lib/auth';
import { getAvailableTenants, setActiveTenant, isMultiTenant } from '~/lib/tenant';
import type { TenantInfo } from '~/lib/tenant';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

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
      setError('Selecione um servidor');
      return;
    }
    setError('');
    setLoading(true);
    try {
      setActiveTenant(selectedTenant);
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
          <p className="text-sm text-muted-foreground">Entre com sua conta de administrador</p>
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
                  const t = tenants.find((x) => x.id === e.target.value) ?? null;
                  setSelectedTenant(t);
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
      </div>
    </div>
  );
}
