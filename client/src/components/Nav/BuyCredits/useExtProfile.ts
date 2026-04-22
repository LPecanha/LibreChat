import { useQuery } from '@tanstack/react-query';
import { useGetStartupConfig } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import { extFetch, EXT_URL, type ExtUserProfile } from './extApi';

export function useExtProfile() {
  const { isAuthenticated, token } = useAuthContext() as { isAuthenticated: boolean; token?: string };
  const { data: startupConfig } = useGetStartupConfig();
  const balanceEnabled = !!startupConfig?.balance?.enabled;

  return useQuery({
    queryKey: ['ext-user-profile'],
    queryFn: () => extFetch<ExtUserProfile>('/ext/user/profile', token),
    enabled: !!isAuthenticated && !!token && !!EXT_URL && balanceEnabled,
    staleTime: 60_000,
  });
}
