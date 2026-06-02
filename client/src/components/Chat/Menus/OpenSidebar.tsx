import { startTransition } from 'react';
import { useRecoilState } from 'recoil';
import { TooltipAnchor, Button, Sidebar } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

export const CLOSE_SIDEBAR_ID = 'close-sidebar-button';
export const OPEN_SIDEBAR_ID = 'open-sidebar-button';

/**
 * [EXT] Phase J.18 Navvia: o hamburger / "open sidebar" agora alterna o
 * estado em vez de só abrir.
 *
 * Antes ele sempre dava `setSidebarExpanded(true)` — clicar com o sidebar
 * já aberto não fazia nada, e o usuário em mobile tinha que clicar no
 * backdrop pra fechar. Agora um clique no mesmo botão fecha o drawer.
 *
 * Também propaga `aria-expanded` corretamente (era hardcoded `false`).
 */
export default function OpenSidebar({ className }: { className?: string }) {
  const localize = useLocalize();
  const [sidebarExpanded, setSidebarExpanded] = useRecoilState(store.sidebarExpanded);

  const handleClick = () => {
    startTransition(() => {
      setSidebarExpanded((v) => !v);
    });
    /* Focus shift só quando estamos abrindo. Quando fechamos, deixamos
     * o foco no próprio botão (browser default). */
    if (!sidebarExpanded) {
      setTimeout(() => {
        document.getElementById(CLOSE_SIDEBAR_ID)?.focus();
      }, 250);
    }
  };

  const label = sidebarExpanded
    ? localize('com_nav_close_sidebar')
    : localize('com_nav_open_sidebar');

  return (
    <TooltipAnchor
      description={label}
      render={
        <Button
          id={OPEN_SIDEBAR_ID}
          size="icon"
          variant="outline"
          data-testid="open-sidebar-button"
          aria-label={label}
          aria-expanded={sidebarExpanded}
          aria-controls="chat-history-nav"
          className={cn(
            'rounded-xl bg-presentation duration-0 hover:bg-surface-active-alt',
            className,
          )}
          onClick={handleClick}
        >
          <Sidebar className="icon-md" aria-hidden="true" />
        </Button>
      }
    />
  );
}
