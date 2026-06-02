import React from 'react';
import { useRecoilValue } from 'recoil';
import { TooltipAnchor } from '@librechat/client';
import { MessageCircleDashed } from 'lucide-react';
import { useRecoilState, useRecoilCallback } from 'recoil';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

export function TemporaryChat() {
  const localize = useLocalize();
  const [isTemporary, setIsTemporary] = useRecoilState(store.isTemporary);
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const isSubmitting = useRecoilValue(store.isSubmittingFamily(0));

  const handleBadgeToggle = useRecoilCallback(
    () => () => {
      setIsTemporary(!isTemporary);
    },
    [isTemporary],
  );

  if (
    (Array.isArray(conversation?.messages) && conversation.messages.length >= 1) ||
    isSubmitting
  ) {
    return null;
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <TooltipAnchor
        description={localize('com_ui_temporary')}
        render={
          <button
            onClick={handleBadgeToggle}
            aria-label={localize('com_ui_temporary')}
            aria-pressed={isTemporary}
            /* [EXT] Phase J.16 Navvia: ghost button h-8 rounded-md (proto linha 800). */
            className={cn(
              'grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors',
              isTemporary
                ? 'bg-surface-active text-text-primary'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            )}
          >
            <MessageCircleDashed className="icon-md" aria-hidden="true" />
          </button>
        }
      />
    </div>
  );
}
