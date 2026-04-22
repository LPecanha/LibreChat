import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getUser } from '~/lib/auth';

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'Usuários',
  '/organizations': 'Organizações',
  '/credits': 'Créditos',
  '/billing': 'Faturamento',
  '/agents': 'Agentes',
  '/settings': 'Sistema',
};

interface Props {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: Props) {
  const { pathname } = useLocation();
  const user = getUser();
  const title = titles[pathname] ?? 'Admin';

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
        <h1 className="text-sm font-medium text-text-primary">{title}</h1>
      </div>
      {user && (
        <div className="flex items-center gap-2">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-active text-xs font-medium text-text-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="hidden text-sm text-text-secondary sm:block">{user.name}</span>
        </div>
      )}
    </header>
  );
}
