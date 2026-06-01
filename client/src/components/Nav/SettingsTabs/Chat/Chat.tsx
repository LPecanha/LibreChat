import { memo } from 'react';
import { showThinkingAtom } from '~/store/showThinking';
import AdvancedPrompts from './AdvancedPrompts';
import FontSizeSelector from './FontSizeSelector';
import { ForkSettings } from './ForkSettings';
import ChatDirection from './ChatDirection';
import ToggleSwitch from '../ToggleSwitch';
import { SectionHeader, SectionLabel } from '../components';
import { useLocalize } from '~/hooks';
import store from '~/store';

const toggleSwitchConfigs = [
  {
    stateAtom: store.alwaysMakeProd,
    localizationKey: 'com_nav_always_make_prod' as const,
    switchId: 'alwaysMakeProd',
    hoverCardText: undefined,
    key: 'alwaysMakeProd',
  },
  {
    stateAtom: store.autoSendPrompts,
    localizationKey: 'com_nav_auto_send_prompts' as const,
    switchId: 'autoSendPrompts',
    hoverCardText: 'com_nav_auto_send_prompts_desc' as const,
    key: 'autoSendPrompts',
  },
  {
    stateAtom: store.enterToSend,
    localizationKey: 'com_nav_enter_to_send' as const,
    switchId: 'enterToSend',
    hoverCardText: 'com_nav_info_enter_to_send' as const,
    key: 'enterToSend',
  },
  {
    stateAtom: store.maximizeChatSpace,
    localizationKey: 'com_nav_maximize_chat_space' as const,
    switchId: 'maximizeChatSpace',
    hoverCardText: undefined,
    key: 'maximizeChatSpace',
  },
  {
    stateAtom: store.centerFormOnLanding,
    localizationKey: 'com_nav_center_chat_input' as const,
    switchId: 'centerFormOnLanding',
    hoverCardText: undefined,
    key: 'centerFormOnLanding',
  },
  {
    stateAtom: showThinkingAtom,
    localizationKey: 'com_nav_show_thinking' as const,
    switchId: 'showThinking',
    hoverCardText: undefined,
    key: 'showThinking',
  },
  {
    stateAtom: store.autoExpandTools,
    localizationKey: 'com_nav_auto_expand_tools' as const,
    switchId: 'autoExpandTools',
    hoverCardText: undefined,
    key: 'autoExpandTools',
  },
  {
    stateAtom: store.LaTeXParsing,
    localizationKey: 'com_nav_latex_parsing' as const,
    switchId: 'latexParsing',
    hoverCardText: 'com_nav_info_latex_parsing' as const,
    key: 'latexParsing',
  },
  {
    stateAtom: store.saveDrafts,
    localizationKey: 'com_nav_save_drafts' as const,
    switchId: 'saveDrafts',
    hoverCardText: 'com_nav_info_save_draft' as const,
    key: 'saveDrafts',
  },
  {
    stateAtom: store.showScrollButton,
    localizationKey: 'com_nav_scroll_button' as const,
    switchId: 'showScrollButton',
    hoverCardText: undefined,
    key: 'showScrollButton',
  },
  {
    stateAtom: store.saveBadgesState,
    localizationKey: 'com_nav_save_badges_state' as const,
    switchId: 'showBadges',
    hoverCardText: 'com_nav_info_save_badges_state' as const,
    key: 'showBadges',
  },
  {
    stateAtom: store.modularChat,
    localizationKey: 'com_nav_modular_chat' as const,
    switchId: 'modularChat',
    hoverCardText: undefined,
    key: 'modularChat',
  },
  {
    stateAtom: store.defaultTemporaryChat,
    localizationKey: 'com_nav_default_temporary_chat' as const,
    switchId: 'defaultTemporaryChat',
    hoverCardText: 'com_nav_info_default_temporary_chat' as const,
    key: 'defaultTemporaryChat',
  },
];

/* [EXT] Phase J.9 Navvia: ordem dos toggles segue a ordem do protótipo
 * (ui-preview.html#tab-chat). Display first (font, direction, layout
 * toggles), depois Envio (Enter, draft, modular), depois Fork. */
const DISPLAY_KEYS = new Set([
  'maximizeChatSpace',
  'centerFormOnLanding',
  'showScrollButton',
  'showThinking',
  'autoExpandTools',
  'latexParsing',
]);

const SEND_KEYS = new Set([
  'enterToSend',
  'autoSendPrompts',
  'saveDrafts',
  'showBadges',
  'modularChat',
  'defaultTemporaryChat',
  'alwaysMakeProd',
]);

function Chat() {
  const localize = useLocalize();
  const displayToggles = toggleSwitchConfigs.filter((c) => DISPLAY_KEYS.has(c.key));
  const sendToggles = toggleSwitchConfigs.filter((c) => SEND_KEYS.has(c.key));

  return (
    /* [EXT] Phase J.9 Navvia: layout dense do protótipo com seções:
     * "Exibição" / "Envio" / "Fork" — cada uma com SectionLabel. */
    <div className="flex flex-col gap-4 text-[13px] text-text-primary">
      <SectionHeader>{localize('com_nav_setting_chat')}</SectionHeader>

      <SectionLabel>{localize('com_nav_section_display')}</SectionLabel>
      <div className="flex flex-col gap-2.5">
        <div className="border-b border-border-light pb-2.5">
          <FontSizeSelector />
        </div>
        <div className="border-b border-border-light pb-2.5">
          <ChatDirection />
        </div>
        {displayToggles.map((config) => (
          <div key={config.key} className="border-b border-border-light pb-2.5">
            <ToggleSwitch
              stateAtom={config.stateAtom}
              localizationKey={config.localizationKey}
              hoverCardText={config.hoverCardText}
              switchId={config.switchId}
            />
          </div>
        ))}
      </div>

      <SectionLabel>{localize('com_nav_section_send')}</SectionLabel>
      <div className="flex flex-col gap-2.5">
        {sendToggles.map((config) => (
          <div key={config.key} className="border-b border-border-light pb-2.5">
            <ToggleSwitch
              stateAtom={config.stateAtom}
              localizationKey={config.localizationKey}
              hoverCardText={config.hoverCardText}
              switchId={config.switchId}
            />
          </div>
        ))}
        <div className="border-b border-border-light pb-2.5">
          <AdvancedPrompts />
        </div>
      </div>

      <SectionLabel>{localize('com_nav_section_fork')}</SectionLabel>
      <ForkSettings />
    </div>
  );
}

export default memo(Chat);
