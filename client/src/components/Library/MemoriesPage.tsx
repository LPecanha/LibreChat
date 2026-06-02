import { useMemo, useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Brain } from 'lucide-react';
import { matchSorter } from 'match-sorter';
import { SystemRoles, PermissionTypes, Permissions } from 'librechat-data-provider';
import {
  Button,
  Spinner,
  OGDialogTrigger,
  TooltipAnchor,
  useToastContext,
} from '@librechat/client';
import type { TUserMemory } from 'librechat-data-provider';
import {
  useUpdateMemoryPreferencesMutation,
  useMemoriesQuery,
  useGetUserQuery,
} from '~/data-provider';
import { useLocalize, useAuthContext, useHasAccess } from '~/hooks';
import MemoryCreateDialog from '~/components/SidePanel/Memories/MemoryCreateDialog';
import MemoryCardActions from '~/components/SidePanel/Memories/MemoryCardActions';
import AdminSettings from '~/components/SidePanel/Memories/AdminSettings';
import { cn } from '~/utils';
import LibraryPageLayout from './PageLayout';

/**
 * [EXT] Phase J.17 Navvia — view-memories.
 * Code-vs-code com design/ui-preview.html linhas 887-904:
 *
 *   <section max-w-4xl px-6 py-10>
 *     <header h1 "Memórias" + sub + CTA bg-brand "+ Nova memória">
 *     <toolbar mt-5 flex gap-3>
 *       <filter ctrl flex-1 rounded-md border-medium bg-primary>
 *         <svg search /> <input "Filtrar memórias" />
 *       <token-badge rounded-full bg amber/14 text-warning text-[11.5px]>
 *         2,4k / 10k tokens · 24%
 *       <admin-btn ctrl rounded-md border-medium px-3>Admin
 *     <list mt-4 divide-y rounded-lg border>
 *       <item flex items-start gap-3 px-4 py-3>
 *         <div flex-1>
 *           <row: <span font-mono font-semibold "key"/> <badge "X tokens"/>>
 *           <p mt-0.5 text-[13px] text-secondary "value"/>
 *         </div>
 *         <date text-[11px] text-tertiary>12 mai 2026</date>
 *         <three-dot menu>
 *       </item>
 *
 * Substitui MemoryPanel upstream. Reusa data layer: useMemoriesQuery,
 * useUpdateMemoryPreferencesMutation, useGetUserQuery, MemoryCreateDialog,
 * MemoryCardActions, AdminSettings.
 */

const pageSize = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function MemoryRow({
  memory,
  hasUpdateAccess,
}: {
  memory: TUserMemory;
  hasUpdateAccess: boolean;
}) {
  const localize = useLocalize();
  return (
    <div className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-hover">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-[12.5px] font-semibold text-text-primary">
            {memory.key}
          </span>
          {memory.tokenCount !== undefined && (
            <span className="shrink-0 rounded bg-surface-active px-1.5 py-0.5 text-[10px] text-text-tertiary">
              {memory.tokenCount}{' '}
              {localize(memory.tokenCount === 1 ? 'com_ui_token' : 'com_ui_tokens')}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[13px] text-text-secondary">{memory.value}</div>
      </div>
      <span className="shrink-0 whitespace-nowrap text-[11px] text-text-tertiary">
        {formatDate(memory.updated_at)}
      </span>
      {hasUpdateAccess && (
        <div className="shrink-0">
          <MemoryCardActions memory={memory} />
        </div>
      )}
    </div>
  );
}

function TokenUsagePill({
  totalTokens,
  tokenLimit,
  percentage,
}: {
  totalTokens?: number;
  tokenLimit: number;
  percentage: number;
}) {
  const localize = useLocalize();
  const label =
    totalTokens !== undefined
      ? `${formatTokens(totalTokens)} / ${formatTokens(tokenLimit)} ${localize('com_ui_tokens')} · ${percentage}%`
      : `${percentage}%`;
  /* [EXT] Phase J.17 Navvia: proto (linha 895) usa amber bg rgba(245,158,11,.14)
   * com text-warning para qualquer percentual. O upstream tinha 3 cores (green/
   * yellow/red). Aqui escolhi cor única (amber/warning) só intensificando ao
   * cruzar 75% (red) — mantém consistência visual com proto e ainda alerta. */
  const cls =
    percentage > 90
      ? 'bg-text-destructive/10 text-text-destructive'
      : percentage > 75
        ? 'bg-text-warning/14 text-text-warning'
        : 'bg-text-warning/14 text-text-warning';
  return (
    <span
      className={cn('whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-medium', cls)}
      role="status"
    >
      {label}
    </span>
  );
}

export default function MemoriesPage() {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const { data: userData } = useGetUserQuery();
  const { data: memData, isLoading } = useMemoriesQuery();
  const { showToast } = useToastContext();
  const [pageIndex, setPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [useMemory, setUseMemory] = useState(true);

  const updatePrefsMutation = useUpdateMemoryPreferencesMutation({
    onSuccess: () =>
      showToast({ message: localize('com_ui_preferences_updated'), status: 'success' }),
    onError: () => {
      showToast({ message: localize('com_ui_error_updating_preferences'), status: 'error' });
      setUseMemory((prev) => !prev);
    },
  });

  useEffect(() => {
    if (userData?.personalization?.memories !== undefined) {
      setUseMemory(userData.personalization.memories);
    }
  }, [userData?.personalization?.memories]);

  const hasReadAccess = useHasAccess({
    permissionType: PermissionTypes.MEMORIES,
    permission: Permissions.READ,
  });
  const hasUpdateAccess = useHasAccess({
    permissionType: PermissionTypes.MEMORIES,
    permission: Permissions.UPDATE,
  });
  const hasCreateAccess = useHasAccess({
    permissionType: PermissionTypes.MEMORIES,
    permission: Permissions.CREATE,
  });
  const hasOptOutAccess = useHasAccess({
    permissionType: PermissionTypes.MEMORIES,
    permission: Permissions.OPT_OUT,
  });

  const memories: TUserMemory[] = useMemo(() => memData?.memories ?? [], [memData]);
  const filtered = useMemo(
    () => matchSorter(memories, searchQuery, { keys: ['key', 'value'] }),
    [memories, searchQuery],
  );
  const totalPages = Math.ceil(filtered.length / pageSize);
  const currentRows = useMemo(
    () => filtered.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [filtered, pageIndex],
  );

  useEffect(() => setPageIndex(0), [searchQuery]);

  const cta = hasCreateAccess && (
    <MemoryCreateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
      <OGDialogTrigger asChild>
        <button
          type="button"
          onClick={() => setCreateDialogOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <Plus className="h-[15px] w-[15px]" strokeWidth={2} />
          {localize('com_ui_create_memory')}
        </button>
      </OGDialogTrigger>
    </MemoryCreateDialog>
  );

  if (!hasReadAccess) {
    return (
      <LibraryPageLayout
        title={localize('com_ui_memories')}
        subtitle={localize('com_ui_memories_subtitle')}
        maxWidth="max-w-4xl"
      >
        <p className="text-sm text-text-secondary">{localize('com_ui_no_read_access')}</p>
      </LibraryPageLayout>
    );
  }

  return (
    <LibraryPageLayout
      title={localize('com_ui_memories')}
      subtitle={localize('com_ui_memories_subtitle')}
      maxWidth="max-w-4xl"
      action={cta}
    >
      {/* Toolbar: search + token badge + admin */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 flex-1 items-center gap-2 rounded-md border border-border-medium bg-surface-primary px-2.5 text-text-tertiary">
          <Search className="h-[13px] w-[13px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={localize('com_ui_memories_filter')}
            className="w-full bg-transparent text-[12.5px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
            aria-label={localize('com_ui_memories_filter')}
          />
        </div>
        {memData?.tokenLimit != null && (
          <TokenUsagePill
            totalTokens={memData.totalTokens}
            tokenLimit={memData.tokenLimit}
            percentage={memData.usagePercentage ?? 0}
          />
        )}
        {user?.role === SystemRoles.ADMIN && (
          /* AdminSettings é um próprio dialog trigger; ele estiliza o trigger
           * como Button outline. Aqui só damos contexto. */
          <AdminSettings />
        )}
        {hasOptOutAccess && (
          <Button
            size="sm"
            variant="outline"
            className={cn(
              'h-8 shrink-0 rounded-md text-[12.5px]',
              useMemory && 'bg-surface-active',
            )}
            onClick={() => {
              setUseMemory((prev) => !prev);
              updatePrefsMutation.mutate({ memories: !useMemory });
            }}
            aria-pressed={useMemory}
            disabled={updatePrefsMutation.isLoading}
          >
            {localize('com_ui_use_memory')}
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="mt-4 flex items-center justify-center p-8">
          <Spinner className="size-6" aria-label={localize('com_ui_loading')} />
        </div>
      ) : currentRows.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-medium bg-surface-secondary p-10 text-center">
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-surface-active">
            <Brain className="size-5 text-text-secondary" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-text-primary">
            {searchQuery
              ? localize('com_ui_no_memories_match')
              : localize('com_ui_no_memories_title')}
          </p>
          {!searchQuery && (
            <p className="mt-0.5 text-xs text-text-tertiary">
              {localize('com_ui_no_memories')}
            </p>
          )}
        </div>
      ) : (
        <div
          className="mt-4 divide-y divide-border-light overflow-hidden rounded-lg border border-border-light bg-surface-primary"
          role="list"
          aria-label={localize('com_ui_memories')}
        >
          {currentRows.map((memory) => (
            <div key={memory.key} role="listitem">
              <MemoryRow memory={memory} hasUpdateAccess={hasUpdateAccess} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="mt-3 flex items-center justify-end gap-2" role="navigation">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setPageIndex((p) => Math.max(p - 1, 0))}
            disabled={pageIndex === 0}
          >
            {localize('com_ui_prev')}
          </Button>
          <span className="text-[12.5px] text-text-tertiary" aria-live="polite">
            {pageIndex + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setPageIndex((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={pageIndex + 1 >= totalPages}
          >
            {localize('com_ui_next')}
          </Button>
        </div>
      )}
    </LibraryPageLayout>
  );
}
