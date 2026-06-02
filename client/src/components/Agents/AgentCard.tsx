import React, { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { OGDialog, OGDialogTrigger } from '@librechat/client';
import type t from 'librechat-data-provider';
import { useLocalize, TranslationKeys, useAgentCategories } from '~/hooks';
import { cn, renderAgentAvatar, getContactDisplayName } from '~/utils';
import AgentDetailContent from './AgentDetailContent';

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
            <div className="flex items-center gap-2.5 text-[11px] text-text-tertiary">
              {/* Model badge — vazio por enquanto, sem dado upstream */}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
              className="rounded-md bg-surface-active px-3 py-1 text-[12px] font-medium hover:bg-surface-hover"
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
