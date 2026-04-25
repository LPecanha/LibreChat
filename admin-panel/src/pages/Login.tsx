import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithPassword } from '~/lib/api';
import { setToken, setUser, clearAuth } from '~/lib/auth';
import { getAvailableTenants, setActiveTenant, isMultiTenant } from '~/lib/tenant';
import { BRAND_NAME, BRAND_COLOR } from '~/lib/brand';
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
    <div className="flex min-h-screen bg-surface-primary">
      {/* Brand panel — desktop only */}
      <div
        className="hidden lg:flex lg:w-2/5 flex-col items-center justify-center gap-6 p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(150deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR}99 100%)` }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, white 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, white 0%, transparent 50%)`,
          }}
        />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <img src="/logo.svg" alt={BRAND_NAME} className="h-14 w-auto brightness-0 invert" />
          <div>
            <h1 className="text-2xl font-bold text-white">{BRAND_NAME}</h1>
            <p className="text-white/70 text-sm mt-1">Painel de administração</p>
          </div>
        </div>
        <div className="relative mt-8 flex flex-col gap-3 text-left w-full max-w-xs">
          {[
            'Gestão de usuários e organizações',
            'Controle de créditos e faturamento',
            'Configuração de modelos e agentes',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2.5 text-sm text-white/80">
              <div className="h-1.5 w-1.5 rounded-full bg-white/60 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-7">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <img src="/logo.svg" alt={BRAND_NAME} className="h-9 w-auto" />
            <p className="text-sm text-muted-foreground">Painel de administração</p>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">Entrar</h2>
            <p className="text-sm text-muted-foreground">Use suas credenciais de administrador</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {multi && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary" htmlFor="tenant">
                  Servidor
                </label>
                <select
                  id="tenant"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
                  value={selectedTenant?.id ?? ''}
                  onChange={(e) => {
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
                onChange={(e) => setEmail(e.target.value)}
                className={cn('h-10', error && 'border-destructive focus-visible:ring-destructive')}
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
                className={cn('h-10', error && 'border-destructive focus-visible:ring-destructive')}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
