import { Menu, Sun, Moon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getUser } from '~/lib/auth';
import { useTheme } from '~/hooks/useTheme';
import { resolveAvatarUrl } from '~/lib/models';

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'Usuários',
  '/organizations': 'Organizações',
  '/credits': 'Créditos',
  '/billing': 'Faturamento',
  '/agents': 'Agentes',
  '/categories': 'Categorias',
  '/plans': 'Planos',
  '/model-access': 'Modelos',
  '/access': 'Acesso',
  '/grants': 'Permissões',
  '/coupons': 'Cupons',
  '/configuration': 'Configuração',
  '/settings': 'Sistema',
};

interface Props {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: Props) {
  const { pathname } = useLocation();
  const user = getUser();
  const title = titles[pathname] ?? 'Manager';
  const { theme, toggle } = useTheme();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface-secondary px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-text-primary md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold text-text-primary">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-hover hover:text-text-primary transition-colors"
          aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {user && (
          <div className="flex items-center gap-2 pl-1">
            {resolveAvatarUrl(user.avatar) ? (
              <img src={resolveAvatarUrl(user.avatar)} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden text-sm text-text-secondary sm:block">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
