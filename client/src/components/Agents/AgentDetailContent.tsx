import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as LinkIcon, Pin, PinOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { OGDialogContent, useToastContext } from '@librechat/client';
import {
  QueryKeys,
  Constants,
  EModelEndpoint,
  PermissionBits,
  LocalStorageKeys,
  AgentListResponse,
} from 'librechat-data-provider';
import type t from 'librechat-data-provider';
import {
  useLocalize,
  useDefaultConvo,
  useFavorites,
  useAgentCategories,
  TranslationKeys,
} from '~/hooks';
import { renderAgentAvatar, clearMessagesCache, getContactDisplayName, cn } from '~/utils';
import { useChatContext } from '~/Providers';

interface SupportContact {
  name?: string;
  email?: string;
}

interface AgentWithSupport extends t.Agent {
  support_contact?: SupportContact;
}

interface AgentDetailContentProps {
  agent: AgentWithSupport;
  /**
   * [EXT] Phase J.18 Navvia: callback chamado depois de qualquer ação que
   * deva fechar o modal (Iniciar chat, copiar link). AgentCard passa
   * setIsOpen(false). Sem isso o modal fica em cima da /c/new após o start.
   */
  onClose?: () => void;
}

/* --------- model badge helpers (mantidos identicos ao AgentCard.tsx) --------- */
const PROVIDER_LABEL_MAP: Record<string, { initials: string; brand: boolean }> = {
  anthropic: { initials: 'AI', brand: true },
  openai: { initials: 'G5', brand: false },
  azureopenai: { initials: 'AZ', brand: false },
  google: { initials: 'GE', brand: false },
  groq: { initials: 'GQ', brand: false },
  mistral: { initials: 'MS', brand: false },
  ollama: { initials: 'OL', brand: false },
  bedrock: { initials: 'AW', brand: false },
  xai: { initials: 'XA', brand: false },
  deepseek: { initials: 'DS', brand: false },
};

function getProviderBadge(provider?: string | null) {
  if (!provider) return { initials: '??', brand: false };
  return (
    PROVIDER_LABEL_MAP[provider.toLowerCase()] ?? {
      initials: provider.slice(0, 2).toUpperCase(),
      brand: false,
    }
  );
}

function formatModelLabel(model?: string | null): string {
  if (!model) return '';
  const lower = model.toLowerCase();
  if (lower.includes('opus')) return capitalize(extractVersion(lower, 'opus'));
  if (lower.includes('sonnet')) return capitalize(extractVersion(lower, 'sonnet'));
  if (lower.includes('haiku')) return capitalize(extractVersion(lower, 'haiku'));
  if (lower.startsWith('gpt')) return model.replace(/^gpt-?/i, 'GPT-').toUpperCase().replace('GPT--', 'GPT-');
  if (lower.includes('gemini')) return capitalize(extractVersion(lower, 'gemini'));
  return model.length > 20 ? `${model.slice(0, 19)}…` : model;
}

function extractVersion(lower: string, keyword: string): string {
  const idx = lower.indexOf(keyword);
  if (idx === -1) return keyword;
  const after = lower.slice(idx + keyword.length).replace(/^[-_]?/, '');
  const ver = after.match(/^(\d+([-.]\d+)*)/)?.[1]?.replace(/-/g, '.');
  return ver ? `${keyword} ${ver}` : keyword;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * [EXT] Phase J.18 Navvia: modal de detalhe do agente — versão enxuta.
 *
 * Antes:
 *   - max-w-lg, avatar xl centralizado
 *   - nome 2xl bold em linha separada
 *   - descrição longa centralizada com padding generoso
 *   - 3 botões grandes no fundo (Pin · Link · "Iniciar chat" full width)
 *   - "Iniciar chat" só rodava newConversation() mas não navegava — o
 *     user ficava em /agents com o modal aberto e nada acontecia visualmente.
 *
 * Agora:
 *   - max-w-md, layout horizontal compacto
 *   - Header: avatar md + nome + categoria + author
 *   - Meta row: model badge + (pin / link ações inline)
 *   - Descrição left-aligned com line-clamp-5
 *   - Footer: "Iniciar chat" bg-brand full width
 *   - handleStartChat agora navega para /c/new e fecha o modal
 */
const AgentDetailContent: React.FC<AgentDetailContentProps> = ({ agent, onClose }) => {
  const localize = useLocalize();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  const getDefaultConversation = useDefaultConvo();
  const { conversation, newConversation } = useChatContext();
  const { isFavoriteAgent, toggleFavoriteAgent } = useFavorites();
  const { categories } = useAgentCategories();

  const isFavorite = isFavoriteAgent(agent?.id);
  const providerBadge = useMemo(() => getProviderBadge(agent.provider), [agent.provider]);
  const modelLabel = useMemo(() => formatModelLabel(agent.model), [agent.model]);
  const displayName = getContactDisplayName(agent);

  const categoryLabel = useMemo(() => {
    if (!agent.category) return '';
    const category = categories.find((cat) => cat.value === agent.category);
    if (category) {
      if (category.label && category.label.startsWith('com_')) {
        return localize(category.label as TranslationKeys);
      }
      return category.label;
    }
    return agent.category.charAt(0).toUpperCase() + agent.category.slice(1);
  }, [agent.category, categories, localize]);

  const handleFavoriteClick = () => {
    if (agent) toggleFavoriteAgent(agent.id);
  };

  const handleStartChat = () => {
    if (!agent) return;

    const keys = [QueryKeys.agents, { requiredPermission: PermissionBits.EDIT }];
    const listResp = queryClient.getQueryData<AgentListResponse>(keys);
    if (listResp && !listResp.data.some((a) => a.id === agent.id)) {
      const currentAgents = [agent, ...JSON.parse(JSON.stringify(listResp.data))];
      queryClient.setQueryData<AgentListResponse>(keys, { ...listResp, data: currentAgents });
    }

    localStorage.setItem(`${LocalStorageKeys.AGENT_ID_PREFIX}0`, agent.id);
    clearMessagesCache(queryClient, conversation?.conversationId);
    queryClient.invalidateQueries([QueryKeys.messages]);

    const template = {
      conversationId: Constants.NEW_CONVO as string,
      endpoint: EModelEndpoint.agents,
      agent_id: agent.id,
      title: localize('com_agents_chat_with', { name: agent.name || localize('com_ui_agent') }),
    };

    const currentConvo = getDefaultConversation({
      conversation: { ...(conversation ?? {}), ...template },
      preset: template,
    });

    newConversation({ template: currentConvo, preset: template });

    /* [EXT] Phase J.18: fecha o modal e leva o user pro chat. Antes o modal
     * ficava aberto sobre /agents e o usuário não via nada acontecer. */
    onClose?.();
    navigate('/c/new');
  };

  const handleCopyLink = () => {
    const chatUrl = `${window.location.origin}/c/new?agent_id=${agent.id}`;
    navigator.clipboard
      .writeText(chatUrl)
      .then(() => showToast({ message: localize('com_agents_link_copied') }))
      .catch(() => showToast({ message: localize('com_agents_link_copy_failed') }));
  };

  const supportContactLine = useMemo(() => {
    if (!agent?.support_contact) return null;
    const { name, email } = agent.support_contact;
    if (name && email)
      return (
        <a href={`mailto:${email}`} className="text-brand hover:underline">
          {name}
        </a>
      );
    if (email)
      return (
        <a href={`mailto:${email}`} className="text-brand hover:underline">
          {email}
        </a>
      );
    if (name) return <span>{name}</span>;
    return null;
  }, [agent?.support_contact]);

  return (
    <OGDialogContent className="w-11/12 max-w-md overflow-hidden p-0">
      <div className="flex max-h-[80vh] flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pb-3 pt-5">
          <div className="agent-ico shrink-0">
            {renderAgentAvatar(agent, { size: 'md', showBorder: false })}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-[16px] font-semibold text-text-primary">
              {agent?.name || localize('com_agents_loading')}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text-tertiary">
              {categoryLabel && (
                <span className="rounded bg-surface-active px-1.5 py-0.5 font-medium">
                  {categoryLabel}
                </span>
              )}
              {displayName && (
                <span className="truncate">
                  {localize('com_ui_by_author', { 0: displayName })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Meta row: model + actions */}
        <div className="flex items-center justify-between gap-2 border-y border-border-light bg-surface-secondary px-5 py-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-text-tertiary">
            {agent.model ? (
              <>
                <span
                  className={cn(
                    'grid h-4 w-4 shrink-0 place-items-center rounded text-[9px] font-bold',
                    providerBadge.brand
                      ? 'bg-brand-soft text-brand'
                      : 'bg-surface-active text-text-secondary',
                  )}
                  aria-hidden="true"
                >
                  {providerBadge.initials}
                </span>
                <span className="truncate font-medium text-text-secondary">{modelLabel}</span>
              </>
            ) : (
              <span className="italic text-text-tertiary">
                {localize('com_ui_no_model_selected')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleFavoriteClick}
              className="grid h-7 w-7 place-items-center rounded text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
              title={isFavorite ? localize('com_ui_unpin') : localize('com_ui_pin')}
              aria-label={isFavorite ? localize('com_ui_unpin') : localize('com_ui_pin')}
            >
              {isFavorite ? (
                <PinOff className="size-[14px]" aria-hidden="true" />
              ) : (
                <Pin className="size-[14px]" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="grid h-7 w-7 place-items-center rounded text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
              title={localize('com_agents_copy_link')}
              aria-label={localize('com_agents_copy_link')}
            >
              <LinkIcon className="size-[14px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {agent?.description ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-primary">
              {agent.description}
            </p>
          ) : (
            <p className="text-[12.5px] italic text-text-tertiary">
              {localize('com_agents_no_description')}
            </p>
          )}

          {supportContactLine && (
            <p className="mt-3 text-[11px] text-text-tertiary">
              {localize('com_agents_contact')}: {supportContactLine}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-light bg-surface-secondary px-5 py-3">
          <button
            type="button"
            onClick={handleStartChat}
            disabled={!agent}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-brand text-[13px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
          >
            {localize('com_agents_start_chat')}
          </button>
        </div>
      </div>
    </OGDialogContent>
  );
};

export default AgentDetailContent;
