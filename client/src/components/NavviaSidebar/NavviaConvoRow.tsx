import { useState, useRef, useId, useEffect, KeyboardEvent } from 'react';
import * as Ariakit from '@ariakit/react';
import {
  Ellipsis,
  Share2,
  Pen,
  CopyPlus,
  Archive,
  Trash,
} from 'lucide-react';
import {
  Button,
  Label,
  Spinner,
  OGDialog,
  DropdownPopup,
  OGDialogTemplate,
  useToastContext,
} from '@librechat/client';
import type { TConversation } from 'librechat-data-provider';
import {
  useUpdateConversationMutation,
  useDeleteConversationMutation,
  useDuplicateConversationMutation,
  useArchiveConvoMutation,
} from '~/data-provider';
import ShareButton from '~/components/Conversations/ConvoOptions/ShareButton';
import { useLocalize } from '~/hooks';
import { NotificationSeverity } from '~/common';
import { cn } from '~/utils';

/**
 * [EXT] Phase J.21 Navvia: linha de conversa do NavviaSidebar com 3-dot menu
 * funcional. Bate com proto linhas 568-577 (#view-shell — sidebar-main).
 *
 *   <div class="navitem convo-active group">
 *     <span clickable>dot · title</span>
 *     <button class="hover-actions">···</button>
 *     <pop>
 *       Compartilhar · Renomear · Duplicar · Arquivar · ─── · Excluir
 *     </pop>
 *
 * Comportamento:
 * - Rename inline: clicar "Renomear" troca o título por um <input>.
 *   Enter salva via useUpdateConversationMutation. Escape cancela.
 * - Delete: OGDialog de confirmação. Mutate via useDeleteConversationMutation.
 * - Duplicate / Archive: mutate direto, toast no sucesso.
 * - Share: reusa ShareButton upstream (modal próprio com QR code + link).
 *
 * Reusa todas as 4 mutations + ShareButton upstream — só o markup é Navvia.
 */
interface NavviaConvoRowProps {
  conversation: TConversation;
  isActive: boolean;
  onOpen: () => void;
}

export default function NavviaConvoRow({
  conversation,
  isActive,
  onOpen,
}: NavviaConvoRowProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const menuId = useId();
  const conversationId = conversation.conversationId ?? '';
  const initialTitle = conversation.title || localize('com_ui_new_chat');

  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState(initialTitle);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const shareTriggerRef = useRef<HTMLButtonElement>(null);

  const updateMutation = useUpdateConversationMutation(conversationId);
  const deleteMutation = useDeleteConversationMutation({
    onSuccess: () => {
      setDeleteOpen(false);
      showToast({ message: localize('com_ui_convo_delete_success') });
    },
    onError: () =>
      showToast({
        message: localize('com_ui_convo_delete_error'),
        severity: NotificationSeverity.ERROR,
      }),
  });
  const duplicateMutation = useDuplicateConversationMutation({
    onSuccess: () =>
      showToast({ message: localize('com_ui_duplication_success') }),
    onError: () =>
      showToast({
        message: localize('com_ui_duplication_error'),
        severity: NotificationSeverity.ERROR,
      }),
  });
  const archiveMutation = useArchiveConvoMutation();

  /* Focus + select the input when renaming starts. */
  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  /* Reset cached title if the conversation title changes from elsewhere. */
  useEffect(() => {
    if (!renaming) setTitleInput(initialTitle);
  }, [initialTitle, renaming]);

  const submitRename = async () => {
    const next = titleInput.trim();
    if (!next || next === initialTitle) {
      setRenaming(false);
      setTitleInput(initialTitle);
      return;
    }
    try {
      await updateMutation.mutateAsync({
        conversationId,
        title: next,
      });
      setRenaming(false);
    } catch {
      showToast({
        message: localize('com_ui_rename_failed'),
        severity: NotificationSeverity.ERROR,
      });
      setTitleInput(initialTitle);
      setRenaming(false);
    }
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTitleInput(initialTitle);
      setRenaming(false);
    }
  };

  const handleArchive = () => {
    archiveMutation.mutate(
      { conversationId, isArchived: true },
      {
        onSuccess: () =>
          showToast({ message: localize('com_ui_archive_success') }),
        onError: () =>
          showToast({
            message: localize('com_ui_archive_error'),
            severity: NotificationSeverity.ERROR,
          }),
      },
    );
  };

  const handleDelete = () => {
    if (!conversationId) return;
    deleteMutation.mutate({ conversationId, thread_id: '', endpoint: '' });
  };

  const dropdownItems = [
    {
      label: localize('com_ui_share'),
      icon: <Share2 className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      onClick: () => setShareOpen(true),
      hideOnClick: false,
      ref: shareTriggerRef,
      render: (props: React.ComponentProps<'button'>) => <button {...props} />,
    },
    {
      label: localize('com_ui_rename'),
      icon: <Pen className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      onClick: () => {
        setMenuOpen(false);
        setTitleInput(initialTitle);
        setRenaming(true);
      },
    },
    {
      label: localize('com_ui_duplicate'),
      icon: <CopyPlus className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      onClick: () => duplicateMutation.mutate({ conversationId }),
    },
    {
      label: localize('com_ui_archive'),
      icon: <Archive className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      onClick: handleArchive,
    },
    {
      separate: true as const,
    },
    {
      label: localize('com_ui_delete'),
      icon: <Trash className="icon-sm mr-2 text-text-destructive" aria-hidden="true" />,
      onClick: () => setDeleteOpen(true),
      className: 'text-text-destructive hover:bg-red-50 dark:hover:bg-red-950/30',
      hideOnClick: false,
    },
  ];

  return (
    <>
      <div className={cn('navitem group relative', isActive && 'convo-active')}>
        {renaming ? (
          <input
            ref={inputRef}
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onKeyDown={onInputKey}
            onBlur={() => void submitRename()}
            className="w-full flex-1 rounded-sm border border-border-medium bg-surface-primary px-1 py-0 text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label={localize('com_ui_rename')}
          />
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden bg-transparent text-left"
          >
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                isActive ? '' : 'bg-text-tertiary',
              )}
              style={
                isActive
                  ? { background: 'linear-gradient(135deg,#2469e2,#11b38d)' }
                  : undefined
              }
              aria-hidden="true"
            />
            <span className="truncate">{initialTitle}</span>
          </button>
        )}

        {!renaming && (
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
                ref={menuButtonRef}
                aria-label={localize('com_nav_convo_menu_options')}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'hover-actions ml-auto grid h-5 w-5 shrink-0 place-items-center rounded text-text-tertiary transition-opacity hover:bg-surface-active hover:text-text-primary focus-visible:opacity-100',
                  menuOpen && 'opacity-100',
                )}
              >
                <Ellipsis className="size-[14px]" aria-hidden="true" />
              </Ariakit.MenuButton>
            }
            items={dropdownItems}
          />
        )}
      </div>

      {/* Delete confirmation */}
      <OGDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <OGDialogTemplate
          showCloseButton={false}
          title={localize('com_ui_delete_conversation')}
          className="max-w-[450px]"
          main={
            <Label className="text-left text-sm">
              {localize('com_ui_delete_confirm')}{' '}
              <strong>{initialTitle}</strong>
            </Label>
          }
          selection={
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={deleteMutation.isLoading}
            >
              {deleteMutation.isLoading ? <Spinner /> : localize('com_ui_delete')}
            </Button>
          }
        />
      </OGDialog>

      {/* Share dialog (upstream ShareButton controlled externally) */}
      {conversationId && (
        <ShareButton
          conversationId={conversationId}
          open={shareOpen}
          onOpenChange={setShareOpen}
          triggerRef={shareTriggerRef}
        />
      )}
    </>
  );
}
