import { ToastProvider, ToastViewport, Toast } from './toast';
import { useToastProvider } from '~/hooks/useToast';

export function Toaster() {
  const { toasts, setToasts } = useToastProvider();

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          open={t.open}
          onOpenChange={(open) => {
            if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
          }}
          variant={t.variant}
          title={t.title}
          description={t.description}
        />
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
