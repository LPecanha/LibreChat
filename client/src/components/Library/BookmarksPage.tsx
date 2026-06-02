import { useState, useCallback, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Plus, GripVertical, Bookmark, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  FilterInput,
  OGDialog,
  OGDialogTrigger,
  OGDialogTemplate,
  TooltipAnchor,
  useToastContext,
} from '@librechat/client';
import type { TConversationTag } from 'librechat-data-provider';
import {
  useConversationTagsQuery,
  useConversationTagMutation,
  useDeleteConversationTagMutation,
} from '~/data-provider';
import { BookmarkEditDialog } from '~/components/Bookmarks';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import LibraryPageLayout from './PageLayout';

/**
 * [EXT] Phase J.17 Navvia — view-bookmarks.
 * Code-vs-code com design/ui-preview.html linhas 928-940:
 *
 *   <section max-w-3xl px-6 py-10>
 *     <header h1 "Bookmarks" + sub + CTA bg-brand "+ Nova tag">
 *     <list space-y-2 mt-5>
 *       <item rounded-lg border-light bg-surface-secondary px-3 py-2.5>
 *         <grip-handle cursor-grab text-tertiary>
 *         <bookmark-icon text-brand (ativo) | text-tertiary (inativo)>
 *         <flex-1: nome (font-medium) + descrição (text-[12px] text-tertiary)>
 *         <count-badge rounded-full bg-surface-active text-[11px] "X conversas">
 *         <btn edit (pencil text-tertiary)>
 *         <btn delete (trash text-tertiary hover:text-destructive)>
 *       </item>
 *     </list>
 *   </section>
 *
 * Substitui BookmarkPanel/BookmarkTable upstream (que tinha header próprio
 * com FilterInput inline). Reusa data layer: useConversationTagsQuery,
 * useConversationTagMutation, useDeleteConversationTagMutation,
 * BookmarkEditDialog.
 */

interface DragItem {
  index: number;
}

function NavviaBookmarkCard({
  bookmark,
  position,
  moveRow,
}: {
  bookmark: TConversationTag;
  position: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const ref = useRef<HTMLDivElement>(null);
  const editTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const positionMutation = useConversationTagMutation({
    context: 'NavviaBookmarkCard',
    tag: bookmark.tag,
  });
  const deleteMutation = useDeleteConversationTagMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_bookmarks_delete_success') });
      setDeleteOpen(false);
    },
    onError: () => {
      showToast({
        message: localize('com_ui_bookmarks_delete_error'),
        severity: NotificationSeverity.ERROR,
      });
    },
  });

  const handleDrop = (item: DragItem) => {
    positionMutation.mutate(
      { ...bookmark, position: item.index },
      {
        onSuccess: () =>
          showToast({
            message: localize('com_ui_bookmarks_update_success'),
            severity: NotificationSeverity.SUCCESS,
          }),
        onError: () =>
          showToast({
            message: localize('com_ui_bookmarks_update_error'),
            severity: NotificationSeverity.ERROR,
          }),
      },
    );
  };

  const [, drop] = useDrop({
    accept: 'bookmark',
    drop: handleDrop,
    hover(item: DragItem) {
      if (!ref.current || item.index === position) return;
      moveRow(item.index, position);
      item.index = position;
    },
  });
  const [{ isDragging }, drag] = useDrag({
    type: 'bookmark',
    item: { index: position },
    collect: (m) => ({ isDragging: m.isDragging() }),
  });
  drag(drop(ref));

  const conversationsLabel = `${bookmark.count ?? 0} ${localize(
    (bookmark.count ?? 0) === 1 ? 'com_ui_conversation' : 'com_ui_conversations',
  )}`;

  const confirmDelete = useCallback(async () => {
    await deleteMutation.mutateAsync(bookmark.tag);
  }, [bookmark.tag, deleteMutation]);

  return (
    <>
      <div
        ref={ref}
        className={cn(
          'group flex items-center gap-3 rounded-lg border border-border-light bg-surface-secondary px-3 py-2.5 transition-colors',
          isDragging && 'opacity-50',
        )}
      >
        <GripVertical
          className="size-4 shrink-0 cursor-grab text-text-tertiary"
          aria-hidden="true"
        />
        {/* [EXT] Proto sempre desenha o bookmark icon — primeiro item é text-brand
         * (favorito ativo), demais são text-tertiary. Como o model não tem flag
         * "fixed/featured", aplicamos brand quando bookmark.position === 0. */}
        <Bookmark
          className={cn(
            'size-[15px] shrink-0',
            position === 0 ? 'text-brand' : 'text-text-tertiary',
          )}
          fill={position === 0 ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-text-primary">{bookmark.tag}</div>
          {bookmark.description && (
            <div className="truncate text-[12px] text-text-tertiary">{bookmark.description}</div>
          )}
        </div>
        <TooltipAnchor
          description={conversationsLabel}
          side="top"
          render={
            <span className="shrink-0 rounded-full bg-surface-active px-2 py-0.5 text-[11px] text-text-tertiary">
              {conversationsLabel}
            </span>
          }
        />
        <BookmarkEditDialog
          context="NavviaBookmarkCard"
          bookmark={bookmark}
          open={editOpen}
          setOpen={setEditOpen}
          triggerRef={editTriggerRef}
        >
          <OGDialogTrigger asChild>
            <TooltipAnchor
              description={localize('com_ui_edit')}
              side="top"
              render={
                <button
                  ref={editTriggerRef}
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  aria-label={localize('com_ui_bookmarks_edit')}
                >
                  <Pencil className="size-[14px]" aria-hidden="true" />
                </button>
              }
            />
          </OGDialogTrigger>
        </BookmarkEditDialog>
        <OGDialog open={deleteOpen} onOpenChange={setDeleteOpen} triggerRef={deleteTriggerRef}>
          <OGDialogTrigger asChild>
            <TooltipAnchor
              description={localize('com_ui_delete')}
              side="top"
              render={
                <button
                  ref={deleteTriggerRef}
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-destructive"
                  aria-label={localize('com_ui_bookmarks_delete')}
                >
                  <Trash2 className="size-[14px]" aria-hidden="true" />
                </button>
              }
            />
          </OGDialogTrigger>
          <OGDialogTemplate
            showCloseButton={false}
            title={localize('com_ui_bookmarks_delete')}
            className="max-w-[450px]"
            main={
              <p className="text-left text-sm text-text-secondary">
                {localize('com_ui_bookmark_delete_confirm')} <strong>{bookmark.tag}</strong>
              </p>
            }
            selection={{
              selectHandler: confirmDelete,
              selectClasses:
                'bg-surface-destructive text-white transition-colors hover:bg-surface-destructive-hover',
              selectText: localize('com_ui_delete'),
            }}
          />
        </OGDialog>
      </div>
    </>
  );
}

function removeDuplicates(list: TConversationTag[]): TConversationTag[] {
  const seen = new Set<string | undefined>();
  return list.filter((b) => {
    if (seen.has(b._id)) return false;
    seen.add(b._id);
    return true;
  });
}

export default function BookmarksPage() {
  const localize = useLocalize();
  const { data: bookmarks = [] } = useConversationTagsQuery();
  const [rows, setRows] = useState<TConversationTag[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setRows(removeDuplicates(bookmarks).sort((a, b) => a.position - b.position));
  }, [bookmarks]);

  const moveRow = useCallback((dragIndex: number, hoverIndex: number) => {
    setRows((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, moved);
      return next.map((row, idx) => ({ ...row, position: idx }));
    });
  }, []);

  const filtered = rows.filter((r) =>
    r.tag.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const cta = (
    <BookmarkEditDialog context="BookmarksPage" open={createOpen} setOpen={setCreateOpen}>
      <OGDialogTrigger asChild>
        <button
          ref={addBtnRef}
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-[13px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <Plus className="h-[15px] w-[15px]" strokeWidth={2} />
          {localize('com_ui_bookmarks_new')}
        </button>
      </OGDialogTrigger>
    </BookmarkEditDialog>
  );

  return (
    <LibraryPageLayout
      title={localize('com_ui_bookmarks')}
      subtitle={localize('com_ui_bookmarks_subtitle')}
      maxWidth="max-w-3xl"
      action={cta}
    >
      {rows.length > 5 && (
        <FilterInput
          inputId="bookmarks-filter"
          label={localize('com_ui_bookmarks_filter')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          containerClassName="mb-4"
        />
      )}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-medium bg-surface-secondary p-10 text-center">
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-surface-active">
            <Bookmark className="size-5 text-text-secondary" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-text-primary">
            {searchQuery
              ? localize('com_ui_bookmarks_filter')
              : localize('com_ui_no_bookmarks')}
          </p>
          {!searchQuery && (
            <p className="mt-0.5 text-xs text-text-tertiary">
              {localize('com_ui_no_conversations_no_bookmarks_match_empty_state')}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label={localize('com_ui_bookmarks')}>
          {filtered.map((bookmark) => (
            <div key={bookmark._id} role="listitem">
              <NavviaBookmarkCard
                bookmark={bookmark}
                position={bookmark.position}
                moveRow={moveRow}
              />
            </div>
          ))}
        </div>
      )}
    </LibraryPageLayout>
  );
}
