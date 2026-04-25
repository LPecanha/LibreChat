import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loginWithPassword } from '~/lib/api';
import { setToken, setUser, clearAuth } from '~/lib/auth';
import { getAvailableTenants, setActiveTenant, isMultiTenant } from '~/lib/tenant';
import { BRAND_NAME } from '~/lib/brand';
import { useTheme } from '~/hooks/useTheme';
import type { TenantInfo } from '~/lib/tenant';

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

const floatingInput = 'peer w-full rounded-2xl border border-border bg-surface-primary px-3.5 pb-2.5 pt-3 text-text-primary duration-200 focus:border-primary focus:outline-none';
const floatingLabel = 'absolute start-3 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform bg-surface-primary px-2 text-sm text-muted-foreground duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-primary';

export function Login() {
  const navigate = useNavigate();
  const tenants = getAvailableTenants();
  const multi = isMultiTenant();
  const { theme, toggle } = useTheme();

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
    <div className="relative flex min-h-screen flex-col bg-white dark:bg-gray-900">
      <div className="mt-6 h-10 w-full bg-cover">
        <img
          src="/logo.svg"
          alt={BRAND_NAME}
          className="h-full w-full object-contain"
        />
      </div>

      <main className="flex flex-grow items-center justify-center">
        <div className="w-full overflow-hidden bg-white px-6 py-4 dark:bg-gray-900 sm:max-w-md sm:rounded-lg">
          <h1
            className="mb-4 text-center text-3xl font-semibold text-black dark:text-white"
            style={{ userSelect: 'none' }}
          >
            Painel de Gerenciamento
          </h1>

          {multi && (
            <div className="mb-4">
              <div className="relative">
                <select
                  id="tenant"
                  className="peer w-full appearance-none rounded-2xl border border-border bg-surface-primary px-3.5 pb-2.5 pt-5 text-text-primary duration-200 focus:border-green-500 focus:outline-none"
                  value={selectedTenant?.id ?? ''}
                  onChange={(e) => setSelectedTenant(tenants.find((x) => x.id === e.target.value) ?? null)}
                  required
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <label
                  htmlFor="tenant"
                  className="absolute start-3 top-1.5 z-10 origin-[0] -translate-y-0 scale-75 transform bg-surface-primary px-2 text-sm text-muted-foreground"
                >
                  Servidor
                </label>
              </div>
            </div>
          )}

          <form className="mt-6" aria-label="Login form" onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  aria-label="E-mail"
                  className={floatingInput}
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <label htmlFor="email" className={floatingLabel}>
                  E-mail
                </label>
              </div>
            </div>

            <div className="mb-2">
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  aria-label="Senha"
                  className={floatingInput}
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <label htmlFor="password" className={floatingLabel}>
                  Senha
                </label>
              </div>
            </div>

            {error && (
              <div role="alert" className="mt-2 rounded-md bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-500">
                {error}
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-2xl bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-gray-900"
              >
                {loading ? 'Entrando…' : 'Continuar'}
              </button>
            </div>
          </form>
        </div>
      </main>

      <div className="absolute bottom-0 left-0 m-4">
        <button
          onClick={toggle}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
          aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
