import { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home as HouseIcon, Bot, MessageSquare, MoreHorizontal } from 'lucide-react';
import { Constants } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/**
 * [EXT] Phase H Navvia — Bottom tab bar mobile.
 *
 * Port direto do protótipo (linhas 508-513). Fixed bottom, grid 4 cols:
 *   Início → /home
 *   Agentes → /agents
 *   Chat   → /c/new (ou conversa ativa)
 *   Mais   → settings (placeholder por enquanto, dispara nav p/ menu)
 *
 * Background: surface-secondary com blur, border-top light.
 * Padding-bottom respeitando safe-area-inset.
 * .tab-btn.active aplica color-brand (CSS Phase A).
 *
 * Visibilidade controlada pela classe .mobile-only do CSS Phase A
 * (display none > 768px). Conteúdo da main recebe padding-bottom
 * de 64px em mobile via @media também na Phase A.
 */
type Tab = {
  id: string;
  label: string;
  Icon: typeof HouseIcon;
  onClick: () => void;
  isActive: (pathname: string) => boolean;
};

function MobileTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const localize = useLocalize();

  const tabs: Tab[] = [
    {
      id: 'home',
      label: localize('com_nav_home_init'),
      Icon: HouseIcon,
      onClick: () => navigate('/home'),
      isActive: (p) => p === '/home' || p.startsWith('/home/'),
    },
    {
      id: 'agents',
      label: localize('com_nav_agents'),
      Icon: Bot,
      onClick: () => navigate('/agents'),
      isActive: (p) => p === '/agents' || p.startsWith('/agents/'),
    },
    {
      id: 'chat',
      label: localize('com_nav_chat_mobile'),
      Icon: MessageSquare,
      onClick: () => navigate(`/c/${Constants.NEW_CONVO}`),
      isActive: (p) => p.startsWith('/c/'),
    },
    {
      id: 'more',
      label: localize('com_nav_more_mobile'),
      Icon: MoreHorizontal,
      onClick: () => navigate('/d/settings'),
      isActive: (p) => p.startsWith('/d/'),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[55] grid grid-cols-4 border-t border-border-light md:hidden"
      style={{
        paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
        backdropFilter: 'blur(8px)',
        background: 'color-mix(in srgb, var(--surface-secondary) 92%, transparent)',
      }}
      aria-label="Navegação principal"
    >
      {tabs.map(({ id, label, Icon, onClick, isActive }) => {
        const active = isActive(location.pathname);
        return (
          <button
            key={id}
            onClick={onClick}
            className={cn(
              'tab-btn flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
              active ? 'active text-brand' : 'text-text-tertiary',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export default memo(MobileTabs);
