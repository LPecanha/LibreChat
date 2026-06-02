import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { useMediaQuery, NavviaLogo } from '@librechat/client';
import { Constants } from 'librechat-data-provider';
import {
  Home as House,
  Bot,
  Plus,
  Search,
  Sparkles,
  FolderOpen,
  BookmarkIcon,
  Brain,
  Server,
  Wand2,
  ChevronLeft,
  ChevronDown,
  Settings as SettingsIcon,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import type { TConversation } from 'librechat-data-provider';
import { useConversationsInfiniteQuery } from '~/data-provider';
import { useGetUserBalance } from '~/data-provider/Misc/queries';
import { useAuthContext, useLocalize } from '~/hooks';
import { groupConversationsByDate } from '~/utils/convos';
import { useGetStartupConfig } from '~/data-provider';
import Settings from '~/components/Nav/Settings';
import { formatUsdBalance } from '~/components/Nav/BuyCredits/ExtBalanceDisplay';
import { cn } from '~/utils';
import store from '~/store';

const TRANSITION_MS = 300;
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * [EXT] NavviaSidebar — port direto de design/ui-preview.html linhas 542-613.
 *
 * Estrutura:
 *   <aside class="sidebar-main"> 280px desktop, drawer 86vw mobile
 *     ├─ sidebar-collapse button (hover edge, estilo Linear)
 *     ├─ sidebar-brand (NavviaLogo à esquerda, padding 14px)
 *     ├─ flex flex-col gap-2 px-3 pt-2
 *     │    ├─ cta-new (gradient border + ⌘K kbd)
 *     │    └─ search-pill
 *     ├─ nav px-3 pt-3
 *     │    ├─ navitem Início (active = /home)
 *     │    └─ navitem Agentes
 *     ├─ flex-1 overflow-y-auto px-3 pb-2 (scroll area)
 *     │    ├─ sec-label Conversas
 *     │    └─ lista agrupada por dia (Hoje, Ontem, Últimos 7 dias, ...)
 *     │    ├─ sec-label Biblioteca
 *     │    └─ 6 lib-items coloridos (Agentes, Prompts, Skills, Arquivos,
 *     │      Memórias, Bookmarks, MCP)
 *     └─ border-t border-border-light p-3
 *          ├─ credits-card (gradient border)
 *          └─ account-row (avatar gradient + nome + email + chevron)
 */
function NavviaSidebar() {
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  const [expanded, setExpanded] = useRecoilState(store.sidebarExpanded);
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const localize = useLocalize();
  const { data: startupConfig } = useGetStartupConfig();
  const { data: balanceData } = useGetUserBalance({
    enabled: !!startupConfig?.balance?.enabled,
  });

  const [search, setSearch] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  /* [EXT] Navvia: Settings é um <Dialog> controlado (Nav/Settings.tsx), não
   * uma rota. Antes navegávamos para /d/settings (rota inexistente) e o
   * Outlet caía em fallback. */
  const [settingsOpen, setSettingsOpen] = useState(false);

  const conversationsParams = useMemo(
    () => ({ isArchived: false, sortBy: 'updatedAt' as const, sortDirection: 'desc' as const }),
    [],
  );
  const { data: convosData } = useConversationsInfiniteQuery(conversationsParams);

  const conversations = useMemo<TConversation[]>(() => {
    if (!convosData?.pages) return [];
    return convosData.pages.flatMap((p) => p.conversations).filter(Boolean) as TConversation[];
  }, [convosData]);

  const grouped = useMemo(() => {
    const filtered = search
      ? conversations.filter((c) =>
          (c.title || '').toLowerCase().includes(search.toLowerCase()),
        )
      : conversations;
    return groupConversationsByDate(filtered);
  }, [conversations, search]);

  const isActiveRoute = useCallback(
    (path: string): boolean => location.pathname === path || location.pathname.startsWith(path + '/'),
    [location.pathname],
  );

  const handleCollapse = useCallback(() => setExpanded(false), [setExpanded]);
  const handleExpand = useCallback(() => setExpanded(true), [setExpanded]);

  const newChat = useCallback(() => {
    setAccountOpen(false);
    navigate(`/c/${Constants.NEW_CONVO}`);
  }, [navigate]);

  const openConvo = useCallback(
    (id: string) => {
      navigate(`/c/${id}`);
      if (isSmallScreen) handleCollapse();
    },
    [navigate, isSmallScreen, handleCollapse],
  );

  /* ESC fecha drawer em mobile */
  useEffect(() => {
    if (!isSmallScreen || !expanded) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && handleCollapse();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isSmallScreen, expanded, handleCollapse]);

  /* ⌘K abre nova conversa */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        newChat();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [newChat]);

  const firstName = user?.name?.split(' ')[0] ?? user?.username ?? '';
  const initials = (user?.name || user?.username || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const balanceFormatted = useMemo(() => {
    const raw = balanceData?.tokenCredits;
    if (raw == null) return null;
    return formatUsdBalance(typeof raw === 'string' ? parseFloat(raw) : raw);
  }, [balanceData]);

  /** Sidebar inner content — reusado em desktop aside + mobile drawer. */
  const Inner = (
    <>
      {/* Brand header — Navvia wordmark à esquerda */}
      <div className="sidebar-brand">
        <button
          onClick={() => navigate('/home')}
          className="inline-flex items-center focus-ring rounded"
          aria-label="Navvia — Home"
        >
          <NavviaLogo size="md" />
        </button>
      </div>

      {/* CTA + search */}
      <div className="flex flex-col gap-2 px-3 pt-2">
        <button onClick={newChat} className="cta-new focus-ring">
          <span>
            <Plus className="h-[15px] w-[15px] shrink-0" strokeWidth={2.2} />
            {localize('com_ui_new_chat')}
            <span className="ml-auto">
              <kbd>⌘K</kbd>
            </span>
          </span>
        </button>
        <div className="search-pill">
          <Search className="h-[13px] w-[13px] shrink-0" strokeWidth={1.9} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={localize('com_ui_search')}
          />
        </div>
      </div>

      {/* Nav primário — Início + Agentes */}
      <nav className="px-3 pt-3">
        <button
          onClick={() => navigate('/home')}
          className={cn('navitem', isActiveRoute('/home') && 'active')}
        >
          <House className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
          {localize('com_nav_home_init')}
        </button>
        <button
          onClick={() => navigate('/agents')}
          className={cn('navitem', isActiveRoute('/agents') && 'active')}
        >
          <Bot className="h-[15px] w-[15px] shrink-0" strokeWidth={1.8} />
          {localize('com_nav_agents')}
        </button>
      </nav>

      {/* Scroll: Conversas + Biblioteca */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {/* Conversas — agrupadas por data */}
        <div className="sec-label mt-5">{localize('com_nav_my_conversations')}</div>
        {grouped.length === 0 ? (
          <div className="px-2 py-3 text-[11.5px] text-text-tertiary">
            {search ? 'Nada encontrado' : 'Nenhuma conversa ainda'}
          </div>
        ) : (
          grouped.map(([groupName, convs]) => (
            <div key={groupName}>
              <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-text-tertiary">
                {groupName}
              </p>
              {convs.slice(0, 8).map((c) => {
                const isActive = location.pathname === `/c/${c.conversationId}`;
                return (
                  <button
                    key={c.conversationId}
                    onClick={() => openConvo(c.conversationId!)}
                    className={cn('navitem group flex items-center gap-2', isActive && 'convo-active')}
                  >
                    <span
                      className={cn(
                        'shrink-0 h-1.5 w-1.5 rounded-full',
                        isActive ? '' : 'bg-text-tertiary',
                      )}
                      style={
                        isActive
                          ? { background: 'linear-gradient(135deg,#2469e2,#11b38d)' }
                          : undefined
                      }
                    />
                    <span className="truncate flex-1 text-left">{c.title || 'Nova conversa'}</span>
                  </button>
                );
              })}
            </div>
          ))
        )}

        {/* Biblioteca — 6 ícones coloridos */}
        <div className="sec-label mt-6">{localize('com_nav_library')}</div>
        <button onClick={() => navigate('/agents')} className="lib-item">
          <span className="lib-ic" style={{ background: 'rgba(36,105,226,0.13)', color: '#2469e2' }}>
            <Bot className="h-[13px] w-[13px]" strokeWidth={1.9} />
          </span>
          {localize('com_nav_agents')}
        </button>
        {/* [EXT] Phase J.7 Navvia: Prompts vai pra /prompts (rota real upstream).
         * Skills adicionado (faltava) — ícone laranja consistente c/ protótipo.
         * Arquivos/Memórias/Bookmarks/MCP ainda placeholder até rotas existirem
         * upstream (atualmente caem em /c/new por dashboard.tsx default). */}
        <button onClick={() => navigate('/prompts')} className="lib-item">
          <span className="lib-ic" style={{ background: 'rgba(17,179,141,0.15)', color: '#11b38d' }}>
            <Sparkles className="h-[13px] w-[13px]" strokeWidth={1.9} />
          </span>
          {localize('com_ui_prompts')}
        </button>
        <button onClick={() => navigate('/skills')} className="lib-item">
          <span className="lib-ic" style={{ background: 'rgba(245,158,11,0.16)', color: '#f59e0b' }}>
            <Wand2 className="h-[13px] w-[13px]" strokeWidth={1.9} />
          </span>
          {localize('com_ui_skills')}
        </button>
        <button onClick={() => navigate('/files')} className="lib-item">
          <span className="lib-ic" style={{ background: 'rgba(124,132,232,0.16)', color: '#7c84e8' }}>
            <FolderOpen className="h-[13px] w-[13px]" strokeWidth={1.9} />
          </span>
          {localize('com_nav_my_files')}
        </button>
        <button onClick={() => navigate('/memories')} className="lib-item">
          <span className="lib-ic" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899' }}>
            <Brain className="h-[13px] w-[13px]" strokeWidth={1.9} />
          </span>
          {localize('com_ui_memories')}
        </button>
        <button onClick={() => navigate('/bookmarks')} className="lib-item">
          <span className="lib-ic" style={{ background: 'rgba(0,180,216,0.15)', color: '#00b4d8' }}>
            <BookmarkIcon className="h-[13px] w-[13px]" />
          </span>
          {localize('com_ui_bookmarks')}
        </button>
        <button onClick={() => navigate('/mcp')} className="lib-item">
          <span className="lib-ic" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
            <Server className="h-[13px] w-[13px]" strokeWidth={1.9} />
          </span>
          {localize('com_nav_servers_mcp')}
        </button>
      </div>

      {/* Footer — credits card + account row */}
      <div className="border-t border-border-light p-3">
        {startupConfig?.balance?.enabled && balanceFormatted && (
          <div className="credits-card">
            <div className="credits-card-inner">
              <div className="flex flex-col">
                <span className="text-[10.5px] uppercase tracking-wide text-text-tertiary">
                  {localize('com_nav_credits')}
                </span>
                <span className="font-display text-[15px] font-bold">{balanceFormatted}</span>
              </div>
              <button onClick={() => navigate('/d/credits')} className="credits-buy focus-ring">
                <Plus className="h-[11px] w-[11px]" strokeWidth={2.4} />
                {localize('com_nav_credits_buy')}
              </button>
            </div>
          </div>
        )}
        <div data-pop className={accountOpen ? 'open' : ''}>
          <button
            onClick={() => setAccountOpen((v) => !v)}
            className="account-row"
            aria-expanded={accountOpen}
            aria-haspopup="menu"
          >
            <span className="account-avatar">
              <span>{initials}</span>
            </span>
            <span className="flex flex-col leading-tight overflow-hidden">
              <span className="truncate text-[13px] font-medium">{user?.name || firstName}</span>
              <span className="truncate text-[10.5px] text-text-tertiary">{user?.email}</span>
            </span>
            <ChevronDown
              className="ml-auto h-[14px] w-[14px] text-text-tertiary shrink-0"
              strokeWidth={1.8}
            />
          </button>
          {accountOpen && (
            <div className="pop bottom-12 left-0 w-[248px] rounded-lg border border-border-light bg-surface-overlay p-1">
              <div className="px-2 py-1.5 text-[12px] text-text-tertiary">{user?.email}</div>
              <div className="menu-sep" />
              <button
                onClick={() => {
                  setAccountOpen(false);
                  setFilesOpen(true);
                }}
                className="menu-item"
              >
                <FolderOpen className="h-[14px] w-[14px]" strokeWidth={1.8} />
                {localize('com_nav_my_files')}
              </button>
              <button
                onClick={() => {
                  setAccountOpen(false);
                  window.open(startupConfig?.helpAndFaqURL ?? 'https://librechat.ai', '_blank');
                }}
                className="menu-item"
              >
                <HelpCircle className="h-[14px] w-[14px]" strokeWidth={1.8} />
                {localize('com_nav_help_and_faq_short')}
              </button>
              <button
                onClick={() => {
                  setAccountOpen(false);
                  setSettingsOpen(true);
                }}
                className="menu-item"
              >
                <SettingsIcon className="h-[14px] w-[14px]" strokeWidth={1.8} />
                {localize('com_nav_settings')}
              </button>
              <div className="menu-sep" />
              <button
                onClick={() => {
                  setAccountOpen(false);
                  logout();
                }}
                className="menu-item danger"
              >
                <LogOut className="h-[14px] w-[14px]" strokeWidth={1.8} />
                {localize('com_nav_log_out')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  /* Mobile: drawer off-canvas */
  if (isSmallScreen) {
    return (
      <>
        <aside
          className={cn(
            'sidebar-main fixed left-0 top-0 z-[110] flex h-full flex-col border-r border-border-light bg-surface-secondary',
            expanded ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{
            width: 'min(86vw, 320px)',
            transition: `transform ${TRANSITION_MS}ms ${EASING}`,
          }}
          inert={!expanded ? '' : undefined}
        >
          {Inner}
        </aside>
        <div
          className={cn(
            'drawer-backdrop',
            expanded && 'show',
          )}
          onClick={handleCollapse}
          role="presentation"
        />
        <Settings open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    );
  }

  /* Desktop: sidebar fixa 280px com botão collapse no edge */
  return (
    <>
      <aside
        className="sidebar-main relative flex w-[280px] shrink-0 flex-col border-r border-border-light bg-surface-secondary"
        aria-label={localize('com_nav_control_panel')}
      >
        <button
          onClick={handleCollapse}
          className="sidebar-collapse"
          title={localize('com_nav_close_sidebar') || 'Recolher sidebar'}
          aria-label={localize('com_nav_close_sidebar') || 'Recolher sidebar'}
        >
          <ChevronLeft className="h-[11px] w-[11px]" strokeWidth={2} />
        </button>
        {Inner}
      </aside>
      <Settings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

export default memo(NavviaSidebar);
