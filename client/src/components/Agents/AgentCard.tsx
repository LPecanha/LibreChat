import React, { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { OGDialog, OGDialogTrigger } from '@librechat/client';
import type t from 'librechat-data-provider';
import { useLocalize, TranslationKeys, useAgentCategories } from '~/hooks';
import { cn, renderAgentAvatar, getContactDisplayName } from '~/utils';
import AgentDetailContent from './AgentDetailContent';

/**
 * [EXT] Phase J.18 Navvia: helpers para o modelbadge do AgentCard (linha 746
 * do proto). Provider colorido + nome do modelo curto, tipo "AI Opus 4.7",
 * "G5 GPT-5.5", "GE Gemini 3 Pro".
 */
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
  return PROVIDER_LABEL_MAP[provider.toLowerCase()] ?? {
    initials: provider.slice(0, 2).toUpperCase(),
    brand: false,
  };
}

function formatModelLabel(model?: string | null): string {
  if (!model) return '';
  /* Strip vendor prefixes comuns pra caber no badge. claude-3-5-sonnet →
   * "3-5-sonnet" → "3.5 Sonnet" fica longo; prefere "Sonnet" cru.
   * Heurística simples: pega o token mais "descritivo" (não-numérico) e o
   * primeiro número que vier depois. Para casos não-mapeados, mostra
   * truncado em 16 chars. */
  const lower = model.toLowerCase();
  /* casos conhecidos */
  if (lower.includes('opus')) return capitalize(extractVersion(lower, 'opus'));
  if (lower.includes('sonnet')) return capitalize(extractVersion(lower, 'sonnet'));
  if (lower.includes('haiku')) return capitalize(extractVersion(lower, 'haiku'));
  if (lower.startsWith('gpt-') || lower.startsWith('gpt'))
    return model.replace(/^gpt-?/i, 'GPT-').toUpperCase().replace('GPT--', 'GPT-');
  if (lower.includes('gemini')) return capitalize(extractVersion(lower, 'gemini'));
  /* fallback: trunca em 16 chars */
  return model.length > 16 ? `${model.slice(0, 15)}…` : model;
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

interface AgentCardProps {
  agent: t.Agent;
  onSelect?: (agent: t.Agent) => void;
  className?: string;
}

/**
 * [EXT] Phase J.12 Navvia: AgentCard vertical alinhado com .agent-card do protótipo
 * (design/ui-preview.html linha 451 + estrutura linha 737-751):
 *
 *   .agent-card { flex-direction: column; gap: 10px; padding: 14px; }
 *
 * Top row: agent-ico + (name + category pill + author) + favorite star
 * Middle: description (text-[12.5px] text-text-secondary line-clamp-2)
 * Footer (mt-auto): model badge + rating · "Usar" button
 *
 * Sem altura fixa (proto deixa conteúdo ditar). Sem !flex-row.
 */
const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect, className = '' }) => {
  const localize = useLocalize();
  const { categories } = useAgentCategories();
  const [isOpen, setIsOpen] = useState(false);

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

  const displayName = getContactDisplayName(agent);
  const providerBadge = useMemo(() => getProviderBadge(agent.provider), [agent.provider]);
  const modelLabel = useMemo(() => formatModelLabel(agent.model), [agent.model]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && onSelect) {
      onSelect(agent);
    }
  };

  return (
    <OGDialog open={isOpen} onOpenChange={handleOpenChange}>
      <OGDialogTrigger asChild>
        <div
          className={cn('agent-card group', className)}
          aria-label={localize('com_agents_agent_card_label', {
            name: agent.name,
            description: agent.description ?? '',
          })}
          aria-describedby={agent.description ? `agent-${agent.id}-description` : undefined}
          tabIndex={0}
          role="button"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
        >
          {/* Top row: avatar + identity + favorite */}
          <div className="flex items-start gap-3">
            <div className="agent-ico shrink-0">
              {renderAgentAvatar(agent, { size: 'sm', showBorder: false })}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-text-primary">{agent.name}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-tertiary">
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
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="fav grid h-7 w-7 place-items-center rounded text-text-tertiary hover:bg-surface-hover"
              aria-label="Favorite"
            >
              <Star className="h-[15px] w-[15px]" strokeWidth={1.5} />
            </button>
          </div>

          {/* Description */}
          {agent.description && (
            <p
              id={`agent-${agent.id}-description`}
              className="line-clamp-2 text-[12.5px] leading-snug text-text-secondary"
            >
              {agent.description}
            </p>
          )}

          {/* Footer: model badge + Usar button */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-light pt-2.5">
            <div className="flex min-w-0 items-center gap-2.5 text-[11px] text-text-tertiary">
              {agent.model && (
                <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
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
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
              className="shrink-0 rounded-md bg-surface-active px-3 py-1 text-[12px] font-medium hover:bg-surface-hover"
            >
              {localize('com_ui_use')}
            </button>
          </div>
        </div>
      </OGDialogTrigger>

      <AgentDetailContent agent={agent} />
    </OGDialog>
  );
};

export default AgentCard;
