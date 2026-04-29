import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Zap, CreditCard, QrCode, Copy, Check, RefreshCw, Tag, ArrowLeft } from 'lucide-react';
import { QueryKeys } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { useAuthContext } from '~/hooks/AuthContext';
import {
  extFetch,
  redeemCoupon,
  checkoutPix,
  checkoutCard,
  createSubscription,
  getPaymentStatus,
  EXT_URL,
  type ExtCreditPlan,
  type PixCheckoutResult,
} from './extApi';
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

type View = 'plans' | 'pix-form' | 'pix-qr' | 'card-form' | 'success';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function applyDiscount(pricesBRL: number, discountPct: number): number {
  return Math.round(pricesBRL * (1 - discountPct / 100));
}

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function maskCard(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
}

function maskCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    .replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')
    .replace(/(\d{3})(\d{3})/, '$1.$2')
    .replace(/(\d{3})/, '$1');
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length >= 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length >= 7) return d.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3');
  if (d.length >= 3) return d.replace(/(\d{2})(\d+)/, '($1) $2');
  return d;
}

function maskCep(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})/, '$1-$2');
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

  const [allPlans, setAllPlans] = useState<ExtCreditPlan[]>(FALLBACK_PLANS);
  const [tab, setTab] = useState<'subscription' | 'one_time'>('subscription');
  const [selected, setSelected] = useState('pro-monthly');
  const [view, setView] = useState<View>('plans');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // PIX state
  const [pixCpf, setPixCpf] = useState('');
  const [pixData, setPixData] = useState<PixCheckoutResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);

  // Card state
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [cardSuccess, setCardSuccess] = useState(0);

  // Coupon state
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponError, setCouponError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userId = user?.id ?? user?._id ?? '';
  const userName = user?.name ?? '';

  const plans = allPlans.filter((p) => p.type === tab);
  const selectedPlan = allPlans.find((p) => p.id === selected);
  const subDiscountPct = activeSub
    ? allPlans.find((p) => p.type === 'subscription' && p.id === activeSub.plan)?.discountPct ?? 0
    : 0;

  useEffect(() => {
    if (!EXT_URL && !window.location.pathname) return;
    extFetch<ExtCreditPlan[]>('/ext/payment/plans')
      .then(setAllPlans)
      .catch(() => setAllPlans(FALLBACK_PLANS));
  }, []);

  useEffect(() => {
    setSelected(tab === 'subscription' ? 'pro-monthly' : 'pro');
  }, [tab]);

  // Poll PIX payment status
  useEffect(() => {
    if (!pixData?.paymentId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await getPaymentStatus(pixData.paymentId, token);
        if (res.status === 'completed') {
          clearInterval(pollRef.current!);
          setPixConfirmed(true);
          void queryClient.invalidateQueries([QueryKeys.balance]);
        }
      } catch { /* ignore */ }
    }, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pixData?.paymentId, token, queryClient]);

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setView('plans');
    setPixData(null);
    setPixCpf('');
    setCopied(false);
    setPixConfirmed(false);
    setCardName('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCpf('');
    setPhone('');
    setCep('');
    setAddressNumber('');
    setError('');
    setCardSuccess(0);
  }

  function handleClose(v: boolean) {
    onOpenChange(v);
    if (!v) reset();
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

  async function handlePixSubmit() {
    if (!pixCpf.replace(/\D/g, '')) return;
    setLoading(true);
    setError('');
    try {
      const plan = selectedPlan!;
      const isSub = plan.type === 'subscription';
      const result = isSub
        ? await createSubscription({ planId: plan.id, billingType: 'PIX', customerName: userName, customerCpf: pixCpf }, token)
        : await checkoutPix({ planId: plan.id, customerName: userName, customerCpf: pixCpf }, token);
      setPixData(result);
      setView('pix-qr');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar PIX');
    } finally {
      setLoading(false);
    }
  }

  async function handleCardSubmit() {
    setLoading(true);
    setError('');
    try {
      const plan = selectedPlan!;
      const [expiryMonth, expiryYear] = cardExpiry.split('/').map((s) => s.trim());
      const cardBody = {
        planId: plan.id,
        customerName: userName,
        customerCpf: cpf,
        customerPhone: phone,
        customerPostalCode: cep,
        customerAddressNumber: addressNumber,
        cardHolderName: cardName,
        cardNumber,
        cardExpiryMonth: expiryMonth ?? '',
        cardExpiryYear: expiryYear ? (expiryYear.length === 2 ? `20${expiryYear}` : expiryYear) : '',
        cardCvv,
      };
      const isSub = plan.type === 'subscription';
      const result = isSub
        ? await createSubscription({ ...cardBody, billingType: 'CREDIT_CARD' }, token)
        : await checkoutCard(cardBody, token);
      setCardSuccess('creditsGranted' in result ? result.creditsGranted : plan.credits);
      void queryClient.invalidateQueries([QueryKeys.balance]);
      setView('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar cartão');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyPix() {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inputCls = 'w-full rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-green-500';

  // -------- Render --------

  const title = view === 'pix-qr'
    ? localize('com_nav_buy_credits_pix_title')
    : view === 'card-form'
      ? localize('com_nav_buy_credits_pay_card')
      : view === 'success'
        ? localize('com_nav_buy_credits_success')
        : localize('com_nav_buy_credits_title');

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[201] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-medium bg-surface-dialog p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {view !== 'plans' && (
                <button onClick={reset} className="rounded-md p-1 text-text-secondary hover:bg-surface-hover transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <Dialog.Title className="text-base font-semibold text-text-primary">{title}</Dialog.Title>
                {view === 'plans' && (
                  <Dialog.Description className="mt-0.5 text-sm text-text-secondary">
                    {localize('com_nav_buy_credits_desc')}
                  </Dialog.Description>
                )}
              </div>
            </div>
            <Dialog.Close className="rounded-md p-1.5 transition-colors hover:bg-surface-hover">
              <X className="h-4 w-4 text-text-secondary" />
            </Dialog.Close>
          </div>

          {/* Plans view */}
          {view === 'plans' && (
            <>
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
                <p className="mt-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
                  {localize('com_nav_buy_credits_already_subscribed')}
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                {plans.map((plan) => {
                  const discountedBRL = tab === 'one_time' && activeSub && subDiscountPct > 0
                    ? applyDiscount(plan.pricesBRL, subDiscountPct) : plan.pricesBRL;
                  const hasDiscount = discountedBRL !== plan.pricesBRL;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelected(plan.id)}
                      className={`relative rounded-xl border p-3 text-left transition-colors ${selected === plan.id ? 'border-green-500 bg-green-500/10' : 'border-border-light bg-surface-secondary hover:border-border-medium hover:bg-surface-tertiary'}`}
                    >
                      {plan.popular && (
                        <span className="absolute right-2 top-2 rounded-full bg-green-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {localize('com_nav_buy_credits_popular')}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        {tab === 'subscription'
                          ? <RefreshCw className={`h-3.5 w-3.5 ${selected === plan.id ? 'text-green-500' : 'text-text-secondary'}`} />
                          : <Zap className={`h-3.5 w-3.5 ${selected === plan.id ? 'text-green-500' : 'text-text-secondary'}`} />}
                        <span className="text-sm font-medium text-text-primary">{plan.name}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-text-primary">
                        {formatUsdBalance(plan.credits)}
                        {tab === 'subscription' && <span className="font-normal text-text-secondary">/mês</span>}
                      </p>
                      <div className="flex items-center gap-1">
                        <p className={`text-xs ${hasDiscount ? 'text-muted-foreground line-through' : 'text-text-secondary'}`}>
                          {fmtBRL(plan.pricesBRL)}
                        </p>
                        {hasDiscount && <p className="text-xs font-medium text-green-600">{fmtBRL(discountedBRL)}</p>}
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

              {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}

              {/* Coupon */}
              <div className="mt-3 border-t border-border-light pt-3">
                <button
                  onClick={() => { setCouponOpen((v) => !v); setCouponError(''); setCouponSuccess(''); }}
                  className="flex w-full items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
                >
                  <Tag className="h-3 w-3" />
                  {localize('com_nav_buy_credits_coupon_toggle')}
                </button>
                {couponOpen && (
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg border border-border-medium bg-surface-secondary px-3 py-1.5 text-sm uppercase text-text-primary placeholder:normal-case placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-green-500"
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
                    {couponError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{couponError}</p>}
                  </div>
                )}
              </div>

              {/* Payment buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { setError(''); setView('card-form'); }}
                  disabled={!selected}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CreditCard className="h-4 w-4" />
                  {localize('com_nav_buy_credits_pay_card')}
                </button>
                <button
                  onClick={() => { setError(''); setView('pix-form'); }}
                  disabled={!selected}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border-medium bg-surface-secondary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary disabled:opacity-60"
                >
                  <QrCode className="h-4 w-4" />
                  PIX
                </button>
              </div>
            </>
          )}

          {/* PIX form — CPF only (name/email from auth) */}
          {view === 'pix-form' && (
            <div className="mt-4 space-y-4">
              {selectedPlan && (
                <div className="rounded-lg bg-surface-secondary px-3 py-2 text-xs text-text-secondary">
                  {selectedPlan.name} — {formatUsdBalance(selectedPlan.credits)}
                  {tab === 'subscription' ? '/mês' : ''} ·{' '}
                  <span className="font-medium text-text-primary">{fmtBRL(selectedPlan.pricesBRL)}</span>
                </div>
              )}
              <p className="text-sm text-text-secondary">Informe seu CPF para gerar o QR code PIX.</p>
              <input
                className={inputCls}
                placeholder="000.000.000-00"
                value={pixCpf}
                onChange={(e) => setPixCpf(maskCpf(e.target.value))}
                maxLength={14}
              />
              {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}
              <button
                onClick={handlePixSubmit}
                disabled={loading || pixCpf.replace(/\D/g, '').length < 11}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? '…' : 'Gerar QR Code PIX'}
              </button>
            </div>
          )}

          {/* PIX QR code */}
          {view === 'pix-qr' && pixData && (
            <div className="mt-4 space-y-4">
              {pixConfirmed && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
                  <Check className="h-4 w-4 shrink-0 text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-400">{localize('com_nav_buy_credits_success')}</p>
                </div>
              )}
              <div className="flex justify-center">
                {pixData.qrCodeImage
                  ? <img src={`data:image/png;base64,${pixData.qrCodeImage}`} alt="PIX QR Code" className="h-48 w-48 rounded-lg border border-border-light" />
                  : <div className="flex h-48 w-48 items-center justify-center rounded-lg border border-border-light bg-surface-secondary text-xs text-text-secondary">QR Code</div>
                }
              </div>
              <div className="rounded-lg border border-border-light bg-surface-secondary p-3">
                <p className="mb-1.5 text-xs text-text-secondary">Copia e Cola</p>
                <p className="break-all text-xs text-text-primary">{pixData.qrCode.slice(0, 60)}…</p>
              </div>
              <button
                onClick={handleCopyPix}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border-medium py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? localize('com_nav_buy_credits_pix_copied') : localize('com_nav_buy_credits_pix_copy')}
              </button>
              <p className="text-center text-xs text-text-secondary">{localize('com_nav_buy_credits_pix_expires')}</p>
            </div>
          )}

          {/* Card form */}
          {view === 'card-form' && (
            <div className="mt-4 space-y-3">
              {selectedPlan && (
                <div className="rounded-lg bg-surface-secondary px-3 py-2 text-xs text-text-secondary">
                  {selectedPlan.name} — {formatUsdBalance(selectedPlan.credits)}
                  {tab === 'subscription' ? '/mês' : ''} ·{' '}
                  <span className="font-medium text-text-primary">{fmtBRL(selectedPlan.pricesBRL)}</span>
                </div>
              )}

              {/* Card data */}
              <input className={inputCls} placeholder="Nome no cartão" value={cardName}
                onChange={(e) => setCardName(e.target.value)} />
              <input className={inputCls} placeholder="Número do cartão" value={cardNumber}
                onChange={(e) => setCardNumber(maskCard(e.target.value))} maxLength={19} />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="MM/AAAA" value={cardExpiry}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCardExpiry(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                  }} maxLength={7} />
                <input className={inputCls} placeholder="CVV" value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} />
              </div>

              {/* Holder info */}
              <input className={inputCls} placeholder="CPF do titular" value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))} maxLength={14} />
              <input className={inputCls} placeholder="Telefone" value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))} maxLength={15} />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="CEP" value={cep}
                  onChange={(e) => setCep(maskCep(e.target.value))} maxLength={9} />
                <input className={inputCls} placeholder="Número" value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)} />
              </div>

              {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}

              <button
                onClick={handleCardSubmit}
                disabled={loading || !cardName || cardNumber.replace(/\s/g, '').length < 16 || !cardExpiry || !cardCvv || cpf.replace(/\D/g, '').length < 11}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? '…' : `Pagar ${selectedPlan ? fmtBRL(selectedPlan.pricesBRL) : ''}`}
              </button>
            </div>
          )}

          {/* Success */}
          {view === 'success' && (
            <div className="mt-6 flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                <Check className="h-7 w-7 text-green-500" />
              </div>
              <p className="text-base font-semibold text-text-primary">{localize('com_nav_buy_credits_success')}</p>
              {cardSuccess > 0 && (
                <p className="text-sm text-text-secondary">
                  {formatUsdBalance(cardSuccess)} adicionados ao seu saldo.
                </p>
              )}
              <button
                onClick={() => handleClose(false)}
                className="mt-2 rounded-xl bg-green-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600"
              >
                Fechar
              </button>
            </div>
          )}

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
