import { ThemeSelector, NavviaLogo } from '@librechat/client';
import { TStartupConfig } from 'librechat-data-provider';
import { ErrorMessage } from '~/components/Auth/ErrorMessage';
import { TranslationKeys, useLocalize } from '~/hooks';
import SocialLoginRender from './SocialLoginRender';
import { BlinkAnimation } from './BlinkAnimation';
import { Banner } from '../Banners';
import Footer from './Footer';

/**
 * [EXT] Phase J.22 Navvia: AuthLayout proto-style (design/ui-preview.html
 * linhas 1578-1640). Antes era um split simples com logo + tagline; agora
 * bate com o proto: hero esquerdo com features list, form direito enxuto
 * (max-w-[380px]) e títulos `text-[24px]` + subtítulo em vez do enorme
 * `text-[28px]` centralizado.
 */
function AuthLayout({
  children,
  header,
  subheader,
  isFetching,
  startupConfig,
  startupConfigError,
  pathname,
  error,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  subheader?: React.ReactNode;
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
            <a className="font-semibold text-brand hover:underline" href="/forgot-password">
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

  return (
    <div className="relative flex min-h-screen bg-surface-primary">
      <Banner />
      {/* [EXT] Phase J.22 Navvia: ThemeSelector no TOP-RIGHT pra não colidir nem
       * com o copyright do hero (bottom-left) nem com o Footer (bottom-center). */}
      <div className="absolute right-0 top-0 z-20 m-4">
        <ThemeSelector />
      </div>

      {/* Hero esquerdo — proto linhas 1582-1595. Visível em lg+.
       * `items-center` centraliza os 3 blocos (logo / h1+features / copyright)
       * horizontalmente dentro do hero — sem isso o stretch padrão deixava
       * tudo grudado no edge esquerdo (só os 48px do p-12 de buffer).
       * Texto interno dos blocos continua left-aligned pra leitura. */}
      <aside className="hero relative hidden w-[46%] flex-col items-center justify-between overflow-hidden p-12 lg:flex">
        <span className="blob blob-1" aria-hidden="true" />
        <span className="blob blob-2" aria-hidden="true" />
        <span className="blob blob-3" aria-hidden="true" />
        <div className="relative z-10">
          <NavviaLogo size="xl" />
        </div>
        <div className="relative z-10 flex max-w-sm flex-col items-center text-center">
          <h1 className="font-display text-[32px] font-extrabold leading-[1.08] tracking-tight">
            {localize('com_auth_hero_title')}
          </h1>
          <p className="mt-3 text-[14.5px] text-text-secondary">
            {localize('com_auth_hero_subtitle')}
          </p>
          {/* Features list — `inline-flex` mantém só a largura natural dos
           * itens (não estica), com bullets+texto à esquerda dentro do bloco
           * mas o bloco em si centralizado pelo parent flex+items-center. */}
          <ul className="mt-6 inline-flex flex-col items-start gap-2.5 text-left text-[13.5px] text-text-secondary">
            <li className="flex items-center gap-2.5">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft text-brand">
                ✦
              </span>
              {localize('com_auth_hero_feature_models')}
            </li>
            <li className="flex items-center gap-2.5">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft text-brand">
                ✦
              </span>
              {localize('com_auth_hero_feature_agents')}
            </li>
            <li className="flex items-center gap-2.5">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft text-brand">
                ✦
              </span>
              {localize('com_auth_hero_feature_tools')}
            </li>
          </ul>
        </div>
        <div className="relative z-10 text-[11px] text-text-tertiary">
          {localize('com_auth_hero_footer')}
        </div>
      </aside>

      {/* Formulário direito */}
      <main className="flex w-full flex-col lg:w-[54%]">
        <BlinkAnimation active={isFetching}>
          <div className="mt-6 flex h-10 w-full items-center justify-center lg:hidden">
            <NavviaLogo size="md" />
          </div>
        </BlinkAnimation>
        <DisplayError />
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8">
          <div className="w-full max-w-[380px]">
            {!hasStartupConfigError && !isFetching && header && (
              <>
                <h2
                  className="font-display text-[24px] font-bold tracking-tight text-text-primary"
                  style={{ userSelect: 'none' }}
                >
                  {header}
                </h2>
                {subheader && (
                  <p className="mt-1 text-[13.5px] text-text-secondary">{subheader}</p>
                )}
                <div className="mt-6">{children}</div>
              </>
            )}
            {(hasStartupConfigError || isFetching || !header) && children}
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
