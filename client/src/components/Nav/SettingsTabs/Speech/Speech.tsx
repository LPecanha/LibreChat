import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useOnClickOutside } from '@librechat/client';
import { useGetCustomConfigSpeechQuery } from 'librechat-data-provider/react-query';
import {
  CloudBrowserVoicesSwitch,
  AutomaticPlaybackSwitch,
  TextToSpeechSwitch,
  EngineTTSDropdown,
  CacheTTSSwitch,
  VoiceDropdown,
  PlaybackRate,
} from './TTS';
import {
  AutoTranscribeAudioSwitch,
  LanguageSTTDropdown,
  SpeechToTextSwitch,
  AutoSendTextSelector,
  EngineSTTDropdown,
  DecibelSelector,
} from './STT';
import ConversationModeSwitch from './ConversationModeSwitch';
import { SectionHeader, SectionLabel, Segment } from '../components';
import { useLocalize } from '~/hooks';
import store from '~/store';

function Speech() {
  const localize = useLocalize();

  const [confirmClear, setConfirmClear] = useState(false);
  const { data } = useGetCustomConfigSpeechQuery();

  const [sttExternal, setSttExternal] = useState(false);
  const [ttsExternal, setTtsExternal] = useState(false);
  const [advancedMode, setAdvancedMode] = useRecoilState(store.advancedMode);
  const [autoTranscribeAudio, setAutoTranscribeAudio] = useRecoilState(store.autoTranscribeAudio);
  const [conversationMode, setConversationMode] = useRecoilState(store.conversationMode);
  const [speechToText, setSpeechToText] = useRecoilState(store.speechToText);
  const [textToSpeech, setTextToSpeech] = useRecoilState(store.textToSpeech);
  const [cacheTTS, setCacheTTS] = useRecoilState(store.cacheTTS);
  const [engineSTT, setEngineSTT] = useRecoilState<string>(store.engineSTT);
  const [languageSTT, setLanguageSTT] = useRecoilState<string>(store.languageSTT);
  const [decibelValue, setDecibelValue] = useRecoilState(store.decibelValue);
  const [autoSendText, setAutoSendText] = useRecoilState(store.autoSendText);
  const [engineTTS, setEngineTTS] = useRecoilState<string>(store.engineTTS);
  const [voice, setVoice] = useRecoilState(store.voice);
  const [cloudBrowserVoices, setCloudBrowserVoices] = useRecoilState<boolean>(
    store.cloudBrowserVoices,
  );
  const [languageTTS, setLanguageTTS] = useRecoilState<string>(store.languageTTS);
  const [automaticPlayback, setAutomaticPlayback] = useRecoilState(store.automaticPlayback);
  const [playbackRate, setPlaybackRate] = useRecoilState(store.playbackRate);

  const updateSetting = useCallback(
    (key: string, newValue: string | number) => {
      const settings = {
        sttExternal: { value: sttExternal, setFunc: setSttExternal },
        ttsExternal: { value: ttsExternal, setFunc: setTtsExternal },
        conversationMode: { value: conversationMode, setFunc: setConversationMode },
        advancedMode: { value: advancedMode, setFunc: setAdvancedMode },
        speechToText: { value: speechToText, setFunc: setSpeechToText },
        textToSpeech: { value: textToSpeech, setFunc: setTextToSpeech },
        cacheTTS: { value: cacheTTS, setFunc: setCacheTTS },
        engineSTT: { value: engineSTT, setFunc: setEngineSTT },
        languageSTT: { value: languageSTT, setFunc: setLanguageSTT },
        autoTranscribeAudio: { value: autoTranscribeAudio, setFunc: setAutoTranscribeAudio },
        decibelValue: { value: decibelValue, setFunc: setDecibelValue },
        autoSendText: { value: autoSendText, setFunc: setAutoSendText },
        engineTTS: { value: engineTTS, setFunc: setEngineTTS },
        voice: { value: voice, setFunc: setVoice },
        cloudBrowserVoices: { value: cloudBrowserVoices, setFunc: setCloudBrowserVoices },
        languageTTS: { value: languageTTS, setFunc: setLanguageTTS },
        automaticPlayback: { value: automaticPlayback, setFunc: setAutomaticPlayback },
        playbackRate: { value: playbackRate, setFunc: setPlaybackRate },
      };

      const setting = settings[key];
      if (setting) {
        setting.setFunc(newValue);
      }
    },
    [
      sttExternal,
      ttsExternal,
      conversationMode,
      advancedMode,
      speechToText,
      textToSpeech,
      cacheTTS,
      engineSTT,
      languageSTT,
      autoTranscribeAudio,
      decibelValue,
      autoSendText,
      engineTTS,
      voice,
      cloudBrowserVoices,
      languageTTS,
      automaticPlayback,
      playbackRate,
      setSttExternal,
      setTtsExternal,
      setConversationMode,
      setAdvancedMode,
      setSpeechToText,
      setTextToSpeech,
      setCacheTTS,
      setEngineSTT,
      setLanguageSTT,
      setAutoTranscribeAudio,
      setDecibelValue,
      setAutoSendText,
      setEngineTTS,
      setVoice,
      setCloudBrowserVoices,
      setLanguageTTS,
      setAutomaticPlayback,
      setPlaybackRate,
    ],
  );

  useEffect(() => {
    if (data && data.message !== 'not_found') {
      Object.entries(data).forEach(([key, value]) => {
        // Only apply config values as defaults if no user preference exists in localStorage
        const existingValue = localStorage.getItem(key);
        if (existingValue === null && key !== 'sttExternal' && key !== 'ttsExternal') {
          updateSetting(key, value);
        } else if (key === 'sttExternal' || key === 'ttsExternal') {
          updateSetting(key, value);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Reset engineTTS if it is set to a removed/invalid value (e.g., 'edge')
  // TODO: remove this once the 'edge' engine is fully deprecated
  useEffect(() => {
    const validEngines = ['browser', 'external'];
    if (!validEngines.includes(engineTTS)) {
      setEngineTTS('browser');
    }
  }, [engineTTS, setEngineTTS]);

  const contentRef = useRef(null);
  useOnClickOutside(contentRef, () => confirmClear && setConfirmClear(false), []);

  return (
    /* [EXT] Phase J.9 Navvia: layout dense do protótipo (ui-preview.html#tab-voz).
     * Header com Simples/Avançado em segment + seções STT/TTS. */
    <div className="flex flex-col gap-4 text-[13px] text-text-primary">
      <div className="flex items-center justify-between">
        <SectionHeader>{localize('com_nav_setting_speech')}</SectionHeader>
        <Segment
          value={advancedMode ? 'advanced' : 'simple'}
          onChange={(v) => setAdvancedMode(v === 'advanced')}
          options={[
            { value: 'simple', label: localize('com_ui_simple') },
            { value: 'advanced', label: localize('com_ui_advanced') },
          ]}
          ariaLabel="speech-mode"
        />
      </div>

      {advancedMode && (
        <div className="border-b border-border-light pb-2.5">
          <ConversationModeSwitch />
        </div>
      )}

      <SectionLabel>{localize('com_nav_section_stt')}</SectionLabel>
      <div className="flex flex-col gap-2.5">
        <div className="border-b border-border-light pb-2.5">
          <SpeechToTextSwitch />
        </div>
        <div className="border-b border-border-light pb-2.5">
          <EngineSTTDropdown external={sttExternal} />
        </div>
        <div className="border-b border-border-light pb-2.5">
          <LanguageSTTDropdown />
        </div>
        {advancedMode && (
          <>
            <div className="border-b border-border-light pb-2.5">
              <AutoTranscribeAudioSwitch />
            </div>
            {autoTranscribeAudio && (
              <div className="border-b border-border-light pb-2.5">
                <DecibelSelector />
              </div>
            )}
            <div className="border-b border-border-light pb-2.5">
              <AutoSendTextSelector />
            </div>
          </>
        )}
      </div>

      <SectionLabel>{localize('com_nav_section_tts')}</SectionLabel>
      <div className="flex flex-col gap-2.5">
        <div className="border-b border-border-light pb-2.5">
          <TextToSpeechSwitch />
        </div>
        <div className="border-b border-border-light pb-2.5">
          <EngineTTSDropdown external={ttsExternal} />
        </div>
        <div className="border-b border-border-light pb-2.5">
          <VoiceDropdown />
        </div>
        {advancedMode && (
          <>
            <div className="border-b border-border-light pb-2.5">
              <AutomaticPlaybackSwitch />
            </div>
            {engineTTS === 'browser' && (
              <div className="border-b border-border-light pb-2.5">
                <CloudBrowserVoicesSwitch />
              </div>
            )}
            <div className="border-b border-border-light pb-2.5">
              <PlaybackRate />
            </div>
            <div className="border-b border-border-light pb-2.5">
              <CacheTTSSwitch />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default React.memo(Speech);
