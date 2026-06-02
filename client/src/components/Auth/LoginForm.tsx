import React, { useState, useEffect, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { Turnstile } from '@marsidev/react-turnstile';
import { ThemeContext, Spinner, isDark } from '@librechat/client';
import type { TLoginUser, TStartupConfig } from 'librechat-data-provider';
import type { TAuthContext } from '~/common';
import { useResendVerificationEmail, useGetStartupConfig } from '~/data-provider';
import { validateEmail } from '~/utils';
import { useLocalize } from '~/hooks';

type TLoginFormProps = {
  onSubmit: (data: TLoginUser) => void;
  startupConfig: TStartupConfig;
  error: Pick<TAuthContext, 'error'>['error'];
  setError: Pick<TAuthContext, 'setError'>['setError'];
};

/**
 * [EXT] Phase J.22 Navvia: refatorado pra bater com proto linhas 1602-1622.
 *
 * Antes: floating-label gigante (`rounded-2xl` + `pt-3 pb-2.5` ~ 48px de altura),
 * botão `h-12` (também gigante).
 *
 * Agora: estilo `.inp` (32px height, rounded-md, padding lateral 10px) + label
 * acima (`.field-label` text-[12px] text-secondary). Botão `bg-brand` `h-9`,
 * texto `text-[13.5px]`. "Esqueci a senha" passa pra linha do checkbox, à direita.
 */
const LoginForm: React.FC<TLoginFormProps> = ({ onSubmit, startupConfig, error, setError }) => {
  const localize = useLocalize();
  const { theme } = useContext(ThemeContext);
  const {
    register,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TLoginUser>();
  const [showResendLink, setShowResendLink] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const { data: config } = useGetStartupConfig();
  const useUsernameLogin = config?.ldap?.username;
  const validTheme = isDark(theme) ? 'dark' : 'light';
  const requireCaptcha = Boolean(startupConfig.turnstile?.siteKey);

  useEffect(() => {
    if (error && error.includes('422') && !showResendLink) {
      setShowResendLink(true);
    }
  }, [error, showResendLink]);

  const resendLinkMutation = useResendVerificationEmail({
    onMutate: () => {
      setError(undefined);
      setShowResendLink(false);
    },
  });

  if (!startupConfig) {
    return null;
  }

  const renderError = (fieldName: string) => {
    const errorMessage = errors[fieldName]?.message;
    return errorMessage ? (
      <span role="alert" className="mt-1 block text-[11.5px] text-text-destructive">
        {String(errorMessage)}
      </span>
    ) : null;
  };

  const handleResendEmail = () => {
    const email = getValues('email');
    if (!email) {
      return setShowResendLink(false);
    }
    resendLinkMutation.mutate({ email });
  };

  return (
    <>
      {showResendLink && (
        <div className="mb-3 rounded-md border border-green-500 bg-green-500/10 px-3 py-2 text-[12.5px] text-text-secondary dark:text-text-primary">
          {localize('com_auth_email_verification_resend_prompt')}
          <button
            type="button"
            className="ml-2 font-medium text-brand hover:underline"
            onClick={handleResendEmail}
            disabled={resendLinkMutation.isLoading}
          >
            {localize('com_auth_email_resend_link')}
          </button>
        </div>
      )}
      <form
        className="space-y-3"
        aria-label="Login form"
        method="POST"
        onSubmit={handleSubmit((data) => onSubmit(data))}
      >
        <div>
          <label htmlFor="email" className="field-label">
            {useUsernameLogin
              ? localize('com_auth_username').replace(/ \(.*$/, '')
              : localize('com_auth_email_address')}
          </label>
          <input
            type="text"
            id="email"
            autoComplete={useUsernameLogin ? 'username' : 'email'}
            placeholder={useUsernameLogin ? '' : 'voce@email.com'}
            aria-label={localize('com_auth_email')}
            aria-invalid={!!errors.email}
            className="inp focus:border-brand focus:outline-none"
            {...register('email', {
              required: localize('com_auth_email_required'),
              maxLength: { value: 120, message: localize('com_auth_email_max_length') },
              validate: useUsernameLogin
                ? undefined
                : (value) => validateEmail(value, localize('com_auth_email_pattern')),
            })}
          />
          {renderError('email')}
        </div>

        <div>
          <label htmlFor="password" className="field-label">
            {localize('com_auth_password')}
          </label>
          <input
            type="password"
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-label={localize('com_auth_password')}
            aria-invalid={!!errors.password}
            className="inp focus:border-brand focus:outline-none"
            {...register('password', {
              required: localize('com_auth_password_required'),
              minLength: {
                value: startupConfig?.minPasswordLength || 8,
                message: localize('com_auth_password_min_length'),
              },
              maxLength: { value: 128, message: localize('com_auth_password_max_length') },
            })}
          />
          {renderError('password')}
        </div>

        {startupConfig.passwordResetEnabled && (
          <div className="flex justify-end pt-0.5 text-[12.5px]">
            <a
              href="/forgot-password"
              className="font-medium text-brand hover:underline"
            >
              {localize('com_auth_password_forgot')}
            </a>
          </div>
        )}

        {requireCaptcha && (
          <div className="flex justify-center pt-1">
            <Turnstile
              siteKey={startupConfig.turnstile!.siteKey}
              options={{
                ...startupConfig.turnstile!.options,
                theme: validTheme,
              }}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
            />
          </div>
        )}

        <button
          type="submit"
          aria-label={localize('com_auth_continue')}
          data-testid="login-button"
          disabled={(requireCaptcha && !turnstileToken) || isSubmitting}
          className="flex h-9 w-full items-center justify-center rounded-md bg-brand text-[13.5px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
        >
          {isSubmitting ? <Spinner className="size-4" /> : localize('com_auth_continue')}
        </button>
      </form>
    </>
  );
};

export default LoginForm;
