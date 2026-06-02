import React, { useState, useRef } from 'react';
import { useOnClickOutside } from '@librechat/client';
import { Permissions, PermissionTypes } from 'librechat-data-provider';
import ImportConversations from './ImportConversations';
import { AgentApiKeys } from './AgentApiKeys';
import { DeleteCache } from './DeleteCache';
import { RevokeKeys } from './RevokeKeys';
import { ClearChats } from './ClearChats';
import SharedLinks from './SharedLinks';
import { SectionHeader } from '../components';
import { useHasAccess, useLocalize } from '~/hooks';

function Data() {
  const localize = useLocalize();
  const dataTabRef = useRef(null);
  const [confirmClearConvos, setConfirmClearConvos] = useState(false);
  useOnClickOutside(dataTabRef, () => confirmClearConvos && setConfirmClearConvos(false), []);
  const hasAccessToApiKeys = useHasAccess({
    permissionType: PermissionTypes.REMOTE_AGENTS,
    permission: Permissions.USE,
  });

  return (
    <div className="flex flex-col gap-3 text-[13px] text-text-primary" ref={dataTabRef}>
      <SectionHeader>{localize('com_nav_setting_data')}</SectionHeader>
      <div className="flex flex-col gap-2.5">
        <div className="border-b border-border-light pb-2.5">
          <ImportConversations />
        </div>
        <div className="border-b border-border-light pb-2.5">
          <SharedLinks />
        </div>
        {hasAccessToApiKeys && (
          <div className="border-b border-border-light pb-2.5">
            <AgentApiKeys />
          </div>
        )}
        <div className="border-b border-border-light pb-2.5">
          <RevokeKeys />
        </div>
        <div className="border-b border-border-light pb-2.5">
          <DeleteCache />
        </div>
        <div className="border-b border-border-light pb-2.5">
          <ClearChats />
        </div>
      </div>
    </div>
  );
}

export default React.memo(Data);
