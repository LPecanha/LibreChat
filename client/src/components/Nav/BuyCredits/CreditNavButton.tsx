import { useState } from 'react';
import { Zap } from 'lucide-react';
import { Button, TooltipAnchor } from '@librechat/client';
import { useGetStartupConfig } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import { BuyCreditsModal } from './BuyCreditsModal';
import { useExtProfile } from './useExtProfile';

export function CreditNavButton() {
  const [showModal, setShowModal] = useState(false);
  const { isAuthenticated } = useAuthContext() as { isAuthenticated: boolean };
  const { data: startupConfig } = useGetStartupConfig();
  const { data: profile } = useExtProfile();

  if (!isAuthenticated || !startupConfig?.balance?.enabled || profile?.isOrgMember) {
    return null;
  }

  return (
    <>
      <TooltipAnchor
        side="right"
        description="Comprar Créditos"
        render={
          <Button
            size="icon"
            variant="ghost"
            aria-label="Comprar Créditos"
            className="h-9 w-9 rounded-lg"
            onClick={() => setShowModal(true)}
          >
            <Zap className="h-5 w-5 text-blue-500" aria-hidden="true" />
          </Button>
        }
      />
      {showModal && <BuyCreditsModal open={showModal} onOpenChange={setShowModal} />}
    </>
  );
}
