export interface CreditPlan {
  id: string;
  name: string;
  type: 'subscription' | 'one_time';
  credits: number;
  pricesBRL: number;
  pricesUSD: number;
  popular?: boolean;
  discountPct: number;
}

export const CREDIT_PLANS: CreditPlan[] = [
  // Monthly subscription plans
  { id: 'basic-monthly', name: 'Basic', type: 'subscription', credits: 10_000_000, pricesBRL: 4900, pricesUSD: 999, discountPct: 0 },
  { id: 'pro-monthly', name: 'Pro', type: 'subscription', credits: 25_000_000, pricesBRL: 9900, pricesUSD: 1999, popular: true, discountPct: 10 },
  { id: 'business-monthly', name: 'Business', type: 'subscription', credits: 75_000_000, pricesBRL: 24900, pricesUSD: 4999, discountPct: 15 },
  // One-time credit packages
  { id: 'starter', name: 'Starter', type: 'one_time', credits: 5_000_000, pricesBRL: 2900, pricesUSD: 599, discountPct: 0 },
  { id: 'pro', name: 'Pro', type: 'one_time', credits: 15_000_000, pricesBRL: 7900, pricesUSD: 1599, popular: true, discountPct: 0 },
  { id: 'business', name: 'Business', type: 'one_time', credits: 50_000_000, pricesBRL: 19900, pricesUSD: 3999, discountPct: 0 },
  { id: 'enterprise', name: 'Enterprise', type: 'one_time', credits: 200_000_000, pricesBRL: 69900, pricesUSD: 13999, discountPct: 0 },
];

export function getPlanById(id: string): CreditPlan | undefined {
  return CREDIT_PLANS.find((p) => p.id === id);
}
