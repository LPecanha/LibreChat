import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { Sparkles, Zap, FileText, Globe, Code, Mic } from 'lucide-react';
import { NavviaLogo } from '@librechat/client';
import { useAuthContext } from '~/hooks/AuthContext';
import { useLocalize } from '~/hooks';
import store from '~/store';

/**
 * [EXT] Home — dashboard inicial (opt-in via interface.home: 'dashboard').
 *
 * MVP: banner com saudação + capability tiles + atalho para Agents marketplace.
 * Composer-hero com FLIP animation entra na Fase 5.
 *
 * Layout: full-bleed banner (gradient Navvia) + container max-w-[1280px]
 * com tiles em grid responsivo.
 *
 * Tudo respeita feature flags via `useHasAccess` quando necessário; aqui
 * a entrada é só visual + navegação.
 */

type CapabilityTile = {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: typeof Zap;
  iconBg: string;
  iconFg: string;
};

const CAPABILITIES: CapabilityTile[] = [
  {
    id: 'chat',
    labelKey: 'com_ui_chat',
    descriptionKey: 'com_nav_home_tile_chat_desc',
    icon: Sparkles,
    iconBg: 'var(--brand-soft)',
    iconFg: 'var(--brand)',
  },
  {
    id: 'image',
    labelKey: 'com_nav_home_tile_image',
    descriptionKey: 'com_nav_home_tile_image_desc',
    icon: Zap,
    iconBg: 'rgba(236, 72, 153, 0.14)',
    iconFg: '#ec4899',
  },
  {
    id: 'document',
    labelKey: 'com_nav_home_tile_document',
    descriptionKey: 'com_nav_home_tile_document_desc',
    icon: FileText,
    iconBg: 'rgba(16, 185, 129, 0.14)',
    iconFg: '#10b981',
  },
  {
    id: 'web',
    labelKey: 'com_nav_home_tile_web',
    descriptionKey: 'com_nav_home_tile_web_desc',
    icon: Globe,
    iconBg: 'rgba(0, 180, 216, 0.14)',
    iconFg: '#00b4d8',
  },
  {
    id: 'code',
    labelKey: 'com_nav_home_tile_code',
    descriptionKey: 'com_nav_home_tile_code_desc',
    icon: Code,
    iconBg: 'rgba(124, 132, 232, 0.16)',
    iconFg: '#7c84e8',
  },
  {
    id: 'audio',
    labelKey: 'com_nav_home_tile_audio',
    descriptionKey: 'com_nav_home_tile_audio_desc',
    icon: Mic,
    iconBg: 'rgba(245, 158, 11, 0.14)',
    iconFg: '#f59e0b',
  },
];

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 5) return 'com_nav_home_greeting_night';
  if (h < 12) return 'com_nav_home_greeting_morning';
  if (h < 18) return 'com_nav_home_greeting_afternoon';
  return 'com_nav_home_greeting_evening';
}

function HomeView() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const userName = useRecoilValue(store.user)?.name ?? user?.name ?? '';
  const firstName = userName.split(' ')[0];

  const handleStartChat = () => navigate('/c/new');

  return (
    /* [EXT] Navvia: fade-in suave ao montar (transição entre rotas /home ↔ /c/new). */
    <div className="fade-in flex h-full w-full flex-col overflow-y-auto bg-surface-primary">
      {/* Banner full-bleed com gradient Navvia */}
      <section
        className="relative flex-shrink-0 overflow-hidden border-b border-border-light"
        style={{
          minHeight: 280,
          background:
            'radial-gradient(120% 130% at 0% 0%, var(--brand-soft), transparent 55%), ' +
            'radial-gradient(110% 120% at 100% 0%, rgba(0,212,255,0.07), transparent 55%), ' +
            'var(--surface-secondary)',
        }}
      >
        <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-col items-center px-8 py-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2">
            <NavviaLogo size="md" />
          </div>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-tight text-text-primary">
            {localize(getGreetingKey())}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
          <p className="mt-2.5 max-w-xl text-[15px] text-text-secondary">
            {localize('com_nav_home_subtitle')}
          </p>
          <button
            onClick={handleStartChat}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-brand px-5 text-[14px] font-semibold text-brand-fg shadow-md transition hover:opacity-90 active:scale-[0.97]"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {localize('com_nav_home_cta_start')}
          </button>
        </div>
      </section>

      {/* Capability tiles */}
      <section className="mx-auto w-full max-w-[1280px] px-8 py-10">
        <h2 className="mb-4 font-display text-[16px] font-semibold text-text-primary">
          {localize('com_nav_home_section_tools')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <button
                key={cap.id}
                onClick={handleStartChat}
                className="group flex flex-col items-start gap-2 rounded-md border border-border-light bg-surface-secondary p-4 text-left transition hover:-translate-y-0.5 hover:border-border-medium hover:shadow-lg"
              >
                <span
                  className="grid h-9 w-9 place-items-center rounded-md"
                  style={{ background: cap.iconBg, color: cap.iconFg }}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <span className="text-[14px] font-medium text-text-primary">
                  {localize(cap.labelKey)}
                </span>
                <span className="text-[12px] leading-snug text-text-tertiary">
                  {localize(cap.descriptionKey)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Atalho pro marketplace de Agents */}
        <div className="mt-8 flex items-center justify-between rounded-md border border-border-light bg-surface-secondary p-5">
          <div>
            <h3 className="font-display text-[15px] font-semibold text-text-primary">
              {localize('com_nav_home_agents_card_title')}
            </h3>
            <p className="mt-1 text-[13px] text-text-secondary">
              {localize('com_nav_home_agents_card_desc')}
            </p>
          </div>
          <Link
            to="/agents"
            className="ml-4 inline-flex h-9 items-center gap-1.5 rounded-md border border-border-medium px-4 text-[13px] font-medium text-text-primary transition hover:bg-surface-hover"
          >
            {localize('com_nav_home_agents_card_cta')}
          </Link>
        </div>
      </section>
    </div>
  );
}

export default memo(HomeView);
