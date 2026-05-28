import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Code as CodeIcon,
  CreditCard,
  FileText,
  Globe,
  Image as ImageIcon,
  MessageSquare,
  Mic,
  Paperclip,
  Plus,
  Search as SearchIcon,
  Send,
  Star,
  Tag,
  Wrench,
  Bot,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useAuthContext, useLocalize } from '~/hooks';
import { useGetUserBalance } from '~/data-provider/Misc/queries';
import { useConversationsInfiniteQuery } from '~/data-provider';
import { useGetStartupConfig } from '~/data-provider';
import { useAgentsMapContext } from '~/Providers';
import { formatUsdBalance } from '~/components/Nav/BuyCredits/ExtBalanceDisplay';
import type { TConversation } from 'librechat-data-provider';

/**
 * [EXT] Home — port literal de design/ui-preview.html linhas 618-717.
 *
 * Estrutura:
 *   section.view.home-amb (ambient radial gradients)
 *     ├─ banner.hero (full-bleed, 3 blobs animados)
 *     │    ├─ pill plano (dot brand + texto)
 *     │    ├─ h1 "Por onde começamos, {nome}?" (font-display 38px)
 *     │    ├─ p subtitle
 *     │    ├─ composer siri-hero (textarea + popovers + send button)
 *     │    └─ chips de ações sugeridas (5)
 *     └─ container max-w-[1600px]
 *          ├─ stats grid (4 cols)
 *          ├─ h2 "Ferramentas" + tools tiles (6 cols xl)
 *          ├─ h2 "Agentes em destaque" + carousel
 *          ├─ h2 "Imagens geradas recentemente" + carousel
 *          └─ 2 colunas: "Continue de onde parou" + "Prompts em destaque"
 *
 * Composer da home: capturar texto + enviar dispara navigate('/c/new')
 * persistindo o texto via sessionStorage. ChatForm (Fase D) lê e auto-submete.
 */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const SUGGESTION_CHIPS = [
  { emoji: '🎨', label: 'Gerar imagem', prompt: 'Gere uma imagem de um mascote para o Navvia' },
  { emoji: '📄', label: 'Analisar documento', prompt: 'Analise este documento e resuma os pontos principais' },
  { emoji: '🌐', label: 'Busca web', prompt: 'Pesquise na web as novidades de IA desta semana' },
  { emoji: '💻', label: 'Escrever código', prompt: 'Escreva uma função em TypeScript para debounce' },
  { emoji: '📝', label: 'Resumir texto', prompt: 'Resuma este texto em 3 tópicos' },
];

const TOOLS_TILES = [
  {
    emoji: '💬',
    label: 'Conversar',
    desc: 'Chat com qualquer modelo disponível.',
    iconBg: 'var(--brand-soft)',
    iconColor: 'var(--brand)',
  },
  {
    emoji: '🎨',
    label: 'Gerar imagem',
    desc: 'Crie imagens a partir de texto.',
    iconBg: 'rgba(236,72,153,.14)',
    iconColor: '#ec4899',
  },
  {
    emoji: '📄',
    label: 'Analisar documento',
    desc: 'PDFs, planilhas e imagens.',
    iconBg: 'rgba(16,185,129,.14)',
    iconColor: '#10b981',
  },
  {
    emoji: '🌐',
    label: 'Pesquisa profunda',
    desc: 'Busca web com fontes citadas.',
    iconBg: 'rgba(0,180,216,.14)',
    iconColor: '#00b4d8',
  },
  {
    emoji: '💻',
    label: 'Escrever código',
    desc: 'Com interpretador e artifacts.',
    iconBg: 'rgba(124,132,232,.16)',
    iconColor: '#7c84e8',
  },
  {
    emoji: '🎙️',
    label: 'Transcrever áudio',
    desc: 'Fala para texto e resumo.',
    iconBg: 'rgba(245,158,11,.14)',
    iconColor: '#f59e0b',
  },
];

const GALLERY_PLACEHOLDERS = [
  { label: 'Logo minimalista', bg: 'linear-gradient(135deg,#2469e2,#11b38d)' },
  { label: 'Banner produto', bg: 'linear-gradient(135deg,#0d9488,#00d4ff)' },
  { label: 'Ícone app', bg: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { label: 'Ilustração hero', bg: 'linear-gradient(135deg,#ec4899,#8b5cf6)' },
  { label: 'Mockup mobile', bg: 'linear-gradient(135deg,#11b38d,#2469e2)' },
];

const PROMPT_HIGHLIGHTS = [
  { emoji: '⚡', title: 'Resumir reunião', desc: 'Transforma transcrição em ata + ações' },
  { emoji: '📧', title: 'E-mail comercial', desc: 'Escreve follow-up persuasivo' },
  { emoji: '🐛', title: 'Explicar stack trace', desc: 'Diagnostica erro e sugere fix' },
];

function relativeTime(updatedAt?: string): string {
  if (!updatedAt) return '';
  const ms = Date.now() - new Date(updatedAt).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ontem';
  if (d < 7) return `há ${d} d`;
  return new Date(updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function HomeView() {
  const navigate = useNavigate();
  const localize = useLocalize();
  const { user } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const { data: balanceData } = useGetUserBalance({ enabled: !!startupConfig?.balance?.enabled });
  const agentsMap = useAgentsMapContext();
  const { data: convosData } = useConversationsInfiniteQuery({
    isArchived: false,
    sortBy: 'updatedAt',
    sortDirection: 'desc',
  });

  const firstName = (user?.name ?? user?.username ?? '').split(' ')[0] ?? '';
  const [composer, setComposer] = useState('');
  const [activeModel, setActiveModel] = useState('GPT-5.5');
  const [modelOpen, setModelOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const popRefs = useRef<{ [k: string]: HTMLDivElement | null }>({});

  /* Fecha popovers ao clicar fora */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (modelOpen && popRefs.current.model && !popRefs.current.model.contains(target)) {
        setModelOpen(false);
      }
      if (attachOpen && popRefs.current.attach && !popRefs.current.attach.contains(target)) {
        setAttachOpen(false);
      }
      if (toolsOpen && popRefs.current.tools && !popRefs.current.tools.contains(target)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelOpen, attachOpen, toolsOpen]);

  const startConversation = useCallback(
    (text?: string) => {
      const message = (text ?? composer).trim();
      if (message) {
        sessionStorage.setItem('navvia:pendingMessage', message);
      }
      navigate('/c/new');
    },
    [composer, navigate],
  );

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      startConversation();
    }
  };

  const conversations = useMemo<TConversation[]>(() => {
    if (!convosData?.pages) return [];
    return convosData.pages.flatMap((p) => p.conversations).filter(Boolean) as TConversation[];
  }, [convosData]);

  const conversationsCount = conversations.length;
  const balanceFormatted = useMemo(() => {
    const raw = balanceData?.tokenCredits;
    if (raw == null) return null;
    return formatUsdBalance(typeof raw === 'string' ? parseFloat(raw) : raw);
  }, [balanceData]);

  const featuredAgents = useMemo(() => {
    if (!agentsMap) return [];
    return Object.values(agentsMap).slice(0, 5);
  }, [agentsMap]);

  const agentsCount = useMemo(() => Object.keys(agentsMap ?? {}).length, [agentsMap]);

  return (
    <section className="view home-amb fade-in flex h-full w-full flex-col overflow-y-auto">
      {/* ===== BANNER full-bleed com 3 blobs ===== */}
      <div className="hero banner rise border-b border-border-light">
        <span className="blob blob-1" aria-hidden="true" />
        <span className="blob blob-2" aria-hidden="true" />
        <span className="blob blob-3" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col items-center px-8 py-14 text-center lg:px-12">
          {/* Pill plano */}
          {startupConfig?.balance?.enabled && balanceFormatted && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-light bg-surface-primary/70 px-2.5 py-1 text-[11.5px] text-text-secondary backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Plano Pro · {balanceFormatted} em créditos
            </div>
          )}

          <h1 className="font-display text-[38px] font-extrabold leading-[1.04] tracking-tight text-text-primary">
            Por onde começamos{firstName ? `, ${firstName}` : ''}?
          </h1>
          <p className="mt-2.5 max-w-xl text-[15px] text-text-secondary">
            Comece digitando abaixo — converse, gere imagens, analise documentos ou chame um agente com{' '}
            <span className="font-mono">@</span>.
          </p>

          {/* COMPOSER siri-hero */}
          <div className="siri-border siri-hero mt-7 w-full max-w-3xl rounded-2xl border border-border-light bg-surface-primary text-left shadow-lg">
            <textarea
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={handleKey}
              rows={3}
              placeholder="Pergunte qualquer coisa…"
              className="w-full resize-none bg-transparent px-5 pt-4 text-[16px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
              style={{ lineHeight: 1.55 }}
            />
            <div className="flex items-center gap-1.5 px-3.5 pb-3.5 pt-1">
              {/* Model picker */}
              <div
                data-pop
                ref={(el) => (popRefs.current.model = el)}
                className={modelOpen ? 'open' : ''}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setModelOpen((v) => !v);
                    setAttachOpen(false);
                    setToolsOpen(false);
                  }}
                  className="ctrl focus-ring flex items-center gap-1.5 rounded-md border border-border-medium bg-surface-secondary px-2.5 text-[12.5px] font-medium hover:bg-surface-hover"
                >
                  <span className="grid h-4 w-4 place-items-center rounded bg-brand-soft text-[9px] font-bold text-brand">
                    AI
                  </span>
                  {activeModel}
                  <ChevronDown className="h-[13px] w-[13px] text-text-tertiary" strokeWidth={1.8} />
                </button>
                <div className="pop bottom-12 left-0 w-[300px] rounded-lg border border-border-light bg-surface-overlay p-1">
                  <div className="menu-label">Modelos</div>
                  {[
                    { id: 'Claude Opus 4.7', tag: 'AI', tagBg: 'bg-brand-soft', tagFg: 'text-brand', hint: 'Raciocínio' },
                    { id: 'GPT-5.5', tag: 'G5', tagBg: 'bg-surface-active', tagFg: '', hint: 'Versátil' },
                    { id: 'Gemini 3 Pro', tag: 'GE', tagBg: 'bg-surface-active', tagFg: '', hint: 'Contexto longo' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setActiveModel(m.id);
                        setModelOpen(false);
                      }}
                      className="menu-item"
                    >
                      <span className={`grid h-5 w-5 place-items-center rounded ${m.tagBg} text-[9px] font-bold ${m.tagFg}`}>
                        {m.tag}
                      </span>
                      {m.id}
                      <span className="ml-auto text-[11px] text-text-tertiary">{m.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Anexar */}
              <div
                data-pop
                ref={(el) => (popRefs.current.attach = el)}
                className={attachOpen ? 'open' : ''}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttachOpen((v) => !v);
                    setModelOpen(false);
                    setToolsOpen(false);
                  }}
                  className="ctrl focus-ring grid w-8 place-items-center rounded-md text-text-secondary hover:bg-surface-hover"
                  title="Anexar"
                >
                  <Paperclip className="h-[17px] w-[17px]" strokeWidth={1.8} />
                </button>
                <div className="pop bottom-10 left-0 w-56 rounded-lg border border-border-light bg-surface-overlay p-1">
                  <div className="menu-label">Anexar</div>
                  <button className="menu-item">Imagem</button>
                  <button className="menu-item">Arquivo / documento</button>
                  <button className="menu-item">Texto p/ OCR</button>
                  <button className="menu-item">SharePoint</button>
                </div>
              </div>

              {/* Ferramentas */}
              <div
                data-pop
                ref={(el) => (popRefs.current.tools = el)}
                className={toolsOpen ? 'open' : ''}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setToolsOpen((v) => !v);
                    setModelOpen(false);
                    setAttachOpen(false);
                  }}
                  className="ctrl focus-ring flex items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-text-secondary hover:bg-surface-hover"
                  title="Ferramentas"
                >
                  <Wrench className="h-[15px] w-[15px]" strokeWidth={1.8} />
                  Ferramentas
                </button>
                <div className="pop bottom-10 left-0 w-64 rounded-lg border border-border-light bg-surface-overlay p-1">
                  <div className="menu-label">Ferramentas</div>
                  <label className="menu-item">
                    Busca web
                    <span className="toggle-proto on ml-auto">
                      <span className="knob" />
                    </span>
                  </label>
                  <label className="menu-item">
                    Interpretador de código
                    <span className="toggle-proto off ml-auto">
                      <span className="knob" />
                    </span>
                  </label>
                  <label className="menu-item">
                    File search
                    <span className="toggle-proto off ml-auto">
                      <span className="knob" />
                    </span>
                  </label>
                  <button className="menu-item">
                    Artifacts
                    <ChevronRight className="ml-auto h-[13px] w-[13px] text-text-tertiary" strokeWidth={1.9} />
                  </button>
                </div>
              </div>

              {/* Atalho de kbd */}
              <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-text-tertiary sm:flex">
                <kbd>/</kbd>comandos
                <span className="opacity-50">·</span>
                <kbd>@</kbd>agentes
              </span>

              {/* Send */}
              <button
                onClick={() => startConversation()}
                disabled={!composer.trim()}
                className="ctrl focus-ring grid w-9 place-items-center rounded-md bg-brand text-brand-fg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                title="Enviar"
                aria-label="Enviar"
              >
                <Send className="h-[17px] w-[17px]" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Chips de ações sugeridas */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGGESTION_CHIPS.map((c) => (
              <button key={c.label} onClick={() => startConversation(c.prompt)} className="chip">
                <span aria-hidden="true">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CONTEÚDO ===== */}
      <div className="mx-auto w-full max-w-[1600px] px-8 py-8 lg:px-12">
        {/* ===== STATS ===== */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="stat rise d1">
            <div className="flex items-center gap-1.5 text-[11.5px] text-text-tertiary">
              <CreditCard className="h-[13px] w-[13px]" strokeWidth={1.9} />
              Créditos
            </div>
            <div className="mt-1 font-display text-[20px] font-bold">
              {balanceFormatted ?? '—'}
            </div>
            <div className="text-[11px] text-text-tertiary">
              {startupConfig?.balance?.enabled ? 'Disponível agora' : 'Plano flat'}
            </div>
          </div>

          <div className="stat rise d2">
            <div className="flex items-center gap-1.5 text-[11.5px] text-text-tertiary">
              <MessageSquare className="h-[13px] w-[13px]" strokeWidth={1.9} />
              Conversas
            </div>
            <div className="mt-1 font-display text-[20px] font-bold">{conversationsCount}</div>
            <div className="text-[11px] text-text-tertiary">No histórico</div>
          </div>

          <div className="stat rise d3">
            <div className="flex items-center gap-1.5 text-[11.5px] text-text-tertiary">
              <Bot className="h-[13px] w-[13px]" strokeWidth={1.9} />
              Agentes disponíveis
            </div>
            <div className="mt-1 font-display text-[20px] font-bold">{agentsCount}</div>
            <div className="text-[11px] text-text-tertiary">
              {agentsCount > 0 ? 'Explore o marketplace' : 'Nenhum ainda'}
            </div>
          </div>

          <div className="stat rise d4">
            <div className="flex items-center gap-1.5 text-[11.5px] text-text-tertiary">
              <Star className="h-[13px] w-[13px]" strokeWidth={1.9} />
              Modelo padrão
            </div>
            <div className="mt-1 font-display text-[20px] font-bold">{activeModel}</div>
            <div className="text-[11px] text-text-tertiary">Pré-selecionado</div>
          </div>
        </div>

        {/* ===== FERRAMENTAS ===== */}
        <h2 className="rise d2 mt-9 font-display text-[16px] font-semibold">Ferramentas</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {TOOLS_TILES.map((t, i) => (
            <button
              key={t.label}
              onClick={() => startConversation(t.label)}
              className={`tile rise d${Math.min(i + 2, 5)}`}
            >
              <div
                className="tile-ico"
                style={{ background: t.iconBg, color: t.iconColor }}
              >
                {t.emoji}
              </div>
              <div className="font-medium">{t.label}</div>
              <div className="text-[12px] leading-snug text-text-tertiary">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* ===== AGENTES EM DESTAQUE ===== */}
        <div className="rise d3 mt-9 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold">Agentes em destaque</h2>
          <button
            onClick={() => navigate('/agents')}
            className="flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
          >
            Ver todos
            <ChevronRight className="h-[13px] w-[13px]" strokeWidth={2} />
          </button>
        </div>
        <div className="carousel rise d4 mt-3">
          {featuredAgents.length > 0 ? (
            featuredAgents.map((agent: any) => (
              <div
                key={agent.id ?? agent._id}
                onClick={() => {
                  navigate(`/c/new`);
                  sessionStorage.setItem('navvia:pendingAgent', agent.id ?? agent._id);
                }}
                className="agent-card w-[230px] shrink-0"
              >
                <div className="flex items-start gap-3">
                  <div className="agent-ico">{agent.avatar?.filepath ? '🤖' : '🤖'}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{agent.name ?? 'Agente'}</div>
                    <div className="mt-0.5 text-[11px] text-text-tertiary">
                      {agent.author ? `por ${agent.author}` : 'por você'}
                    </div>
                  </div>
                </div>
                <p className="text-[12px] leading-snug text-text-secondary line-clamp-2">
                  {agent.description ?? 'Sem descrição.'}
                </p>
                <div className="mt-auto flex items-center gap-2.5 border-t border-border-light pt-2 text-[11px] text-text-tertiary">
                  <span className="modelbadge">
                    <span className="grid h-3 w-3 place-items-center rounded bg-brand-soft text-[7px] font-bold text-brand">
                      AI
                    </span>
                    {agent.model ?? 'auto'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="agent-card w-[230px] shrink-0 items-center justify-center text-center">
              <div className="agent-ico bg-brand-soft text-brand">
                <Bot className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <div className="text-[12px] font-medium">Nenhum agente ainda</div>
              <div className="text-[11px] text-text-tertiary">Crie ou importe no marketplace</div>
            </div>
          )}
          <button
            onClick={() => navigate('/agents')}
            className="agent-card w-[160px] shrink-0 items-center justify-center border-dashed text-center"
          >
            <div className="agent-ico bg-brand-soft text-brand">
              <ArrowRight className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="text-[12px] font-medium">Explorar todos</div>
          </button>
        </div>

        {/* ===== IMAGENS RECENTES (placeholder visual) ===== */}
        <div className="rise d4 mt-9 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold">Imagens geradas recentemente</h2>
          <button className="text-[12px] font-medium text-brand hover:underline">Ver galeria</button>
        </div>
        <div className="carousel rise d4 mt-3">
          {GALLERY_PLACEHOLDERS.map((g) => (
            <div key={g.label} className="gallery-thumb" style={{ background: g.bg }}>
              <span>{g.label}</span>
            </div>
          ))}
          <div className="gallery-thumb grid place-items-center" style={{ background: 'var(--surface-secondary)' }}>
            <span className="!static !text-text-tertiary !shadow-none">
              <Plus className="mx-auto h-4 w-4 mb-0.5" strokeWidth={1.8} />
              Nova imagem
            </span>
          </div>
        </div>

        {/* ===== DUAS COLUNAS ===== */}
        <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Continue de onde parou */}
          <div className="rise d4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-semibold">Continue de onde parou</h2>
              <button
                onClick={() => navigate('/c/new')}
                className="text-[12px] font-medium text-brand hover:underline"
              >
                Ver tudo
              </button>
            </div>
            <div className="divide-y divide-border-light overflow-hidden rounded-lg border border-border-light">
              {conversations.slice(0, 4).length > 0 ? (
                conversations.slice(0, 4).map((c) => (
                  <button
                    key={c.conversationId}
                    onClick={() => navigate(`/c/${c.conversationId}`)}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-surface-hover"
                  >
                    <MessageSquare className="h-[15px] w-[15px] shrink-0 text-text-tertiary" strokeWidth={1.75} />
                    <span className="flex-1 truncate text-[13px]">{c.title || 'Nova conversa'}</span>
                    <span className="text-[11px] text-text-tertiary">{relativeTime(c.updatedAt)}</span>
                  </button>
                ))
              ) : (
                <div className="px-3.5 py-6 text-center text-[12.5px] text-text-tertiary">
                  Nenhuma conversa ainda. Comece digitando acima.
                </div>
              )}
            </div>
          </div>

          {/* Prompts em destaque */}
          <div className="rise d5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-semibold">Prompts em destaque</h2>
              <button
                onClick={() => navigate('/d/prompts')}
                className="text-[12px] font-medium text-brand hover:underline"
              >
                Biblioteca
              </button>
            </div>
            <div className="space-y-2">
              {PROMPT_HIGHLIGHTS.map((p) => (
                <button
                  key={p.title}
                  onClick={() => startConversation(p.title)}
                  className="flex w-full items-start gap-3 rounded-lg border border-border-light bg-surface-secondary px-3.5 py-2.5 text-left hover:border-border-medium"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface-active">
                    {p.emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{p.title}</div>
                    <div className="truncate text-[11.5px] text-text-tertiary">{p.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(HomeView);
