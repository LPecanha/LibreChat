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

export async function redeemCoupon(code: string, token?: string): Promise<{ creditsGranted: number }> {
  return extFetch<{ creditsGranted: number }>('/ext/user/coupon/redeem', token, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
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
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}
