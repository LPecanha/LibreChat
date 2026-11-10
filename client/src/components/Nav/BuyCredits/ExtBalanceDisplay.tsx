import { useState } from 'react';
import { Zap } from 'lucide-react';
import * as Menu from '@ariakit/react/menu';
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
      <div className="text-text-secondary ms-3 me-2 py-2 text-sm" role="note">
        {localize('com_nav_balance')}: {formatUsdBalance(tokenCredits)}
      </div>
      {!isOrgMember && (
        <>
          <Menu.MenuSeparator className="bg-surface-hover -mx-1 my-1 h-px border-0" />
          <button
            onClick={() => setShowModal(true)}
            className="select-item w-full text-sm hover:bg-surface-hover hover:text-text-primary"
            aria-label={localize('com_nav_buy_credits')}
          >
            <Zap className="icon-md text-blue-500" aria-hidden="true" />
            {localize('com_nav_buy_credits')}
          </button>
        </>
      )}
      {showModal && <BuyCreditsModal open={showModal} onOpenChange={setShowModal} />}
    </>
  );
}
