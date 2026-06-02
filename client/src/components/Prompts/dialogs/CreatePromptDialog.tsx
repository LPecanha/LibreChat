import { useEffect, useMemo } from 'react';
import { FileText, FileSignature, SquareSlash, Variable, ChevronRight, Sparkles } from 'lucide-react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import {
  Button,
  Spinner,
  OGDialog,
  OGDialogTitle,
  OGDialogContent,
  TextareaAutosize,
} from '@librechat/client';
import { Constants, LocalStorageKeys, specialVariables } from 'librechat-data-provider';
import { useCreatePrompt } from '~/data-provider';
import { useLocalize } from '~/hooks';
import CategorySelector from '../fields/CategorySelector';
import VariablesDropdown from '../editor/VariablesDropdown';
import { extractUniqueVariables, cn } from '~/utils';

/**
 * [EXT] Phase J.18 Navvia — modal de criação de prompt.
 *
 * Pareado com CreateSkillDialog (Skills) na estrutura visual:
 *   - max-w-2xl, max-h-[85vh]
 *   - header com título sr-only (OGDialogContent já desenha o close X)
 *   - corpo scrollável com fields agrupados
 *   - footer sticky com Cancel + Criar prompt
 *
 * Reusa todo o data layer upstream (useCreatePrompt, CategorySelector,
 * VariablesDropdown, PromptVariables, FormProvider) — só o markup é
 * proto-style enxuto, sem o título grande / floating labels da
 * CreatePromptForm de página inteira.
 */

const FIELD_INPUT_CLASS =
  'h-10 w-full rounded-xl border border-border-medium bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Linha compacta de chips de variáveis detectadas no prompt — pareada com o
 * estilo do proto (chips text-[10px] bg-surface-active text-tertiary).
 *
 * - Especiais (current_date, current_user, etc.): bg-brand-soft + sparkle
 * - Dropdown ({{tom:formal|casual}}): chip + badge com nº de opções
 * - Simples ({{nome}}): chip mono
 */
function VariableChips({ promptText }: { promptText: string }) {
  const localize = useLocalize();
  const variables = useMemo(() => extractUniqueVariables(promptText), [promptText]);

  if (variables.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-border-medium bg-surface-secondary px-2.5 py-2">
      <div className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-text-tertiary">
        <Variable className="size-3" aria-hidden="true" />
        {localize('com_ui_variables')}
        <span className="ml-0.5 rounded-full bg-surface-active px-1.5 text-[10px] tabular-nums">
          {variables.length}
        </span>
      </div>
      {variables.map((raw) => {
        const lower = raw.toLowerCase();
        const isSpecial = specialVariables[lower] != null;
        const colon = raw.indexOf(':');
        const isDropdown = !isSpecial && colon > 0;
        const name = isSpecial ? lower : isDropdown ? raw.substring(0, colon) : raw;
        const options = isDropdown
          ? raw
              .substring(colon + 1)
              .split('|')
              .filter(Boolean)
          : [];

        if (isSpecial) {
          return (
            <span
              key={raw}
              className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-brand"
              title={localize('com_ui_special_variables')}
            >
              <Sparkles className="size-2.5" aria-hidden="true" />
              {name}
            </span>
          );
        }
        if (isDropdown) {
          return (
            <span
              key={raw}
              className="inline-flex items-center gap-1 rounded-md bg-surface-active px-1.5 py-0.5 font-mono text-[11px] font-medium text-text-primary"
              title={options.join(' / ')}
            >
              <ChevronRight className="size-2.5 text-text-tertiary" aria-hidden="true" />
              {name}
              <span className="rounded-full bg-surface-tertiary px-1 text-[9px] text-text-tertiary">
                {options.length}
              </span>
            </span>
          );
        }
        return (
          <span
            key={raw}
            className="inline-flex items-center rounded-md bg-surface-active px-1.5 py-0.5 font-mono text-[11px] font-medium text-text-primary"
          >
            {name}
          </span>
        );
      })}
    </div>
  );
}

interface CreatePromptFormValues {
  name: string;
  prompt: string;
  type: 'text' | 'chat';
  category: string;
  oneliner: string;
  command: string;
}

const DEFAULT_VALUES: CreatePromptFormValues = {
  name: '',
  prompt: '',
  type: 'text',
  category: '',
  oneliner: '',
  command: '',
};

export default function CreatePromptDialog({
  isOpen,
  setIsOpen,
  onCreated,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onCreated?: (groupId: string) => void;
}) {
  const localize = useLocalize();

  const methods = useForm<CreatePromptFormValues>({
    defaultValues: {
      ...DEFAULT_VALUES,
      category:
        typeof window !== 'undefined'
          ? localStorage.getItem(LocalStorageKeys.LAST_PROMPT_CATEGORY) ?? ''
          : '',
    },
    mode: 'onChange',
  });

  const {
    watch,
    reset,
    control,
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting, isDirty },
  } = methods;

  const promptText = watch('prompt');
  const oneliner = watch('oneliner');
  const command = watch('command');

  const createPrompt = useCreatePrompt({
    onSuccess: (response) => {
      const groupId = response.prompt.groupId;
      if (groupId) {
        onCreated?.(groupId);
      }
      setIsOpen(false);
      reset();
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = (data: CreatePromptFormValues) => {
    const trimmedOneliner = data.oneliner.trim();
    const trimmedCommand = data.command.trim();
    createPrompt.mutate({
      prompt: { prompt: data.prompt, type: data.type },
      group: {
        name: data.name.trim(),
        category: data.category,
        ...(trimmedOneliner.length > 0 ? { oneliner: trimmedOneliner } : {}),
        ...(trimmedCommand.length > 0 ? { command: trimmedCommand } : {}),
      },
    });
  };

  const submitDisabled = !isDirty || isSubmitting || !isValid || createPrompt.isLoading;

  return (
    <OGDialog open={isOpen} onOpenChange={setIsOpen}>
      <OGDialogContent className="w-11/12 max-w-2xl overflow-hidden p-0">
        <OGDialogTitle className="sr-only">{localize('com_ui_create_prompt')}</OGDialogTitle>
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex max-h-[85vh] min-w-0 flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border-light px-5 py-4">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-brand-soft text-brand">
                <FileSignature className="size-[15px]" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-text-primary">
                  {localize('com_ui_create_prompt')}
                </h2>
                <p className="mt-0.5 text-[12px] text-text-tertiary">
                  {localize('com_ui_create_prompt_subtitle')}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-4">
                {/* Name + Category */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <label
                      htmlFor="create-prompt-name"
                      className="text-[12.5px] font-medium text-text-secondary"
                    >
                      {localize('com_ui_prompt_name')}
                      <span className="ml-0.5 text-text-destructive">*</span>
                    </label>
                    <input
                      id="create-prompt-name"
                      type="text"
                      autoComplete="off"
                      placeholder={localize('com_ui_prompt_name')}
                      aria-invalid={errors.name ? 'true' : 'false'}
                      aria-required="true"
                      className={FIELD_INPUT_CLASS}
                      {...register('name', {
                        required: localize('com_ui_prompt_name_required'),
                      })}
                    />
                    {errors.name && (
                      <p className="text-[11px] text-text-destructive" role="alert">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-text-secondary">
                      {localize('com_ui_category')}
                    </label>
                    <CategorySelector className="h-10 w-full sm:w-44" />
                  </div>
                </div>

                {/* Prompt text */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="create-prompt-text"
                      className="flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary"
                    >
                      <FileText className="size-3.5" aria-hidden="true" />
                      {localize('com_ui_prompt_text')}
                      <span className="ml-0.5 text-text-destructive">*</span>
                    </label>
                    <VariablesDropdown fieldName="prompt" />
                  </div>
                  <Controller
                    name="prompt"
                    control={control}
                    rules={{ required: localize('com_ui_prompt_text_required') }}
                    render={({ field }) => (
                      <TextareaAutosize
                        {...field}
                        id="create-prompt-text"
                        minRows={5}
                        maxRows={14}
                        placeholder={localize('com_ui_prompt_input')}
                        aria-invalid={errors.prompt ? 'true' : 'false'}
                        aria-required="true"
                        className={cn(
                          'w-full resize-none rounded-xl border border-border-medium bg-transparent px-3 py-2.5 font-mono text-[13px] leading-relaxed text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary',
                        )}
                      />
                    )}
                  />
                  {errors.prompt && (
                    <p className="text-[11px] text-text-destructive" role="alert">
                      {errors.prompt.message}
                    </p>
                  )}
                </div>

                {/* Variables chips inline (auto-hide quando não há vars) */}
                <VariableChips promptText={promptText} />

                {/* Oneliner + Command */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="create-prompt-oneliner"
                      className="text-[12.5px] font-medium text-text-secondary"
                    >
                      {localize('com_ui_description_placeholder')}
                    </label>
                    <input
                      id="create-prompt-oneliner"
                      type="text"
                      autoComplete="off"
                      maxLength={120}
                      placeholder={localize('com_ui_description_placeholder')}
                      className={FIELD_INPUT_CLASS}
                      {...register('oneliner')}
                    />
                    <p className="text-[10px] text-text-tertiary">
                      {(oneliner ?? '').length}/120
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="create-prompt-command"
                      className="flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary"
                    >
                      <SquareSlash className="size-3.5" aria-hidden="true" />
                      {localize('com_ui_command_placeholder')}
                    </label>
                    <input
                      id="create-prompt-command"
                      type="text"
                      autoComplete="off"
                      maxLength={Constants.COMMANDS_MAX_LENGTH}
                      placeholder="resumo-reuniao"
                      className={cn(FIELD_INPUT_CLASS, 'font-mono lowercase')}
                      {...register('command', {
                        setValueAs: (v: string) =>
                          (v ?? '').toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, ''),
                      })}
                    />
                    <p className="text-[10px] text-text-tertiary">
                      {(command ?? '').length}/{Constants.COMMANDS_MAX_LENGTH}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border-light bg-surface-secondary px-5 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={createPrompt.isLoading}
              >
                {localize('com_ui_cancel')}
              </Button>
              <Button type="submit" disabled={submitDisabled} aria-disabled={submitDisabled}>
                {createPrompt.isLoading ? <Spinner className="size-4" /> : null}
                {localize('com_ui_create_prompt')}
              </Button>
            </div>
          </form>
        </FormProvider>
      </OGDialogContent>
    </OGDialog>
  );
}
