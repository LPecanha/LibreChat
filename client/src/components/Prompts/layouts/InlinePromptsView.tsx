import { useCallback, useContext } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { PermissionTypes, Permissions, SystemRoles } from 'librechat-data-provider';
import EmptyPromptPreview from '../display/EmptyPromptPreview';
import CreatePromptForm from '../forms/CreatePromptForm';
import { AuthContext } from '~/hooks/AuthContext';
import { useHasAccess } from '~/hooks';
import PromptForm from '../forms/PromptForm';

export default function InlinePromptsView() {
  const { promptId } = useParams();
  const navigate = useNavigate();
  const isNew = promptId === undefined;

  /* [EXT] Navvia: aguarda o role do user carregar antes de decidir redirect.
   * Sem isso, useHasAccess retorna false enquanto roles[user.role] é undefined
   * (primeiro render pós-login) e dispara <Navigate to="/c/new"> imediatamente,
   * mesmo com PROMPTS.USE habilitado. */
  const authContext = useContext(AuthContext);
  const roleKey = authContext?.user?.role ?? SystemRoles.USER;
  const roleLoaded = authContext?.roles?.[roleKey] != null;

  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.PROMPTS,
    permission: Permissions.USE,
  });

  const hasCreateAccess = useHasAccess({
    permissionType: PermissionTypes.PROMPTS,
    permission: Permissions.CREATE,
  });

  const handleCreateSuccess = useCallback(
    (groupId: string) => {
      navigate(`/prompts/${groupId}`, { replace: true });
    },
    [navigate],
  );

  if (!roleLoaded) {
    return null;
  }

  if (!hasAccess) {
    return <Navigate to="/c/new" replace />;
  }

  if (isNew && !hasCreateAccess) {
    return <EmptyPromptPreview />;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-presentation">
      {isNew ? (
        <CreatePromptForm onSuccess={handleCreateSuccess} />
      ) : (
        <PromptForm promptId={promptId} />
      )}
    </div>
  );
}
