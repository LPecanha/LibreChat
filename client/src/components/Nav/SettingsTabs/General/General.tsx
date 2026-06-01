import React, { useContext, useCallback, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useRecoilState } from 'recoil';
import { Dropdown, ThemeContext } from '@librechat/client';
import ArchivedChats from './ArchivedChats';
import ToggleSwitch from '../ToggleSwitch';
import { Row, Segment, SectionHeader } from '../components';
import { useLocalize } from '~/hooks';
import store from '~/store';

/* [EXT] Phase G.2 Navvia: chave localStorage para densidade. */
const DENSITY_KEY = 'navvia:density';
const DEFAULT_DENSITY = 'cozy';

const toggleSwitchConfigs = [
  {
    stateAtom: store.enableUserMsgMarkdown,
    localizationKey: 'com_nav_user_msg_markdown' as const,
    switchId: 'enableUserMsgMarkdown',
    hoverCardText: undefined,
    key: 'enableUserMsgMarkdown',
  },
  {
    stateAtom: store.autoScroll,
    localizationKey: 'com_nav_auto_scroll' as const,
    switchId: 'autoScroll',
    hoverCardText: undefined,
    key: 'autoScroll',
  },
  {
    stateAtom: store.keepScreenAwake,
    localizationKey: 'com_nav_keep_screen_awake' as const,
    switchId: 'keepScreenAwake',
    hoverCardText: undefined,
    key: 'keepScreenAwake',
  },
  {
    stateAtom: store.newChatSwitchToHistory,
    localizationKey: 'com_nav_new_chat_switch_to_history' as const,
    switchId: 'newChatSwitchToHistory',
    hoverCardText: undefined,
    key: 'newChatSwitchToHistory',
  },
];

export const ThemeSelector = ({
  theme,
  onChange,
}: {
  theme: string;
  onChange: (value: string) => void;
  portal?: boolean;
}) => {
  const localize = useLocalize();
  const options = [
    { value: 'system', label: localize('com_nav_theme_system') },
    { value: 'dark', label: localize('com_nav_theme_dark') },
    { value: 'light', label: localize('com_nav_theme_light') },
  ];
  return (
    <Row label={localize('com_nav_theme')}>
      <Segment value={theme} onChange={onChange} options={options} ariaLabel="theme" />
    </Row>
  );
};

/* [EXT] Phase G.2 Navvia — Density selector
 * Aplica data-density no <body> via useEffect. Os tokens (--row-h, --ui-font,
 * --msg-font, --radius) estão definidos em style.css Phase A:
 *   compact:     row 28 / ui 12.5 / msg 14 / radius 6
 *   cozy:        row 32 / ui 13   / msg 15 / radius 7 (default)
 *   comfortable: row 38 / ui 14   / msg 16 / radius 8
 *
 * Persiste em localStorage. Lê no mount para restaurar preferência. */
export const DensitySelector = ({
  density,
  onChange,
}: {
  density: string;
  onChange: (value: string) => void;
  portal?: boolean;
}) => {
  const localize = useLocalize();
  const options = [
    { value: 'compact', label: localize('com_nav_density_compact') },
    { value: 'cozy', label: localize('com_nav_density_cozy') },
    { value: 'comfortable', label: localize('com_nav_density_comfortable') },
  ];
  return (
    <Row
      label={localize('com_nav_density')}
      description={localize('com_nav_density_desc')}
    >
      <Segment value={density} onChange={onChange} options={options} ariaLabel="density" />
    </Row>
  );
};

export const LangSelector = ({
  langcode,
  onChange,
  portal = true,
}: {
  langcode: string;
  onChange: (value: string) => void;
  portal?: boolean;
}) => {
  const localize = useLocalize();

  const languageOptions = [
    { value: 'auto', label: localize('com_nav_lang_auto') },
    { value: 'en-US', label: localize('com_nav_lang_english') },
    { value: 'zh-Hans', label: localize('com_nav_lang_chinese') },
    { value: 'zh-Hant', label: localize('com_nav_lang_traditional_chinese') },
    { value: 'ar-EG', label: localize('com_nav_lang_arabic') },
    { value: 'bs', label: localize('com_nav_lang_bosnian') },
    { value: 'da-DK', label: localize('com_nav_lang_danish') },
    { value: 'de-DE', label: localize('com_nav_lang_german') },
    { value: 'es-ES', label: localize('com_nav_lang_spanish') },
    { value: 'ca-ES', label: localize('com_nav_lang_catalan') },
    { value: 'et-EE', label: localize('com_nav_lang_estonian') },
    { value: 'fa-IR', label: localize('com_nav_lang_persian') },
    { value: 'fr-FR', label: localize('com_nav_lang_french') },
    { value: 'he-HE', label: localize('com_nav_lang_hebrew') },
    { value: 'hu-HU', label: localize('com_nav_lang_hungarian') },
    { value: 'hy-AM', label: localize('com_nav_lang_armenian') },
    { value: 'is', label: localize('com_nav_lang_icelandic') },
    { value: 'it-IT', label: localize('com_nav_lang_italian') },
    { value: 'nb', label: localize('com_nav_lang_norwegian_bokmal') },
    { value: 'nn', label: localize('com_nav_lang_norwegian_nynorsk') },
    { value: 'pl-PL', label: localize('com_nav_lang_polish') },
    { value: 'pt-BR', label: localize('com_nav_lang_brazilian_portuguese') },
    { value: 'pt-PT', label: localize('com_nav_lang_portuguese') },
    { value: 'ru-RU', label: localize('com_nav_lang_russian') },
    { value: 'sk', label: localize('com_nav_lang_slovak') },
    { value: 'ja-JP', label: localize('com_nav_lang_japanese') },
    { value: 'ka-GE', label: localize('com_nav_lang_georgian') },
    { value: 'cs-CZ', label: localize('com_nav_lang_czech') },
    { value: 'sv-SE', label: localize('com_nav_lang_swedish') },
    { value: 'ko-KR', label: localize('com_nav_lang_korean') },
    { value: 'lt-LT', label: localize('com_nav_lang_lithuanian') },
    { value: 'lv-LV', label: localize('com_nav_lang_latvian') },
    { value: 'vi-VN', label: localize('com_nav_lang_vietnamese') },
    { value: 'th-TH', label: localize('com_nav_lang_thai') },
    { value: 'tr-TR', label: localize('com_nav_lang_turkish') },
    { value: 'ug', label: localize('com_nav_lang_uyghur') },
    { value: 'nl-NL', label: localize('com_nav_lang_dutch') },
    { value: 'id-ID', label: localize('com_nav_lang_indonesia') },
    { value: 'fi-FI', label: localize('com_nav_lang_finnish') },
    { value: 'sl', label: localize('com_nav_lang_slovenian') },
    { value: 'bo', label: localize('com_nav_lang_tibetan') },
    { value: 'uk-UA', label: localize('com_nav_lang_ukrainian') },
  ];

  return (
    <Row label={localize('com_nav_language')}>
      <Dropdown
        value={langcode}
        onChange={onChange}
        sizeClasses="[--anchor-max-height:256px] max-h-[60vh] w-[180px]"
        options={languageOptions}
        className="z-50"
        aria-label={localize('com_nav_language')}
        portal={portal}
      />
    </Row>
  );
};

function General() {
  const localize = useLocalize();
  const { theme, setTheme } = useContext(ThemeContext);

  const [langcode, setLangcode] = useRecoilState(store.lang);

  /* [EXT] Phase G.2 Navvia: state da densidade lê localStorage no mount
   * e aplica data-density no <body>. Persiste em mudanças. */
  const [density, setDensity] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_DENSITY;
    return localStorage.getItem(DENSITY_KEY) ?? DEFAULT_DENSITY;
  });

  useEffect(() => {
    document.body.setAttribute('data-density', density);
    localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  const changeDensity = useCallback((value: string) => setDensity(value), []);

  const changeTheme = useCallback(
    (value: string) => {
      setTheme(value);
    },
    [setTheme],
  );

  const changeLang = useCallback(
    (value: string) => {
      let userLang = value;
      if (value === 'auto') {
        userLang = navigator.language || navigator.languages[0];
      }

      requestAnimationFrame(() => {
        document.documentElement.lang = userLang;
      });
      setLangcode(userLang);
      Cookies.set('lang', userLang, { expires: 365 });
    },
    [setLangcode],
  );

  return (
    /* [EXT] Phase J.9 Navvia: layout dense do protótipo (ui-preview.html#tab-geral).
     * SectionHeader + rows com border-b. Cada Row contém label/control alinhados. */
    <div className="flex flex-col gap-3 text-[13px] text-text-primary">
      <SectionHeader>{localize('com_nav_setting_general')}</SectionHeader>
      <ThemeSelector theme={theme} onChange={changeTheme} />
      <DensitySelector density={density} onChange={changeDensity} />
      <LangSelector langcode={langcode} onChange={changeLang} />
      {toggleSwitchConfigs.map((config) => (
        <div key={config.key} className="border-b border-border-light pb-2.5">
          <ToggleSwitch
            stateAtom={config.stateAtom}
            localizationKey={config.localizationKey}
            hoverCardText={config.hoverCardText}
            switchId={config.switchId}
          />
        </div>
      ))}
      <ArchivedChats />
    </div>
  );
}

export default React.memo(General);
