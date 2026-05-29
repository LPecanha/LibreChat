import * as RadixToast from '@radix-ui/react-toast';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { NotificationSeverity } from '~/common';
import { useToast } from '~/hooks';

/* [EXT] Phase I.2 Navvia — Toast usa classes .toast + variants do protótipo
 * (design/ui-preview.html linhas 280-292):
 *   .toast — bg surface-overlay + border-medium + shadow-overlay + radius 9px
 *           padding 11px 14px + font 13px + min-w 240px
 *           animação tslide 0.25s ease-out (translateX 20px → 0)
 *   .toast.success — border-left 3px solid #10b981 + .ic em #10b981
 *   .toast.error   — border-left 3px solid #ef4444 + .ic em #ef4444
 *   .toast.warn    — border-left 3px solid #f59e0b + .ic em #f59e0b
 *   .toast.info    — border-left 3px solid var(--brand) + .ic em var(--brand)
 *
 * Estrutura: ícone .ic + descrição flex-1
 */
const ICON_BY_SEVERITY = {
  [NotificationSeverity.SUCCESS]: CheckCircle2,
  [NotificationSeverity.ERROR]: XCircle,
  [NotificationSeverity.WARNING]: AlertTriangle,
  [NotificationSeverity.INFO]: Info,
};

const VARIANT_BY_SEVERITY = {
  [NotificationSeverity.SUCCESS]: 'success',
  [NotificationSeverity.ERROR]: 'error',
  [NotificationSeverity.WARNING]: 'warn',
  [NotificationSeverity.INFO]: 'info',
};

export function Toast() {
  const { toast, onOpenChange } = useToast();
  const variant = VARIANT_BY_SEVERITY[toast.severity] ?? 'info';
  const Icon = ICON_BY_SEVERITY[toast.severity] ?? Info;

  return (
    <RadixToast.Root
      open={toast.open}
      onOpenChange={onOpenChange}
      className="toast-root"
    >
      <div className={`toast ${variant} pointer-events-auto`}>
        {toast.showIcon && (
          <span className="ic mt-0.5 flex-shrink-0" aria-hidden="true">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
        )}
        <RadixToast.Description className="flex-1 text-text-primary">
          <div className="whitespace-pre-wrap text-left">{toast.message}</div>
        </RadixToast.Description>
      </div>
    </RadixToast.Root>
  );
}
