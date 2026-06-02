import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import type { ReactNode } from 'react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

/**
 * [EXT] Phase J.14 Navvia: dialog wrapper estilo Settings (860×640 max) para
 * renderizar SidePanels (Memories, Bookmarks, MCP, Files) como modal a partir
 * da NavviaSidebar. Os panels originais são feitos para viver na sidebar
 * direita do UnifiedSidebar; aqui rodam dentro de um Dialog próprio.
 *
 * Mesma forma visual do <Settings />: sidebar 210px à esquerda (só com o título
 * + Fechar, sem tabs internas), content pane à direita com text-[13px].
 * X icon top-right.
 */
export default function PanelDialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const localize = useLocalize();
  return (
    <Transition appear show={open}>
      <Dialog as="div" className="relative z-50" onClose={onOpenChange}>
        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </TransitionChild>

        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className={cn('fixed inset-0 flex w-screen items-center justify-center p-4')}>
            <DialogPanel
              className={cn(
                'relative overflow-hidden rounded-xl border border-border-light bg-surface-overlay shadow-2xl backdrop-blur-2xl animate-in',
                'flex w-full max-w-[860px] flex-col',
                'h-[640px] max-h-[92vh]',
              )}
            >
              <DialogTitle
                as="div"
                className="flex items-center justify-between border-b border-border-light px-5 py-3"
              >
                <h2 className="font-display text-[14px] font-semibold text-text-primary">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="grid h-7 w-7 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover"
                  aria-label={localize('com_ui_close')}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </DialogTitle>
              <div className="flex-1 overflow-y-auto p-5 text-[13px]">{children}</div>
            </DialogPanel>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
