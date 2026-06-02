import { useMemo, useState, useId } from 'react';
import * as Ariakit from '@ariakit/react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreVertical, Eye, SquarePen, Trash, EarthIcon, User } from 'lucide-react';
import {
  Label,
  Button,
  Spinner,
  OGDialog,
  TooltipAnchor,
  DropdownPopup,
  OGDialogTemplate,
  useToastContext,
} from '@librechat/client';
import {
  PermissionBits,
  PermissionTypes,
  Permissions,
  ResourceType,
} from 'librechat-data-provider';
import type { TPromptGroup } from 'librechat-data-provider';
import { useGetAllPromptGroups, useGetCategories, useDeletePromptGroup } from '~/data-provider';
import { useLocalize, useHasAccess, useAuthContext, useResourcePermissions } from '~/hooks';
import { useLiveAnnouncer } from '~/Providers';
import CategoryIcon from '~/components/Prompts/utils/CategoryIcon';
import { PreviewPrompt, CreatePromptDialog } from '~/components/Prompts/dialogs';
import { cn } from '~/utils';
import LibraryPageLayout from './PageLayout';

/**
 * [EXT] Phase J.17 Navvia — view-prompts.
 * Code-vs-code com design/ui-preview.html linhas 846-863:
 *
 *   <section max-w-5xl px-6 py-10>
 *     <header h1 "Prompts" + sub + CTA "+ Criar prompt">
 *     <toolbar mt-5: chips categorias + search ml-auto w-56>
 *     <grid mt-5 cols 1/2/3 gap-3>
 *       <card .agent-card>
 *         <row: agent-ico + (name + author/global badge) + 3-dot menu>
 *         <subtitle "Categoria · X variáveis">
 *         <p oneliner>
 *       </card>
 *       <card dashed "+ Criar prompt">
 *
 * Card click → abre PreviewPrompt (com botão "Usar prompt" interno).
 * 3-dot menu → Preview / Editar / Excluir (gated por per-resource perms).
 *
 * Reusa todo o data layer upstream:
 *   - useGetAllPromptGroups / useGetCategories
 *   - useDeletePromptGroup
 *   - PreviewPrompt (modal de visualização)
 *   - useResourcePermissions (per-prompt edit/delete bits)
 *   - DropdownPopup (Ariakit menu)
 */

function PromptCard({ group }: { group: TPromptGroup }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { showToast } = useToastContext();
  const { announcePolite } = useLiveAnnouncer();
  const menuId = useId();

  const [menuOpen, setMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { hasPermission } = useResourcePermissions(ResourceType.PROMPTGROUP, group._id || '');
  const canEdit = hasPermission(PermissionBits.EDIT);
  const canDelete = hasPermission(PermissionBits.DELETE);

  const isSharedPrompt = group.author !== user?.id && Boolean(group.authorName);
  const isGlobal = group.isPublic === true;

  const variableCount = useMemo(() => {
    const text = group.productionPrompt?.prompt ?? '';
    const matches = text.match(/\{\{[^}]+\}\}/g);
    return matches?.length ?? 0;
  }, [group.productionPrompt?.prompt]);

  const deleteGroup = useDeletePromptGroup({
    onSuccess: () => {
      setDeleteOpen(false);
      announcePolite({
        message: localize('com_ui_prompt_deleted_group', { 0: group.name }),
        isStatus: true,
      });
    },
    onError: () => {
      showToast({ status: 'error', message: localize('com_ui_prompt_delete_error') });
    },
  });

  const handleDelete = () => {
    if (group._id) deleteGroup.mutate({ id: group._id });
  };

  const dropdownItems = useMemo(() => {
    const items: Array<{ label: string; onClick: () => void; icon: React.ReactNode }> = [
      {
        label: localize('com_ui_preview'),
        onClick: () => setPreviewOpen(true),
        icon: <Eye className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      },
    ];
    if (canEdit) {
      items.push({
        label: localize('com_ui_edit'),
        onClick: () => navigate(`/prompts/${group._id}`),
        icon: <SquarePen className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      });
    }
    if (canDelete) {
      items.push({
        label: localize('com_ui_delete'),
        onClick: () => setDeleteOpen(true),
        icon: <Trash className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      });
    }
    return items;
  }, [localize, canEdit, canDelete, group._id, navigate]);

  const ariaLabel = group.category
    ? localize('com_ui_prompt_group_button', { name: group.name, category: group.category })
    : localize('com_ui_prompt_group_button_no_category', { name: group.name });

  const subtitleParts: string[] = [];
  if (group.category) subtitleParts.push(group.category);
  if (variableCount > 0) {
    subtitleParts.push(
      `${variableCount} ${localize(variableCount === 1 ? 'com_ui_variable' : 'com_ui_variables')}`,
    );
  }

  return (
    <>
      <div className="agent-card group relative">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="absolute inset-0 z-0 rounded-[inherit] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
          aria-label={ariaLabel}
        />
        <div className="relative z-10 flex items-start gap-3">
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
              {isGlobal ? (
                <TooltipAnchor
                  description={localize('com_ui_sr_global_prompt')}
                  side="top"
                  render={
                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-surface-active px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                      <EarthIcon className="size-2.5" aria-hidden="true" />
                      {localize('com_ui_global')}
                    </span>
                  }
                />
              ) : isSharedPrompt ? (
                <TooltipAnchor
                  description={localize('com_ui_by_author', { 0: group.authorName })}
                  side="top"
                  render={
                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-surface-active px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                      <User className="size-2.5" aria-hidden="true" />
                      {group.authorName}
                    </span>
                  }
                />
              ) : (
                <span className="shrink-0 rounded bg-surface-active px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                  {localize('com_ui_by_you')}
                </span>
              )}
            </div>
            {subtitleParts.length > 0 && (
              <div className="mt-0.5 text-[11px] text-text-tertiary">
                {subtitleParts.join(' · ')}
              </div>
            )}
          </div>
          <div className="relative z-20 shrink-0" onClick={(e) => e.stopPropagation()}>
            <DropdownPopup
              portal
              menuId={menuId}
              focusLoop
              unmountOnHide
              isOpen={menuOpen}
              setIsOpen={setMenuOpen}
              className="z-[125]"
              trigger={
                <Ariakit.MenuButton
                  aria-label={localize('com_nav_convo_menu_options')}
                  className={cn(
                    'grid h-7 w-7 place-items-center rounded text-text-tertiary transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary',
                    menuOpen
                      ? 'opacity-100'
                      : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="size-[15px]" aria-hidden="true" />
                </Ariakit.MenuButton>
              }
              items={dropdownItems}
            />
          </div>
        </div>
        {group.oneliner && (
          <p className="relative z-10 mt-2 line-clamp-2 text-[12.5px] leading-snug text-text-secondary">
            {group.oneliner}
          </p>
        )}
      </div>

      <PreviewPrompt group={group} open={previewOpen} onOpenChange={setPreviewOpen} />
      <OGDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <OGDialogTemplate
          title={localize('com_ui_delete_prompt')}
          className="w-11/12 max-w-md"
          main={<Label>{localize('com_ui_prompt_delete_confirm', { 0: group.name })}</Label>}
          selection={
            <Button onClick={handleDelete} variant="destructive" disabled={deleteGroup.isLoading}>
              {deleteGroup.isLoading ? <Spinner /> : localize('com_ui_delete')}
            </Button>
          }
        />
      </OGDialog>
    </>
  );
}

export default function PromptsPage() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

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
    () => [{ value: 'all', label: localize('com_ui_all') }, ...categoriesData],
    [categoriesData, localize],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return groups.filter((g) => {
      const matchCategory = activeCategory === 'all' || g.category === activeCategory;
      const matchQuery =
        !q ||
        g.name.toLowerCase().includes(q) ||
        (g.oneliner ?? '').toLowerCase().includes(q);
      return matchCategory && matchQuery;
    });
  }, [groups, activeCategory, searchQuery]);

  const cta = hasCreateAccess && (
    <button
      type="button"
      onClick={() => setCreateOpen(true)}
      className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand"
    >
      <Plus className="h-[15px] w-[15px]" strokeWidth={2} aria-hidden="true" />
      {localize('com_ui_create_prompt')}
    </button>
  );

  const hasFilterActive = activeCategory !== 'all' || searchQuery.trim().length > 0;

  return (
    <LibraryPageLayout
      title={localize('com_ui_prompts')}
      subtitle={
        <>
          {localize('com_ui_prompts_subtitle_prefix')}{' '}
          <span className="font-mono">/</span>{' '}
          {localize('com_ui_prompts_subtitle_suffix')}
        </>
      }
      maxWidth="max-w-5xl"
      action={cta}
    >
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

      {isLoading ? (
        <div className="mt-5 flex items-center justify-center p-8">
          <Spinner className="size-6" aria-label={localize('com_ui_loading')} />
        </div>
      ) : filtered.length === 0 && hasFilterActive ? (
        <div className="mt-5 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-medium bg-surface-secondary p-10 text-center">
          <p className="text-sm font-medium text-text-primary">
            {localize('com_ui_no_prompts_found')}
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setSearchQuery('');
            }}
            className="mt-2 text-[12px] font-medium text-brand hover:underline"
          >
            {localize('com_ui_clear_filters')}
          </button>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((group) => (
            <PromptCard key={group._id} group={group} />
          ))}
          {hasCreateAccess && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
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

      <CreatePromptDialog
        isOpen={createOpen}
        setIsOpen={setCreateOpen}
        onCreated={(groupId) => navigate(`/prompts/${groupId}`)}
      />
    </LibraryPageLayout>
  );
}
