import { ThemeSelector, NavviaLogo } from '@librechat/client';
import { TStartupConfig } from 'librechat-data-provider';
import { ErrorMessage } from '~/components/Auth/ErrorMessage';
import { TranslationKeys, useLocalize } from '~/hooks';
import SocialLoginRender from './SocialLoginRender';
import { BlinkAnimation } from './BlinkAnimation';
import { Banner } from '../Banners';
import Footer from './Footer';

function AuthLayout({
  children,
  header,
  isFetching,
  startupConfig,
  startupConfigError,
  pathname,
  error,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  isFetching: boolean;
  startupConfig: TStartupConfig | null | undefined;
  startupConfigError: unknown | null | undefined;
  pathname: string;
  error: TranslationKeys | null;
}) {
  const localize = useLocalize();

  const hasStartupConfigError = startupConfigError !== null && startupConfigError !== undefined;
  const DisplayError = () => {
    if (hasStartupConfigError) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize('com_auth_error_login_server')}</ErrorMessage>
        </div>
      );
    } else if (error === 'com_auth_error_invalid_reset_token') {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>
            {localize('com_auth_error_invalid_reset_token')}{' '}
            <a className="font-semibold text-green-600 hover:underline" href="/forgot-password">
              {localize('com_auth_click_here')}
            </a>{' '}
            {localize('com_auth_to_try_again')}
          </ErrorMessage>
        </div>
      );
    } else if (error != null && error) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize(error)}</ErrorMessage>
        </div>
      );
    }
    return null;
  };

  /* [EXT] Phase G Navvia — port do authScreen do protótipo (linha 1578+).
   * Layout split: hero gradient à esquerda (Navvia identity), form à
   * direita. Em mobile, hero some e form ocupa viewport. */
  return (
    <div className="relative flex min-h-screen bg-surface-primary">
      <Banner />
      <div className="absolute bottom-0 left-0 z-20 m-4">
        <ThemeSelector />
      </div>

      {/* Hero gradient esquerda — visível em md+, escondido em mobile */}
      <aside
        className="hero relative hidden w-1/2 flex-col items-center justify-center overflow-hidden p-12 md:flex"
      >
        <span className="blob blob-1" aria-hidden="true" />
        <span className="blob blob-2" aria-hidden="true" />
        <span className="blob blob-3" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <NavviaLogo size="xl" />
          <p className="mt-6 max-w-sm text-[15px] text-text-secondary">
            Sua plataforma multi-IA com agentes, prompts, skills e memória —
            tudo em um workspace.
          </p>
        </div>
      </aside>

      {/* Form direita */}
      <main className="flex w-full flex-col md:w-1/2">
        <BlinkAnimation active={isFetching}>
          <div className="mt-6 flex h-10 w-full items-center justify-center md:hidden">
            <NavviaLogo size="md" />
          </div>
        </BlinkAnimation>
        <DisplayError />
        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <div className="w-full max-w-md">
            {!hasStartupConfigError && !isFetching && header && (
              <h1
                className="mb-6 text-center font-display text-[28px] font-bold tracking-tight text-text-primary"
                style={{ userSelect: 'none' }}
              >
                {header}
              </h1>
            )}
            {children}
            {!pathname.includes('2fa') &&
              (pathname.includes('login') || pathname.includes('register')) && (
                <SocialLoginRender startupConfig={startupConfig} />
              )}
          </div>
        </div>
        <Footer startupConfig={startupConfig} />
      </main>
    </div>
  );
}

export default AuthLayout;
