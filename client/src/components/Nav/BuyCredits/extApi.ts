export const EXT_URL = (window as Window & { __EXT_URL__?: string }).__EXT_URL__ ?? '';

export interface ActiveSubscription {
  _id: string;
  plan: string;
  creditsPerCycle: number;
  cycleIntervalDays: number;
  status: string;
  currentPeriodEnd: string;
  nextRefillAt: string;
}

export interface ExtCreditPlan {
  id: string;
  name: string;
  type: 'subscription' | 'one_time';
  credits: number;
  pricesBRL: number;
  pricesUSD: number;
  popular?: boolean;
  discountPct: number;
}

export interface ExtUserProfile {
  subscription: ActiveSubscription | null;
  isOrgMember: boolean;
  orgId?: string;
}

export interface PixCheckoutResult {
  paymentId: string;
  qrCode: string;
  qrCodeImage: string;
  expiresAt: string;
  subscriptionId?: string;
}

export interface CardCheckoutResult {
  success: boolean;
  creditsGranted: number;
  paymentId: string;
  subscriptionId?: string;
}

export interface PaymentStatus {
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  creditsGranted: number;
}

export async function extFetch<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${EXT_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json() as { error?: string };
      if (body.error) message = body.error;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function redeemCoupon(code: string, token?: string): Promise<{ creditsGranted: number }> {
  return extFetch<{ creditsGranted: number }>('/ext/user/coupon/redeem', token, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function checkoutPix(
  body: {
    planId: string;
    customerName: string;
    customerCpf: string;
    entityType?: string;
    entityId?: string;
  },
  token?: string,
): Promise<PixCheckoutResult> {
  return extFetch<PixCheckoutResult>('/ext/payment/asaas/checkout/pix', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function checkoutCard(
  body: {
    planId: string;
    customerName: string;
    customerCpf: string;
    customerPhone: string;
    customerPostalCode: string;
    customerAddressNumber: string;
    cardHolderName: string;
    cardNumber: string;
    cardExpiryMonth: string;
    cardExpiryYear: string;
    cardCvv: string;
    entityType?: string;
    entityId?: string;
  },
  token?: string,
): Promise<CardCheckoutResult> {
  return extFetch<CardCheckoutResult>('/ext/payment/asaas/checkout/card', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createSubscription(
  body: {
    planId: string;
    billingType: 'PIX' | 'CREDIT_CARD';
    customerName: string;
    customerCpf: string;
    customerPhone?: string;
    customerPostalCode?: string;
    customerAddressNumber?: string;
    cardHolderName?: string;
    cardNumber?: string;
    cardExpiryMonth?: string;
    cardExpiryYear?: string;
    cardCvv?: string;
    entityType?: string;
    entityId?: string;
  },
  token?: string,
): Promise<PixCheckoutResult & { subscriptionId: string; success?: boolean }> {
  return extFetch('/ext/payment/asaas/subscription', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getPaymentStatus(paymentId: string, token?: string): Promise<PaymentStatus> {
  return extFetch<PaymentStatus>(`/ext/payment/asaas/payment/${encodeURIComponent(paymentId)}/status`, token);
}
