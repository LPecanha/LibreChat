import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Coins,
  CreditCard,
  Bot,
  Tags,
  Ticket,
  PackageOpen,
  ShieldCheck,
  KeyRound,
  SlidersHorizontal,
  Settings,
  LogOut,
  X,
  ShieldX,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { BRAND_NAME } from '~/lib/brand';
import { clearAuth } from '~/lib/auth';
import { Separator } from '~/components/ui/separator';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Visão geral',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Usuários',
    items: [
      { to: '/users', icon: Users, label: 'Usuários' },
      { to: '/organizations', icon: Building2, label: 'Organizações' },
      { to: '/credits', icon: Coins, label: 'Créditos' },
      { to: '/billing', icon: CreditCard, label: 'Faturamento' },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { to: '/agents', icon: Bot, label: 'Agentes' },
      { to: '/categories', icon: Tags, label: 'Categorias' },
      { to: '/coupons', icon: Ticket, label: 'Cupons' },
      { to: '/plans', icon: PackageOpen, label: 'Planos' },
    ],
  },
  {
    label: 'Controle',
    items: [
      { to: '/model-access', icon: ShieldX, label: 'Modelos' },
      { to: '/access', icon: ShieldCheck, label: 'Acesso' },
      { to: '/grants', icon: KeyRound, label: 'Permissões' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/configuration', icon: SlidersHorizontal, label: 'Configuração' },
      { to: '/settings', icon: Settings, label: 'Sistema' },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  function handleLogout() {
    clearAuth();
    window.location.href = '/login';
  }

  return (
    <aside
      className={cn(
        'flex h-screen w-56 shrink-0 flex-col border-r border-border bg-surface-secondary',
        'fixed inset-y-0 left-0 z-30 transition-transform duration-200 md:relative md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <img src="/logo.svg" alt={BRAND_NAME} className="h-6 w-auto" />
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-surface-hover md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto p-2 gap-1">
        {navGroups.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <Separator className="my-1.5" />}
            <p className="mb-0.5 px-3 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );
}
