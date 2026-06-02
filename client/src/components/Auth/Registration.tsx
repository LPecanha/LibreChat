import { useForm } from 'react-hook-form';
import React, { useContext, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { ThemeContext, Spinner, isDark } from '@librechat/client';
import { useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { useRegisterUserMutation } from 'librechat-data-provider/react-query';
import { loginPage } from 'librechat-data-provider';
import type { TRegisterUser, TError } from 'librechat-data-provider';
import type { TLoginLayoutContext } from '~/common';
import { useLocalize, TranslationKeys } from '~/hooks';
import { ErrorMessage } from './ErrorMessage';

/**
 * [EXT] Phase J.22 Navvia: refatorado pra bater com proto linhas 1625-1640.
 *
 * Campos `.inp` + `.field-label` (32px de altura, label acima). Senha e
 * Confirmação ficam num grid 2 colunas. Botão submit compact `h-9 bg-brand`.
 */
const Registration: React.FC = () => {
  const navigate = useNavigate();
  const localize = useLocalize();
  const { theme } = useContext(ThemeContext);
  const { startupConfig, startupConfigError, isFetching } = useOutletContext<TLoginLayoutContext>();

  const {
    watch,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TRegisterUser>({ mode: 'onChange' });
  const password = watch('password');

  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');
  const validTheme = isDark(theme) ? 'dark' : 'light';

  const requireCaptcha = Boolean(startupConfig?.turnstile?.siteKey);

  const registerUser = useRegisterUserMutation({
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: () => {
      setIsSubmitting(false);
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown <= 1) {
            clearInterval(timer);
            navigate('/c/new', { replace: true });
            return 0;
          } else {
            return prevCountdown - 1;
          }
        });
      }, 1000);
    },
    onError: (error: unknown) => {
      setIsSubmitting(false);
      if ((error as TError).response?.data?.message) {
        setErrorMessage((error as TError).response?.data?.message ?? '');
      }
    },
  });

  type FieldName = 'name' | 'email' | 'username' | 'password' | 'confirm_password';

  const renderInput = (
    id: FieldName,
    label: TranslationKeys,
    type: string,
    validation: object,
    placeholder = '',
  ) => (
    <div>
      <label htmlFor={id} className="field-label">
        {localize(label)}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={id}
        placeholder={placeholder}
        aria-label={localize(label)}
        aria-invalid={!!errors[id]}
        className="inp focus:border-brand focus:outline-none"
        data-testid={id}
        {...register(id, validation)}
      />
      {errors[id] && (
        <span role="alert" className="mt-1 block text-[11.5px] text-text-destructive">
          {String(errors[id]?.message) ?? ''}
        </span>
      )}
    </div>
  );

  return (
    <>
      {errorMessage && (
        <ErrorMessage>
          {localize('com_auth_error_create')} {errorMessage}
        </ErrorMessage>
      )}
      {registerUser.isSuccess && countdown > 0 && (
        <div
          className="mb-3 rounded-md border border-green-500 bg-green-500/10 px-3 py-2 text-[12.5px] text-text-secondary dark:text-text-primary"
          role="alert"
        >
          {localize(
            startupConfig?.emailEnabled
              ? 'com_auth_registration_success_generic'
              : 'com_auth_registration_success_insecure',
          ) +
            ' ' +
            localize('com_auth_email_verification_redirecting', { 0: countdown.toString() })}
        </div>
      )}
      {!startupConfigError && !isFetching && (
        <>
          <form
            className="space-y-3"
            aria-label="Registration form"
            method="POST"
            onSubmit={handleSubmit((data: TRegisterUser) =>
              registerUser.mutate({ ...data, token: token ?? undefined }),
            )}
          >
            {renderInput(
              'name',
              'com_auth_full_name',
              'text',
              {
                required: localize('com_auth_name_required'),
                minLength: { value: 3, message: localize('com_auth_name_min_length') },
                maxLength: { value: 80, message: localize('com_auth_name_max_length') },
              },
              localize('com_auth_full_name'),
            )}
            {renderInput(
              'username',
              'com_auth_username',
              'text',
              {
                minLength: { value: 2, message: localize('com_auth_username_min_length') },
                maxLength: { value: 80, message: localize('com_auth_username_max_length') },
              },
              localize('com_auth_username'),
            )}
            {renderInput(
              'email',
              'com_auth_email',
              'email',
              {
                required: localize('com_auth_email_required'),
                minLength: { value: 1, message: localize('com_auth_email_min_length') },
                maxLength: { value: 120, message: localize('com_auth_email_max_length') },
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: localize('com_auth_email_pattern'),
                },
              },
              'voce@email.com',
            )}

            {/* Senha + Confirmação em grid 2 colunas (proto linha 1632) */}
            <div className="grid grid-cols-2 gap-3">
              {renderInput(
                'password',
                'com_auth_password',
                'password',
                {
                  required: localize('com_auth_password_required'),
                  minLength: {
                    value: startupConfig?.minPasswordLength || 8,
                    message: localize('com_auth_password_min_length'),
                  },
                  maxLength: {
                    value: 128,
                    message: localize('com_auth_password_max_length'),
                  },
                },
                '••••••••',
              )}
              {renderInput(
                'confirm_password',
                'com_auth_password_confirm',
                'password',
                {
                  validate: (value: string) =>
                    value === password || localize('com_auth_password_not_match'),
                },
                '••••••••',
              )}
            </div>

            {startupConfig?.turnstile?.siteKey && (
              <div className="flex justify-center pt-1">
                <Turnstile
                  siteKey={startupConfig.turnstile.siteKey}
                  options={{
                    ...startupConfig.turnstile.options,
                    theme: validTheme,
                  }}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => setTurnstileToken(null)}
                  onExpire={() => setTurnstileToken(null)}
                />
              </div>
            )}

            <button
              type="submit"
              aria-label="Submit registration"
              disabled={
                Object.keys(errors).length > 0 ||
                isSubmitting ||
                (requireCaptcha && !turnstileToken)
              }
              className="flex h-9 w-full items-center justify-center rounded-md bg-brand text-[13.5px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
            >
              {isSubmitting ? <Spinner className="size-4" /> : localize('com_auth_continue')}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-text-secondary">
            {localize('com_auth_already_have_account')}{' '}
            <a
              href={loginPage()}
              aria-label="Login"
              className="font-medium text-brand hover:underline"
            >
              {localize('com_auth_login')}
            </a>
          </p>
        </>
      )}
    </>
  );
};

export default Registration;
