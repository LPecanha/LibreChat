import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreVertical } from 'lucide-react';
import {
  PermissionTypes,
  Permissions,
} from 'librechat-data-provider';
import type { TPromptGroup } from 'librechat-data-provider';
import { Spinner } from '@librechat/client';
import { useGetAllPromptGroups, useGetCategories } from '~/data-provider';
import { useLocalize, useHasAccess } from '~/hooks';
import CategoryIcon from '~/components/Prompts/utils/CategoryIcon';
import { cn } from '~/utils';
import LibraryPageLayout from './PageLayout';

/**
 * [EXT] Phase J.17 Navvia — view-prompts.
 * Code-vs-code com design/ui-preview.html linhas 845-863:
 *
 *   <section max-w-5xl px-6 py-10>
 *     <header h1 "Prompts" + sub "Modelos... Use com / no chat" + CTA "+ Criar prompt">
 *     <toolbar mt-5 flex flex-wrap items-center gap-2>
 *       <chips: Todos / Escrita / Código / Marketing / Produtividade>
 *       <search ml-auto w-56 ctrl border-medium bg-primary>
 *     <grid mt-5 grid-cols-1 sm:2 xl:3 gap-3>
 *       <card .agent-card>
 *         <row: icon + (name + author-badge) + 3-dot menu>
 *         <subtitle: "Categoria · X variáveis">
 *         <p text-[12.5px] text-secondary>descrição</p>
 *       </card>
 *       <card .agent-card border-dashed text-center>     <-- Criar prompt tile
 *         <icon bg-brand-soft text-brand "+" >
 *         <strong "Criar prompt">
 *         <p text-[12px] "Com variáveis e versões.">
 *       </card>
 *
 * Substitui InlinePromptsView (que ia direto pro form de criação) na
 * rota /prompts. /prompts/new e /prompts/:id continuam apontando para o
 * InlinePromptsView (form). A nova PromptsPage é a lista de prompts.
 */

function PromptCard({
  group,
  onClick,
}: {
  group: TPromptGroup;
  onClick: () => void;
}) {
  const localize = useLocalize();
  const variableCount = useMemo(() => {
    const text = group.productionPrompt?.prompt ?? '';
    const matches = text.match(/\{\{[^}]+\}\}/g);
    return matches?.length ?? 0;
  }, [group.productionPrompt?.prompt]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="agent-card text-left"
      aria-label={localize('com_ui_prompt_group_button', {
        name: group.name,
        category: group.category ?? '',
      })}
    >
      <div className="flex items-start gap-3">
        <div className="agent-ico">
          <CategoryIcon
            category={group.category ?? ''}
            className="size-5"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium text-text-primary">{group.name}</span>
            {group.authorName && (
              <span className="rounded bg-surface-active px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                {localize('com_ui_by_author', { 0: group.authorName })}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-text-tertiary">
            {[group.category, variableCount > 0
              ? `${variableCount} ${localize(variableCount === 1 ? 'com_ui_variable' : 'com_ui_variables')}`
              : null]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded text-text-tertiary hover:bg-surface-hover"
          aria-hidden="true"
        >
          <MoreVertical className="size-[15px]" />
        </span>
      </div>
      {group.oneliner && (
        <p className="text-[12.5px] leading-snug text-text-secondary line-clamp-2">
          {group.oneliner}
        </p>
      )}
    </button>
  );
}

export default function PromptsPage() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const hasReadAccess = useHasAccess({
    permissionType: PermissionTypes.PROMPTS,
    permission: Permissions.USE,
  });
  const hasCreateAccess = useHasAccess({
    permissionType: PermissionTypes.PROMPTS,
    permission: Permissions.CREATE,
  });

  const { data: groups = [], isLoading } = useGetAllPromptGroups(undefined, {
    enabled: hasReadAccess,
  });
  const { data: categoriesData = [] } = useGetCategories({ enabled: hasReadAccess });

  const categories = useMemo(
    () => [
      { value: 'all', label: localize('com_ui_all') },
      ...categoriesData,
    ],
    [categoriesData, localize],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return groups.filter((g) => {
      const matchCategory =
        activeCategory === 'all' || g.category === activeCategory;
      const matchQuery =
        !q ||
        g.name.toLowerCase().includes(q) ||
        (g.oneliner ?? '').toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [groups, activeCategory, searchQuery]);

  const handleCardClick = (groupId?: string) => {
    if (groupId) navigate(`/prompts/${groupId}`);
  };

  const cta = hasCreateAccess && (
    <button
      type="button"
      onClick={() => navigate('/prompts/new')}
      className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand"
    >
      <Plus className="h-[15px] w-[15px]" strokeWidth={2} />
      {localize('com_ui_create_prompt')}
    </button>
  );

  return (
    <LibraryPageLayout
      title={localize('com_ui_prompts')}
      subtitle={
        /* [EXT] Phase J.17: proto linha 849 tem <span class="font-mono">/</span> inline
         * — usar via composição (LibraryPageLayout.subtitle aceita ReactNode). */
        <>
          {localize('com_ui_prompts_subtitle_prefix')}{' '}
          <span className="font-mono">/</span>{' '}
          {localize('com_ui_prompts_subtitle_suffix')}
        </>
      }
      maxWidth="max-w-5xl"
      action={cta}
    >
      {/* Toolbar: category chips + search */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-[11px] py-[6px] text-[12.5px] font-medium transition-colors',
              activeCategory === cat.value
                ? 'border-brand bg-brand text-brand-fg'
                : 'border-border-light bg-surface-secondary text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            )}
          >
            {typeof cat.label === 'string' && cat.label.startsWith('com_')
              ? localize(cat.label as Parameters<typeof localize>[0])
              : cat.label}
          </button>
        ))}
        <div className="ml-auto flex h-8 w-56 items-center gap-2 rounded-md border border-border-medium bg-surface-primary px-2.5 text-text-tertiary">
          <Search className="h-[13px] w-[13px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={localize('com_ui_search_prompts')}
            className="w-full bg-transparent text-[12.5px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
            aria-label={localize('com_ui_search_prompts')}
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="mt-5 flex items-center justify-center p-8">
          <Spinner className="size-6" aria-label={localize('com_ui_loading')} />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((group) => (
            <PromptCard
              key={group._id}
              group={group}
              onClick={() => handleCardClick(group._id)}
            />
          ))}
          {/* [EXT] Tile "Criar prompt" no fim do grid — proto linha 860 */}
          {hasCreateAccess && (
            <button
              type="button"
              onClick={() => navigate('/prompts/new')}
              className="agent-card border-dashed text-center"
              style={{ alignItems: 'center', justifyContent: 'center' }}
              aria-label={localize('com_ui_create_prompt')}
            >
              <div
                className="agent-ico"
                style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
                aria-hidden="true"
              >
                <Plus className="size-5" strokeWidth={2} />
              </div>
              <div className="font-medium">{localize('com_ui_create_prompt')}</div>
              <div className="text-[12px] leading-snug text-text-tertiary">
                {localize('com_ui_create_prompt_subtitle')}
              </div>
            </button>
          )}
        </div>
      )}
    </LibraryPageLayout>
  );
}
