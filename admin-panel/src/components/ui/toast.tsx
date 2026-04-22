import * as RadixToast from '@radix-ui/react-toast';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '~/lib/utils';

export const ToastProvider = RadixToast.Provider;
export const ToastViewport = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixToast.Viewport>) => (
  <RadixToast.Viewport
    {...props}
    className={cn(
      'fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 list-none',
      className,
    )}
  />
);

const toastVariants = cva(
  'relative flex items-start justify-between gap-4 rounded-lg border px-4 py-3 shadow-md text-sm transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
  {
    variants: {
      variant: {
        default: 'bg-card border-border text-text-primary',
        destructive: 'bg-destructive/10 border-destructive/30 text-destructive',
        success: 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type ToastVariant = 'default' | 'destructive' | 'success';

interface ToastProps extends React.ComponentPropsWithoutRef<typeof RadixToast.Root> {
  variant?: ToastVariant;
  title?: string;
  description?: string;
}

export function Toast({ variant = 'default', title, description, className, ...props }: ToastProps) {
  return (
    <RadixToast.Root {...props} className={cn(toastVariants({ variant }), className)}>
      <div className="flex-1 space-y-0.5">
        {title && <RadixToast.Title className="font-medium">{title}</RadixToast.Title>}
        {description && <RadixToast.Description className="text-xs opacity-80">{description}</RadixToast.Description>}
      </div>
      <RadixToast.Close className="shrink-0 opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
