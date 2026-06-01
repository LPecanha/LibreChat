import React, { useState, useRef } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { SettingsTabValues } from 'librechat-data-provider';
import { MessageSquare, Command, DollarSign } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import {
  GearIcon,
  DataIcon,
  UserIcon,
  SpeechIcon,
  useMediaQuery,
  PersonalizationIcon,
} from '@librechat/client';
import type { TDialogProps } from '~/common';
import {
  General,
  Chat,
  Commands,
  Speech,
  Personalization,
  Data,
  Balance,
  Account,
} from './SettingsTabs';
import usePersonalizationAccess from '~/hooks/usePersonalizationAccess';
import { useLocalize, TranslationKeys } from '~/hooks';
import { useGetStartupConfig } from '~/data-provider';
import { cn } from '~/utils';

export default function Settings({ open, onOpenChange }: TDialogProps) {
  const isSmallScreen = useMediaQuery('(max-width: 767px)');
  const { data: startupConfig } = useGetStartupConfig();
  const localize = useLocalize();
  const [activeTab, setActiveTab] = useState(SettingsTabValues.GENERAL);
  const tabRefs = useRef({});
  const { hasAnyPersonalizationFeature, hasMemoryOptOut } = usePersonalizationAccess();

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const tabs: SettingsTabValues[] = [
      SettingsTabValues.GENERAL,
      SettingsTabValues.CHAT,
      SettingsTabValues.COMMANDS,
      SettingsTabValues.SPEECH,
      ...(hasAnyPersonalizationFeature ? [SettingsTabValues.PERSONALIZATION] : []),
      SettingsTabValues.DATA,
      ...(startupConfig?.balance?.enabled ? [SettingsTabValues.BALANCE] : []),
      SettingsTabValues.ACCOUNT,
    ];
    const currentIndex = tabs.indexOf(activeTab);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveTab(tabs[(currentIndex + 1) % tabs.length]);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length]);
        break;
      case 'Home':
        event.preventDefault();
        setActiveTab(tabs[0]);
        break;
      case 'End':
        event.preventDefault();
        setActiveTab(tabs[tabs.length - 1]);
        break;
    }
  };

  const settingsTabs: {
    value: SettingsTabValues;
    icon: React.JSX.Element;
    label: TranslationKeys;
  }[] = [
    {
      value: SettingsTabValues.GENERAL,
      icon: <GearIcon />,
      label: 'com_nav_setting_general',
    },
    {
      value: SettingsTabValues.CHAT,
      icon: <MessageSquare className="icon-sm" aria-hidden="true" />,
      label: 'com_nav_setting_chat',
    },
    {
      value: SettingsTabValues.COMMANDS,
      icon: <Command className="icon-sm" aria-hidden="true" />,
      label: 'com_nav_commands',
    },
    {
      value: SettingsTabValues.SPEECH,
      icon: <SpeechIcon className="icon-sm" aria-hidden="true" />,
      label: 'com_nav_setting_speech',
    },
    ...(hasAnyPersonalizationFeature
      ? [
          {
            value: SettingsTabValues.PERSONALIZATION,
            icon: <PersonalizationIcon />,
            label: 'com_nav_setting_personalization' as TranslationKeys,
          },
        ]
      : []),
    {
      value: SettingsTabValues.DATA,
      icon: <DataIcon />,
      label: 'com_nav_setting_data',
    },
    ...(startupConfig?.balance?.enabled
      ? [
          {
            value: SettingsTabValues.BALANCE,
            icon: <DollarSign size={18} />,
            label: 'com_nav_setting_balance' as TranslationKeys,
          },
        ]
      : ([] as { value: SettingsTabValues; icon: React.JSX.Element; label: TranslationKeys }[])),
    {
      value: SettingsTabValues.ACCOUNT,
      icon: <UserIcon />,
      label: 'com_nav_setting_account',
    },
  ];

  const handleTabChange = (value: string) => {
    setActiveTab(value as SettingsTabValues);
  };

  return (
    <Transition appear show={open}>
      <Dialog as="div" className="relative z-50" onClose={onOpenChange}>
        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/* [EXT] Phase G.4 Navvia: backdrop com blur + opacity unified */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className={cn('fixed inset-0 flex w-screen items-center justify-center p-4')}>
            {/* [EXT] Phase J.9 Navvia: layout do protótipo (design/ui-preview.html linha 1217+).
             *  - 860×640 (vs 680px upstream)
             *  - Sidebar 210px com header "Configurações" + tabs
             *  - Botão X absolute no canto superior direito (vs "Fechar" textual)
             *  - Content right-pane: text-[13px], rows com border-b */}
            <DialogPanel
              className={cn(
                'relative overflow-hidden rounded-xl border border-border-light bg-surface-overlay shadow-2xl backdrop-blur-2xl animate-in',
                'flex w-full max-w-[860px]',
                isSmallScreen ? 'h-[92vh] flex-col' : 'h-[640px] flex-row',
              )}
            >
              <DialogTitle as="div" className="sr-only">
                {localize('com_nav_settings')}
              </DialogTitle>

              {/* Close button — sempre no canto superior direito */}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-brand"
                aria-label={localize('com_ui_close_settings')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" x2="6" y1="6" y2="18" />
                  <line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>

              <Tabs.Root
                value={activeTab}
                onValueChange={handleTabChange}
                orientation="vertical"
                className={cn('flex h-full w-full', isSmallScreen ? 'flex-col' : 'flex-row')}
              >
                {/* Sidebar esquerda (210px) — header + tabs */}
                <aside
                  className={cn(
                    'flex',
                    isSmallScreen
                      ? 'w-full flex-row overflow-x-auto border-b border-border-light bg-surface-secondary p-2'
                      : 'h-full w-[210px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border-light bg-surface-secondary p-2',
                  )}
                >
                  {!isSmallScreen && (
                    <div className="px-2 py-2 font-display text-[14px] font-semibold text-text-primary">
                      {localize('com_nav_settings')}
                    </div>
                  )}
                  <Tabs.List
                    aria-label="Settings"
                    className={cn('flex', isSmallScreen ? 'flex-row gap-1' : 'flex-col gap-0.5')}
                    onKeyDown={handleKeyDown}
                  >
                    {settingsTabs.map(({ value, icon, label }) => (
                      <Tabs.Trigger
                        key={value}
                        /* [EXT] Phase J.9 Navvia: tabbtn estilo .menu-item — gap-2 px-2.5 py-1.5,
                         *  bg-surface-active na ativa (vs bg-brand-soft que era forte demais). */
                        className={cn(
                          'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-text-secondary transition-colors',
                          'hover:bg-surface-hover',
                          'radix-state-active:bg-surface-active radix-state-active:text-text-primary',
                          isSmallScreen ? 'shrink-0 text-nowrap' : 'justify-start',
                        )}
                        value={value}
                        ref={(el) => (tabRefs.current[value] = el)}
                      >
                        {icon}
                        {localize(label)}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>
                </aside>

                {/* Content pane direito */}
                <div className="flex-1 overflow-y-auto p-5 text-[13px]">
                  <Tabs.Content value={SettingsTabValues.GENERAL} tabIndex={-1}>
                    <General />
                  </Tabs.Content>
                  <Tabs.Content value={SettingsTabValues.CHAT} tabIndex={-1}>
                    <Chat />
                  </Tabs.Content>
                  <Tabs.Content value={SettingsTabValues.COMMANDS} tabIndex={-1}>
                    <Commands />
                  </Tabs.Content>
                  <Tabs.Content value={SettingsTabValues.SPEECH} tabIndex={-1}>
                    <Speech />
                  </Tabs.Content>
                  {hasAnyPersonalizationFeature && (
                    <Tabs.Content value={SettingsTabValues.PERSONALIZATION} tabIndex={-1}>
                      <Personalization
                        hasMemoryOptOut={hasMemoryOptOut}
                        hasAnyPersonalizationFeature={hasAnyPersonalizationFeature}
                      />
                    </Tabs.Content>
                  )}
                  <Tabs.Content value={SettingsTabValues.DATA} tabIndex={-1}>
                    <Data />
                  </Tabs.Content>
                  {startupConfig?.balance?.enabled && (
                    <Tabs.Content value={SettingsTabValues.BALANCE} tabIndex={-1}>
                      <Balance />
                    </Tabs.Content>
                  )}
                  <Tabs.Content value={SettingsTabValues.ACCOUNT} tabIndex={-1}>
                    <Account />
                  </Tabs.Content>
                </div>
              </Tabs.Root>
            </DialogPanel>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
