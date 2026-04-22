import React from 'react';
import { ExtBalancePanel } from '~/components/Nav/BuyCredits'; // [EXT]

function Balance() {
  return <ExtBalancePanel />; // [EXT]
}

export default React.memo(Balance);
