import { useState, useCallback } from 'react';
import type { ToastVariant } from '~/components/ui/toast';

interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  open: boolean;
}

let globalDispatch: ((item: Omit<ToastItem, 'id' | 'open'>) => void) | null = null;

export function useToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dispatch = useCallback((item: Omit<ToastItem, 'id' | 'open'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...item, id, open: true }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    }, 3500);
  }, []);

  globalDispatch = dispatch;

  return { toasts, setToasts };
}

export function toast(item: Omit<ToastItem, 'id' | 'open'>) {
  globalDispatch?.(item);
}
