import { OGDialog, OGDialogContent, OGDialogTitle } from '@librechat/client';
import CreatePromptForm from '../forms/CreatePromptForm';
import { useLocalize } from '~/hooks';

/**
 * [EXT] Phase J.18 Navvia — modal wrapper para CreatePromptForm.
 *
 * Substitui o fluxo de "navegar para /prompts/new" pelo padrão modal já
 * usado em Skills/Memórias/Bookmarks/MCP. Reusa o CreatePromptForm
 * upstream — só passa um `onSuccess` que fecha o modal (em vez de
 * deixar o form navegar para /prompts/:id por default).
 */
export default function CreatePromptDialog({
  isOpen,
  setIsOpen,
  onCreated,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  /** Callback opcional após criação; recebe o novo groupId. */
  onCreated?: (groupId: string) => void;
}) {
  const localize = useLocalize();
  return (
    <OGDialog open={isOpen} onOpenChange={setIsOpen}>
      <OGDialogContent className="w-11/12 max-w-3xl overflow-hidden p-0">
        <OGDialogTitle className="sr-only">{localize('com_ui_create_prompt')}</OGDialogTitle>
        <div className="max-h-[85vh] overflow-y-auto">
          <CreatePromptForm
            onSuccess={(groupId) => {
              setIsOpen(false);
              onCreated?.(groupId);
            }}
          />
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
