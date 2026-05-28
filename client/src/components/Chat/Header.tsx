import { memo, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { useMediaQuery } from '@librechat/client';
import { getConfigDefaults, PermissionTypes, Permissions } from 'librechat-data-provider';
import ModelSelector from './Menus/Endpoints/ModelSelector';
import { useGetStartupConfig } from '~/data-provider';
import ExportAndShareMenu from './ExportAndShareMenu';
import { OpenSidebar, PresetsMenu } from './Menus';
import BookmarkMenu from './Menus/BookmarkMenu';
import { TemporaryChat } from './TemporaryChat';
import AddMultiConvo from './AddMultiConvo';
import { useHasAccess } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

const defaultInterface = getConfigDefaults().interface;

function Header() {
  const { data: startupConfig } = useGetStartupConfig();
  const navVisible = useRecoilValue(store.sidebarExpanded);

  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });

  const hasAccessToMultiConvo = useHasAccess({
    permissionType: PermissionTypes.MULTI_CONVO,
    permission: Permissions.USE,
  });

  const hasAccessToTemporaryChat = useHasAccess({
    permissionType: PermissionTypes.TEMPORARY_CHAT,
    permission: Permissions.USE,
  });

  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  return (
    /* [EXT] Phase D.2 Navvia — port do header do protótipo (linha 779-805):
     * relative + border-b (sem gradient overlay), altura h-12, font-medium
     * (não font-semibold), padding px-3, layout: model picker à esquerda,
     * ações à direita via ml-auto. Wrapper bg-surface-chat pra não vazar
     * gradient antigo sobre o body. */
    <header className="relative z-10 flex h-12 w-full shrink-0 items-center gap-1.5 border-b border-border-light bg-surface-chat px-3 text-text-primary">
      <div className="mx-1 flex items-center gap-1.5">
        <OpenSidebar className="md:hidden" />
        {!(navVisible && isSmallScreen) && (
          <div
            className={cn(
              'flex items-center gap-1.5',
              !isSmallScreen ? 'transition-all duration-200 ease-in-out' : '',
            )}
          >
            <ModelSelector startupConfig={startupConfig} />
            {interfaceConfig.presets === true && interfaceConfig.modelSelect && <PresetsMenu />}
            {hasAccessToBookmarks === true && <BookmarkMenu />}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        {hasAccessToMultiConvo === true && <AddMultiConvo />}
        {hasAccessToTemporaryChat === true && <TemporaryChat />}
        <ExportAndShareMenu isSharedButtonEnabled={startupConfig?.sharedLinksEnabled ?? false} />
      </div>
    </header>
  );
}

const MemoizedHeader = memo(Header);
MemoizedHeader.displayName = 'Header';

export default MemoizedHeader;
