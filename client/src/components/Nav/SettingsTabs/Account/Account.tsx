import React from 'react';
import DisplayUsernameMessages from './DisplayUsernameMessages';
import DeleteAccount from './DeleteAccount';
import Avatar from './Avatar';
import EnableTwoFactorItem from './TwoFactorAuthentication';
import BackupCodesItem from './BackupCodesItem';
import { SectionHeader } from '../components';
import { useGetStartupConfig } from '~/data-provider';
import { useAuthContext, useLocalize } from '~/hooks';

function Account() {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();

  return (
    <div className="flex flex-col gap-3 text-[13px] text-text-primary">
      <SectionHeader>{localize('com_nav_setting_account')}</SectionHeader>
      <div className="flex flex-col gap-2.5">
        <div className="border-b border-border-light pb-2.5">
          <DisplayUsernameMessages />
        </div>
        <div className="border-b border-border-light pb-2.5">
          <Avatar />
        </div>
        {user?.provider === 'local' && (
          <>
            <div className="border-b border-border-light pb-2.5">
              <EnableTwoFactorItem />
            </div>
            {user?.twoFactorEnabled && (
              <div className="border-b border-border-light pb-2.5">
                <BackupCodesItem />
              </div>
            )}
          </>
        )}
        {startupConfig?.allowAccountDeletion !== false && (
          <div className="border-b border-border-light pb-2.5">
            <DeleteAccount />
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(Account);
