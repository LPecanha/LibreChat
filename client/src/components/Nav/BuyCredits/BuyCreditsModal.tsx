import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Zap, CreditCard, QrCode, Copy, Check, RefreshCw, Tag } from 'lucide-react';
import { QueryKeys } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { useAuthContext } from '~/hooks/AuthContext';
import { extFetch, redeemCoupon, EXT_URL, type ExtCreditPlan } from './extApi';
import { formatUsdBalance } from './ExtBalanceDisplay';
import { useExtProfile } from './useExtProfile';

const FALLBACK_PLANS: ExtCreditPlan[] = [
  { id: 'basic-monthly', name: 'Basic', type: 'subscription', credits: 10_000_000, pricesBRL: 4900, pricesUSD: 999, discountPct: 0 },
  { id: 'pro-monthly', name: 'Pro', type: 'subscription', credits: 25_000_000, pricesBRL: 9900, pricesUSD: 1999, popular: true, discountPct: 10 },
  { id: 'business-monthly', name: 'Business', type: 'subscription', credits: 75_000_000, pricesBRL: 24900, pricesUSD: 4999, discountPct: 15 },
  { id: 'starter', name: 'Starter', type: 'one_time', credits: 5_000_000, pricesBRL: 2900, pricesUSD: 599, discountPct: 0 },
  { id: 'pro', name: 'Pro', type: 'one_time', credits: 15_000_000, pricesBRL: 7900, pricesUSD: 1599, popular: true, discountPct: 0 },
  { id: 'business', name: 'Business', type: 'one_time', credits: 50_000_000, pricesBRL: 19900, pricesUSD: 3999, discountPct: 0 },
  { id: 'enterprise', name: 'Enterprise', type: 'one_time', credits: 200_000_000, pricesBRL: 69900, pricesUSD: 13999, discountPct: 0 },
];

interface PixData {
  orderId: string;
  qrCode: string;
  qrCodeUrl: string;
  expiresAt: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function applyDiscount(pricesBRL: number, discountPct: number): number {
  return Math.round(pricesBRL * (1 - discountPct / 100));
}

export function BuyCreditsModal({ open, onOpenChange }: Props) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { user, token } = useAuthContext() as {
    user: { id?: string; _id?: string; email?: string; name?: string } | null;
    token?: string;
  };
  const { data: profile } = useExtProfile();
  const activeSub = profile?.subscription ?? null;
  // Find the discount for the user's active plan (from the plan definition)
  const subDiscountPct = activeSub
    ? allPlans.find((p) => p.type === 'subscription' && p.id === activeSub.plan)?.discountPct ?? 0
    : 0;

  const [allPlans, setAllPlans] = useState<ExtCreditPlan[]>(FALLBACK_PLANS);
  const [tab, setTab] = useState<'subscription' | 'one_time'>('subscription');
  const [selected, setSelected] = useState<string>('pro-monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pixView, setPixView] = useState(false);
  const [pixName, setPixName] = useState('');
  const [pixCpf, setPixCpf] = useState('');
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponError, setCouponError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id ?? user?._id ?? '';

  const plans = allPlans.filter((p) => p.type === tab);

  useEffect(() => {
    if (!EXT_URL) return;
    extFetch<ExtCreditPlan[]>('/ext/payment/plans')
      .then(setAllPlans)
      .catch(() => setAllPlans(FALLBACK_PLANS));
  }, []);

  useEffect(() => {
    if (tab === 'subscription') setSelected('pro-monthly');
    else setSelected('pro');
  }, [tab]);

  useEffect(() => {
    if (!pixData?.orderId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await extFetch<{ status: string; creditsGranted: number }>(
          `/ext/payment/pagarme/order/${pixData.orderId}/status`,
          token,
        );
        if (res.status === 'completed') {
          clearInterval(pollRef.current!);
          setPixConfirmed(true);
        }
      } catch { /* ignore */ }
    }, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pixData?.orderId, token]);

  function resetPix() {
    if (pollRef.current) clearInterval(pollRef.current);
    setPixView(false);
    setPixData(null);
    setPixName('');
    setPixCpf('');
    setError('');
    setPixConfirmed(false);
  }

  async function handleCouponRedeem() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const { creditsGranted } = await redeemCoupon(couponCode.trim(), token);
      setCouponSuccess(localize('com_nav_buy_credits_coupon_success', { 0: formatUsdBalance(creditsGranted) }));
      setCouponCode('');
      void queryClient.invalidateQueries([QueryKeys.balance]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setCouponError(msg && !msg.startsWith('HTTP') ? msg : localize('com_nav_buy_credits_coupon_error'));
    } finally {
      setCouponLoading(false);
    }
  }

  function handleClose(v: boolean) {
    onOpenChange(v);
    if (!v) resetPix();
  }

  const selectedPlan = allPlans.find((p) => p.id === selected);
  const effectivePriceBRL = selectedPlan
    ? tab === 'one_time' && activeSub && subDiscountPct > 0
      ? applyDiscount(selectedPlan.pricesBRL, subDiscountPct)
      : selectedPlan.pricesBRL
    : 0;

  async function handleStripeCheckout() {
    setLoading(true);
    setError('');
    try {
      const successUrl = `${window.location.origin}/?payment=success`;
      const cancelUrl = `${window.location.origin}/?payment=cancelled`;
      const { url } = await extFetch<{ url: string }>(
        '/ext/payment/stripe/checkout',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ planId: selected, entityType: 'user', entityId: userId, successUrl, cancelUrl }),
        },
      );
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar pagamento');
      setLoading(false);
    }
  }

  async function handlePixGenerate() {
    if (!pixName || !pixCpf) return;
    setLoading(true);
    setError('');
    try {
      const data = await extFetch<PixData>(
        '/ext/payment/pagarme/checkout/pix',
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            planId: selected,
            entityType: 'user',
            entityId: userId,
            customerName: pixName,
            customerEmail: user?.email ?? '',
            customerDocument: pixCpf.replace(/\D/g, ''),
          }),
        },
      );
      setPixData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar PIX');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[201] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-medium bg-surface-dialog p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between">
            <div>
              <Dialog.Title className="text-base font-semibold text-text-primary">
                {pixView ? localize('com_nav_buy_credits_pix_title') : localize('com_nav_buy_credits_title')}
              </Dialog.Title>
              {!pixView && (
                <Dialog.Description className="mt-0.5 text-sm text-text-secondary">
                  {localize('com_nav_buy_credits_desc')}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="rounded-md p-1.5 transition-colors hover:bg-surface-hover">
              <X className="h-4 w-4 text-text-secondary" />
            </Dialog.Close>
          </div>

          {!pixView ? (
            <>
              {/* Tabs */}
              <div className="mt-4 flex rounded-lg border border-border-light bg-surface-secondary p-0.5">
                <button
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${tab === 'subscription' ? 'bg-surface-dialog text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  onClick={() => setTab('subscription')}
                >
                  <RefreshCw className="h-3 w-3" />
                  {localize('com_nav_buy_credits_tab_subscription')}
                </button>
                <button
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${tab === 'one_time' ? 'bg-surface-dialog text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  onClick={() => setTab('one_time')}
                >
                  <Zap className="h-3 w-3" />
                  {localize('com_nav_buy_credits_tab_one_time')}
                  {activeSub && subDiscountPct > 0 && (
                    <span className="rounded-full bg-green-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      -{subDiscountPct}%
                    </span>
                  )}
                </button>
              </div>

              {tab === 'subscription' && activeSub && (
                <p className="mt-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs text-green-700 dark:text-green-400">
                  {localize('com_nav_buy_credits_already_subscribed')}
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {plans.map((plan) => {
                  const discountedBRL = tab === 'one_time' && activeSub && subDiscountPct > 0
                    ? applyDiscount(plan.pricesBRL, subDiscountPct)
                    : plan.pricesBRL;
                  const hasDiscount = discountedBRL !== plan.pricesBRL;

                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelected(plan.id)}
                      className={`relative rounded-xl border p-3 text-left transition-colors ${
                        selected === plan.id
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-border-light bg-surface-secondary hover:border-border-medium hover:bg-surface-tertiary'
                      }`}
                    >
                      {plan.popular && (
                        <span className="absolute right-2 top-2 rounded-full bg-green-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {localize('com_nav_buy_credits_popular')}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        {tab === 'subscription'
                          ? <RefreshCw className={`h-3.5 w-3.5 ${selected === plan.id ? 'text-green-500' : 'text-text-secondary'}`} />
                          : <Zap className={`h-3.5 w-3.5 ${selected === plan.id ? 'text-green-500' : 'text-text-secondary'}`} />
                        }
                        <span className="text-sm font-medium text-text-primary">{plan.name}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-text-primary">
                        {formatUsdBalance(plan.credits)}
                        {tab === 'subscription' && <span className="font-normal text-text-secondary">/mês</span>}
                      </p>
                      <div className="flex items-center gap-1">
                        <p className={`text-xs ${hasDiscount ? 'text-muted-foreground line-through' : 'text-text-secondary'}`}>
                          {(plan.pricesBRL / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        {hasDiscount && (
                          <p className="text-xs font-medium text-green-600">
                            {(discountedBRL / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        )}
                      </div>
                      {tab === 'subscription' && plan.discountPct > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-green-600">
                          <Tag className="h-2.5 w-2.5" />
                          {plan.discountPct}% desc. em créditos avulsos
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {error && (
                <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
              )}

              <div className="mt-3 border-t border-border-light pt-3">
                <button
                  onClick={() => { setCouponOpen((v) => !v); setCouponError(''); setCouponSuccess(''); }}
                  className="flex w-full items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Tag className="h-3 w-3" />
                  {localize('com_nav_buy_credits_coupon_toggle')}
                </button>
                {couponOpen && (
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg border border-border-medium bg-surface-secondary px-3 py-1.5 text-sm text-text-primary uppercase placeholder:normal-case placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-green-500"
                        placeholder={localize('com_nav_buy_credits_coupon_placeholder')}
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleCouponRedeem()}
                      />
                      <button
                        onClick={handleCouponRedeem}
                        disabled={couponLoading || !couponCode.trim()}
                        className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-60"
                      >
                        {couponLoading ? '…' : localize('com_nav_buy_credits_coupon_apply')}
                      </button>
                    </div>
                    {couponSuccess && (
                      <p className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                        <Check className="h-3.5 w-3.5 shrink-0" />{couponSuccess}
                      </p>
                    )}
                    {couponError && (
                      <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{couponError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleStripeCheckout}
                  disabled={loading || !selected}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span>{localize('com_nav_buy_credits_loading')}</span>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      {localize('com_nav_buy_credits_pay_card')}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setPixView(true)}
                  disabled={loading || !selected}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border-medium bg-surface-secondary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary disabled:opacity-60"
                >
                  <QrCode className="h-4 w-4" />
                  PIX
                </button>
              </div>
            </>
          ) : pixData ? (
            <div className="mt-4 space-y-4">
              {pixConfirmed && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-400">{localize('com_nav_buy_credits_success')}</p>
                </div>
              )}
              <div className="flex justify-center">
                <img src={pixData.qrCodeUrl} alt="PIX QR Code" className="h-48 w-48 rounded-lg border border-border-light" />
              </div>
              <div className="rounded-lg border border-border-light bg-surface-secondary p-3">
                <p className="mb-1.5 text-xs text-text-secondary">Copia e Cola</p>
                <p className="break-all text-xs text-text-primary">{pixData.qrCode.slice(0, 60)}…</p>
              </div>
              <button
                onClick={handleCopy}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-medium py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? localize('com_nav_buy_credits_pix_copied') : localize('com_nav_buy_credits_pix_copy')}
              </button>
              <p className="text-center text-xs text-text-secondary">
                {localize('com_nav_buy_credits_pix_expires')}
              </p>
              <button onClick={resetPix} className="w-full text-center text-xs text-text-secondary underline">
                ← Voltar
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {selectedPlan && (
                <div className="rounded-lg bg-surface-secondary px-3 py-2 text-xs text-text-secondary">
                  {selectedPlan.name} — {formatUsdBalance(selectedPlan.credits)}
                  {tab === 'subscription' ? '/mês' : ''} ·{' '}
                  <span className="font-medium text-text-primary">
                    {(effectivePriceBRL / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}
              <p className="text-sm text-text-secondary">Informe seus dados para gerar o QR code PIX.</p>
              <input
                className="w-full rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder={localize('com_nav_buy_credits_pix_name')}
                value={pixName}
                onChange={(e) => setPixName(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder={localize('com_nav_buy_credits_pix_cpf')}
                value={pixCpf}
                onChange={(e) => setPixCpf(e.target.value)}
                maxLength={14}
              />
              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={resetPix}
                  className="flex-1 rounded-xl border border-border-medium py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
                >
                  Voltar
                </button>
                <button
                  onClick={handlePixGenerate}
                  disabled={loading || !pixName || !pixCpf}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? '…' : localize('com_nav_buy_credits_pix_generate')}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
