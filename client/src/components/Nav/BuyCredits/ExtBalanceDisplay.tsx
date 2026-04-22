import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { BuyCreditsModal } from './BuyCreditsModal';
import { useExtProfile } from './useExtProfile';

/** Formats raw tokenCredits (micro-USD: 1 credit = $0.000001) as a dollar string. */
export function formatUsdBalance(tokenCredits: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(tokenCredits / 1_000_000);
}

export function ExtBalanceDisplay({ tokenCredits }: { tokenCredits: number }) {
  const localize = useLocalize();
  const [showModal, setShowModal] = useState(false);
  const { data: profile } = useExtProfile();
  const isOrgMember = profile?.isOrgMember ?? false;

  return (
    <>
      <div className="flex items-center justify-between ml-3 mr-2 py-2" role="note">
        <span className="text-token-text-secondary text-sm">
          {localize('com_nav_balance')}: {formatUsdBalance(tokenCredits)}
        </span>
        {!isOrgMember && (
          <button
            onClick={() => setShowModal(true)}
            className="mr-1 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-green-500 transition-colors hover:bg-surface-hover"
            aria-label={localize('com_nav_buy_credits')}
          >
            <Zap className="h-3 w-3" aria-hidden="true" />
            {localize('com_nav_buy_credits')}
          </button>
        )}
      </div>
      {showModal && <BuyCreditsModal open={showModal} onOpenChange={setShowModal} />}
    </>
  );
}
