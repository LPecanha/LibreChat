import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import {
  Login,
  VerifyEmail,
  Registration,
  ResetPassword,
  ApiErrorWatcher,
  TwoFactorScreen,
  RequestPasswordReset,
} from '~/components/Auth';
import { MarketplaceProvider } from '~/components/Agents/MarketplaceContext';
import AgentMarketplace from '~/components/Agents/Marketplace';
import { OAuthSuccess, OAuthError } from '~/components/OAuth';
import { AuthContextProvider } from '~/hooks/AuthContext';
import { useGetStartupConfig } from '~/data-provider';
import RouteErrorBoundary from './RouteErrorBoundary';
import StartupLayout from './Layouts/Startup';
import LoginLayout from './Layouts/Login';
import dashboardRoutes from './Dashboard';
import ShareRoute from './ShareRoute';
import ChatRoute from './ChatRoute';
import HomeRoute from './Home'; // [EXT] Navvia dashboard
import Search from './Search';
import Root from './Root';

/** [EXT] Index redirect: respeita interface.home do librechat.yaml.
 *  - 'dashboard' → /home (Home dashboard Navvia)
 *  - 'chat' (padrão) → /c/new (comportamento upstream)
 *  Espera o startupConfig carregar antes de decidir — caso contrário um
 *  Navigate para /c/new dispara antes do data chegar e ignora interface.home.
 */
function IndexRedirect() {
  const { data: startupConfig, isLoading } = useGetStartupConfig();
  if (isLoading || !startupConfig) {
    return null;
  }
  const target = startupConfig?.interface?.home === 'dashboard' ? '/home' : '/c/new';
  return <Navigate to={target} replace={true} />;
}

const AuthLayout = () => (
  <AuthContextProvider>
    <Outlet />
    <ApiErrorWatcher />
  </AuthContextProvider>
);

const loadInlinePromptsView = () =>
  import('~/components/Prompts/layouts/InlinePromptsView').then((m) => ({
    Component: m.default,
  }));

const loadSkillsView = () =>
  import('~/components/Skills/layouts/SkillsView').then((m) => ({
    Component: m.default,
  }));

const baseEl = document.querySelector('base');
const baseHref = baseEl?.getAttribute('href') || '/';

export const router = createBrowserRouter(
  [
    {
      path: 'share/:shareId',
      element: <ShareRoute />,
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: 'oauth',
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          path: 'success',
          element: <OAuthSuccess />,
        },
        {
          path: 'error',
          element: <OAuthError />,
        },
      ],
    },
    {
      path: '/',
      element: <StartupLayout />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          path: 'register',
          element: <Registration />,
        },
        {
          path: 'forgot-password',
          element: <RequestPasswordReset />,
        },
        {
          path: 'reset-password',
          element: <ResetPassword />,
        },
      ],
    },
    {
      path: 'verify',
      element: <VerifyEmail />,
      errorElement: <RouteErrorBoundary />,
    },
    {
      element: <AuthLayout />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          path: '/',
          element: <LoginLayout />,
          children: [
            {
              path: 'login',
              element: <Login />,
            },
            {
              path: 'login/2fa',
              element: <TwoFactorScreen />,
            },
          ],
        },
        dashboardRoutes,
        {
          path: '/',
          element: <Root />,
          children: [
            {
              index: true,
              element: <IndexRedirect />, // [EXT] respeita interface.home
            },
            {
              path: 'home', // [EXT] Navvia dashboard route
              element: <HomeRoute />,
            },
            {
              path: 'c/:conversationId?',
              element: <ChatRoute />,
            },
            {
              path: 'search',
              element: <Search />,
            },
            {
              /* [EXT] Phase J.17 Navvia: /prompts agora lista todos os prompts
               * (PromptsPage style proto), em vez de redirecionar para o form. */
              path: 'prompts',
              lazy: () => import('~/components/Library').then((m) => ({ Component: m.PromptsPage })),
            },
            {
              path: 'prompts/new',
              lazy: loadInlinePromptsView,
            },
            {
              path: 'prompts/:promptId',
              lazy: loadInlinePromptsView,
            },
            {
              path: 'skills',
              lazy: loadSkillsView,
            },
            {
              path: 'skills/:skillId',
              lazy: loadSkillsView,
            },
            {
              path: 'skills/:skillId/edit',
              lazy: loadSkillsView,
            },
            {
              path: 'agents',
              element: (
                <MarketplaceProvider>
                  <AgentMarketplace />
                </MarketplaceProvider>
              ),
            },
            {
              path: 'agents/:category',
              element: (
                <MarketplaceProvider>
                  <AgentMarketplace />
                </MarketplaceProvider>
              ),
            },
            /* [EXT] Phase J.14 Navvia: rotas dedicadas Biblioteca (proto views:
             * #view-memories #view-files #view-bookmarks #view-mcp). */
            {
              path: 'memories',
              lazy: () => import('~/components/Library').then((m) => ({ Component: m.MemoriesPage })),
            },
            {
              path: 'files',
              lazy: () => import('~/components/Library').then((m) => ({ Component: m.FilesPage })),
            },
            {
              path: 'bookmarks',
              lazy: () => import('~/components/Library').then((m) => ({ Component: m.BookmarksPage })),
            },
            {
              path: 'mcp',
              lazy: () => import('~/components/Library').then((m) => ({ Component: m.MCPPage })),
            },
          ],
        },
      ],
    },
  ],
  { basename: baseHref },
);
