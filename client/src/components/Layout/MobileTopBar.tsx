import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { Menu, Plus } from 'lucide-react';
import { NavviaLogo } from '@librechat/client';
import { Constants } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import store from '~/store';

/**
 * [EXT] Phase H Navvia — MobileTopBar.
 *
 * Port direto do protótipo (design/ui-preview.html linhas 500-504).
 * Fixed top, 52px, com 3 zonas:
 *   esquerda: menu hamburger (abre drawer/sidebar)
 *   centro:   NavviaLogo (clique vai pra /home)
 *   direita:  botão "Nova conversa"
 *
 * Visibilidade: classe .mobile-only do CSS (Phase A) já define
 * display: none em desktop e display: flex em <= 768px. Não precisa
 * de useMediaQuery aqui — economiza render.
 *
 * O conteúdo da main em mobile recebe padding-top: 52px via
 * @media (max-width: 768px) também no CSS Phase A.
 */
function MobileTopBar() {
  const navigate = useNavigate();
  const localize = useLocalize();
  const setSidebarExpanded = useSetRecoilState(store.sidebarExpanded);

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[60] flex items-center gap-2 border-b border-border-light px-3 md:hidden"
      style={{
        height: 52,
        backdropFilter: 'blur(8px)',
        background: 'color-mix(in srgb, var(--surface-secondary) 92%, transparent)',
      }}
    >
      <button
        onClick={() => setSidebarExpanded(true)}
        className="grid h-8 w-8 place-items-center rounded-md text-text-primary hover:bg-surface-hover"
        title={localize('com_nav_open_sidebar')}
        aria-label={localize('com_nav_open_sidebar')}
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </button>

      <button
        onClick={() => navigate('/home')}
        className="-ml-0.5 inline-flex items-center"
        aria-label={`Navvia — ${localize('com_nav_home_init')}`}
      >
        <NavviaLogo size="sm" />
      </button>

      <button
        onClick={() => navigate(`/c/${Constants.NEW_CONVO}`)}
        className="ml-auto grid h-8 w-8 place-items-center rounded-md border border-border-medium text-text-primary hover:bg-surface-hover"
        title={localize('com_ui_new_chat')}
        aria-label={localize('com_ui_new_chat')}
      >
        <Plus className="h-[16px] w-[16px]" strokeWidth={2} />
      </button>
    </div>
  );
}

export default memo(MobileTopBar);
