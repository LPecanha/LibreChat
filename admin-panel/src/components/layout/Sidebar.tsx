import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Coins,
  CreditCard,
  Bot,
  PackageOpen,
  ShieldCheck,
  KeyRound,
  SlidersHorizontal,
  Settings,
  LogOut,
  Server,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { clearAuth } from '~/lib/auth';
import { getActiveTenant, clearTenant, isMultiTenant } from '~/lib/tenant';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Usuários' },
  { to: '/organizations', icon: Building2, label: 'Organizações' },
  { to: '/credits', icon: Coins, label: 'Créditos' },
  { to: '/billing', icon: CreditCard, label: 'Faturamento' },
  { to: '/agents', icon: Bot, label: 'Agentes' },
  { to: '/plans', icon: PackageOpen, label: 'Planos' },
  { to: '/access', icon: ShieldCheck, label: 'Acesso' },
  { to: '/grants', icon: KeyRound, label: 'Permissões' },
  { to: '/configuration', icon: SlidersHorizontal, label: 'Configuração' },
  { to: '/settings', icon: Settings, label: 'Sistema' },
];

export function Sidebar() {
  const tenant = getActiveTenant();
  const multi = isMultiTenant();

  function handleLogout() {
    clearAuth();
    clearTenant();
    window.location.href = '/login';
  }

  function handleSwitchTenant() {
    clearAuth();
    clearTenant();
    window.location.href = '/login';
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-surface-secondary">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="text-sm font-semibold text-text-primary">LibreChat Admin</span>
      </div>

      {tenant && (
        <div className="border-b border-border px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Server className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs text-text-secondary">{tenant.name}</span>
            </div>
            {multi && (
              <button
                onClick={handleSwitchTenant}
                title="Trocar servidor"
                className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                <ArrowLeftRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-surface-active text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
