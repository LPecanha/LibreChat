import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { useLocalize } from '~/hooks';

export function PaymentToast() {
  const localize = useLocalize();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<'success' | 'cancelled' | null>(null);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success' || payment === 'cancelled') {
      setStatus(payment);
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      setSearchParams(next, { replace: true });
      const t = setTimeout(() => setStatus(null), 6000);
      return () => clearTimeout(t);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!status) return null;

  const isSuccess = status === 'success';

  return (
    <div
      className={`fixed bottom-6 right-6 z-[300] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all ${
        isSuccess
          ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
          : 'border-border bg-surface-dialog text-text-primary'
      }`}
    >
      {isSuccess ? (
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <p className="text-sm leading-snug">
        {isSuccess
          ? localize('com_nav_buy_credits_success')
          : localize('com_nav_buy_credits_cancelled')}
      </p>
      <button onClick={() => setStatus(null)} className="ml-1 shrink-0 opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
