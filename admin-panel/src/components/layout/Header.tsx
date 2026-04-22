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

export function Header() {
  const { pathname } = useLocation();
  const user = getUser();
  const title = titles[pathname] ?? 'Admin';

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface-secondary px-6">
      <h1 className="text-sm font-medium text-text-primary">{title}</h1>
      {user && (
        <div className="flex items-center gap-2">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-active text-xs font-medium text-text-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm text-text-secondary">{user.name}</span>
        </div>
      )}
    </header>
  );
}
