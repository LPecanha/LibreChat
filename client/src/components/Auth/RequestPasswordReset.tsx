import { useForm } from 'react-hook-form';
import { useState, ReactNode } from 'react';
import { Spinner } from '@librechat/client';
import { useOutletContext } from 'react-router-dom';
import { useRequestPasswordResetMutation } from 'librechat-data-provider/react-query';
import { loginPage } from 'librechat-data-provider';
import type { TRequestPasswordReset, TRequestPasswordResetResponse } from 'librechat-data-provider';
import type { TLoginLayoutContext } from '~/common';
import type { FC } from 'react';
import { useLocalize } from '~/hooks';

/**
 * [EXT] Phase J.22 Navvia: refatorado pra usar `.inp` + `.field-label` +
 * botão proto-style (h-9 bg-brand). Mesmo padrão visual do LoginForm e
 * Registration.
 */

const BodyTextWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div
      className="relative rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-[13px] text-brand"
      role="alert"
    >
      {children}
    </div>
  );
};

const ResetPasswordBodyText = () => {
  const localize = useLocalize();
  return (
    <div className="flex flex-col space-y-3">
      <p>{localize('com_auth_reset_password_if_email_exists')}</p>
      <a
        className="text-[13px] font-medium text-brand hover:underline"
        href={loginPage()}
      >
        {localize('com_auth_back_to_login')}
      </a>
    </div>
  );
};

function RequestPasswordReset() {
  const localize = useLocalize();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TRequestPasswordReset>();
  const [bodyText, setBodyText] = useState<ReactNode | undefined>(undefined);
  const { startupConfig, setHeaderText } = useOutletContext<TLoginLayoutContext>();

  const requestPasswordReset = useRequestPasswordResetMutation();
  const { isLoading } = requestPasswordReset;

  const onSubmit = (data: TRequestPasswordReset) => {
    requestPasswordReset.mutate(data, {
      onSuccess: (data: TRequestPasswordResetResponse) => {
        if (data.link && !startupConfig?.emailEnabled) {
          setHeaderText('com_auth_reset_password');
          setBodyText(
            <span>
              {localize('com_auth_click')}{' '}
              <a className="text-brand hover:underline" href={data.link}>
                {localize('com_auth_here')}
              </a>{' '}
              {localize('com_auth_to_reset_your_password')}
            </span>,
          );
        } else {
          setHeaderText('com_auth_reset_password_link_sent');
          setBodyText(<ResetPasswordBodyText />);
        }
      },
      onError: () => {
        setHeaderText('com_auth_reset_password_link_sent');
        setBodyText(<ResetPasswordBodyText />);
      },
    });
  };

  if (bodyText) {
    return <BodyTextWrapper>{bodyText}</BodyTextWrapper>;
  }

  return (
    <form
      className="space-y-3"
      aria-label="Password reset form"
      method="POST"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div>
        <label htmlFor="email" className="field-label">
          {localize('com_auth_email_address')}
        </label>
        <input
          type="email"
          id="email"
          autoComplete="off"
          placeholder="voce@email.com"
          aria-label={localize('com_auth_email')}
          aria-invalid={!!errors.email}
          className="inp focus:border-brand focus:outline-none"
          {...register('email', {
            required: localize('com_auth_email_required'),
            minLength: { value: 3, message: localize('com_auth_email_min_length') },
            maxLength: { value: 120, message: localize('com_auth_email_max_length') },
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: localize('com_auth_email_pattern'),
            },
          })}
        />
        {errors.email && (
          <span role="alert" className="mt-1 block text-[11.5px] text-text-destructive">
            {errors.email.message}
          </span>
        )}
      </div>

      <button
        type="submit"
        aria-label="Continue with password reset"
        disabled={!!errors.email || isLoading}
        className="flex h-9 w-full items-center justify-center rounded-md bg-brand text-[13.5px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
      >
        {isLoading ? <Spinner className="size-4" /> : localize('com_auth_continue')}
      </button>

      <a
        href={loginPage()}
        className="block text-center text-[13px] font-medium text-brand hover:underline"
      >
        {localize('com_auth_back_to_login')}
      </a>
    </form>
  );
}

export default RequestPasswordReset;
