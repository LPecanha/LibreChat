import { useState } from 'react';
import { Zap, Package, Calendar, Building2 } from 'lucide-react';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';
import { useAuthContext, useLocalize } from '~/hooks';
import { BuyCreditsModal } from './BuyCreditsModal';
import { formatUsdBalance } from './ExtBalanceDisplay';
import { useExtProfile } from './useExtProfile';

export function ExtBalancePanel() {
  const localize = useLocalize();
  const { isAuthenticated } = useAuthContext() as { isAuthenticated: boolean };
  const { data: startupConfig } = useGetStartupConfig();
  const [showModal, setShowModal] = useState(false);

  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && !!startupConfig?.balance?.enabled,
  });

  const { data: profile } = useExtProfile();
  const sub = profile?.subscription ?? null;
  const isOrgMember = profile?.isOrgMember ?? false;

  const tokenCredits = balanceQuery.data?.tokenCredits ?? 0;

  return (
    <div className="flex flex-col gap-4 p-4 text-sm text-text-primary">
      <div className="rounded-xl bg-surface-secondary px-4 py-3">
        <p className="text-xs text-text-secondary">{localize('com_nav_balance')}</p>
        <p className="mt-0.5 text-3xl font-bold text-text-primary">
          {balanceQuery.isLoading ? '…' : formatUsdBalance(tokenCredits)}
        </p>
        <p className="text-xs text-text-secondary">{localize('com_nav_buy_credits_api_credits')}</p>
      </div>

      {sub && (
        <div className="rounded-xl border border-border-light bg-surface-secondary px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <Package className="h-3.5 w-3.5" />
            {localize('com_nav_buy_credits_active_plan')}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary capitalize">{sub.plan}</span>
            <span className="text-xs text-text-secondary">
              {formatUsdBalance(sub.creditsPerCycle)}/{sub.cycleIntervalDays}d
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Calendar className="h-3 w-3" />
            {localize('com_nav_buy_credits_renews')}{' '}
            {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
          </div>
        </div>
      )}

      {isOrgMember ? (
        <div className="flex items-center gap-2 rounded-xl border border-border-light bg-surface-secondary px-4 py-3 text-xs text-text-secondary">
          <Building2 className="h-4 w-4 shrink-0" />
          {localize('com_nav_buy_credits_org_member')}
        </div>
      ) : (
        <>
          {!sub && (
            <p className="text-xs text-text-secondary">{localize('com_nav_buy_credits_no_plan')}</p>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-600"
          >
            <Zap className="h-4 w-4" />
            {localize('com_nav_buy_credits')}
          </button>
        </>
      )}

      {showModal && <BuyCreditsModal open={showModal} onOpenChange={setShowModal} />}
    </div>
  );
}
