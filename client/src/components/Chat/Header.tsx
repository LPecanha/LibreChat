import { memo, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { useMediaQuery } from '@librechat/client';
import { getConfigDefaults, PermissionTypes, Permissions } from 'librechat-data-provider';
import ModelSelector from './Menus/Endpoints/ModelSelector';
import { useGetStartupConfig } from '~/data-provider';
import { useChatContext } from '~/Providers';
import ExportAndShareMenu from './ExportAndShareMenu';
import { OpenSidebar, PresetsMenu } from './Menus';
import BookmarkMenu from './Menus/BookmarkMenu';
import { TemporaryChat } from './TemporaryChat';
import AddMultiConvo from './AddMultiConvo';
import { useHasAccess, useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

/* [EXT] Phase J.15 Navvia: context badge inspirado em design/ui-preview.html
 * linha 797 (<span class="rounded border border-border-light px-1.5 py-0.5 text-[11px] text-text-tertiary">1M contexto</span>).
 * Lookup heurístico no nome do modelo OU do spec (model spec name pode não
 * conter "gpt"/"claude" textualmente). Quando nada bate, badge não aparece. */
const CONTEXT_WINDOWS: Array<[RegExp, string]> = [
  [/gpt-?5\.?5.*pro/i, '1M'],
  [/gpt-?5\.?5/i, '256k'],
  [/opus-?4/i, '500k'],
  [/sonnet-?4/i, '200k'],
  [/gemini-?3/i, '2M'],
  [/claude/i, '200k'],
  [/gpt-?4/i, '128k'],
];
function getContextLabel(...candidates: Array<string | undefined | null>): string | null {
  const joined = candidates.filter(Boolean).join(' ');
  if (!joined) return null;
  for (const [re, label] of CONTEXT_WINDOWS) {
    if (re.test(joined)) return label;
  }
  return null;
}

const defaultInterface = getConfigDefaults().interface;

function Header() {
  const { data: startupConfig } = useGetStartupConfig();
  const navVisible = useRecoilValue(store.sidebarExpanded);
  const { conversation } = useChatContext();
  const localize = useLocalize();
  const contextLabel = getContextLabel(
    conversation?.model,
    conversation?.spec,
    /* @ts-expect-error — spec.label nem sempre tipado */
    conversation?.modelLabel,
  );

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
            {contextLabel && (
              <span
                className="whitespace-nowrap rounded border border-border-light px-1.5 py-0.5 text-[11px] text-text-tertiary"
                title={localize('com_ui_context_window')}
              >
                {localize('com_ui_context_window_label', { 0: contextLabel })}
              </span>
            )}
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
