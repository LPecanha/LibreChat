import { useForm } from 'react-hook-form';
import { Spinner } from '@librechat/client';
import { useOutletContext } from 'react-router-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useResetPasswordMutation } from 'librechat-data-provider/react-query';
import type { TResetPassword } from 'librechat-data-provider';
import type { TLoginLayoutContext } from '~/common';
import { useLocalize } from '~/hooks';

/**
 * [EXT] Phase J.22 Navvia: refatorado pra usar `.inp` + `.field-label` +
 * botão proto-style. Senha + Confirmação em grid 2 colunas (mesmo padrão
 * do Registration).
 */
function ResetPassword() {
  const localize = useLocalize();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TResetPassword>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const password = watch('password');
  const resetPassword = useResetPasswordMutation();
  const { setError, setHeaderText, startupConfig } = useOutletContext<TLoginLayoutContext>();

  const onSubmit = (data: TResetPassword) => {
    resetPassword.mutate(data, {
      onError: () => {
        setError('com_auth_error_invalid_reset_token');
      },
      onSuccess: () => {
        setHeaderText('com_auth_reset_password_success');
      },
    });
  };

  if (resetPassword.isSuccess) {
    return (
      <div
        className="relative rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-[13px] text-brand"
        role="alert"
      >
        <div className="flex flex-col space-y-3">
          <p>{localize('com_auth_login_with_new_password')}</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            aria-label={localize('com_auth_sign_in')}
            className="flex h-9 w-full items-center justify-center rounded-md bg-brand text-[13.5px] font-medium text-brand-fg transition-opacity hover:opacity-90"
          >
            {localize('com_auth_continue')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      aria-label="Password reset form"
      method="POST"
      onSubmit={handleSubmit(onSubmit)}
    >
      <input
        type="hidden"
        id="token"
        value={params.get('token') ?? ''}
        {...register('token', { required: 'Unable to process: No valid reset token' })}
      />
      <input
        type="hidden"
        id="userId"
        value={params.get('userId') ?? ''}
        {...register('userId', { required: 'Unable to process: No valid user id' })}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="password" className="field-label">
            {localize('com_auth_password')}
          </label>
          <input
            type="password"
            id="password"
            autoComplete="new-password"
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
              maxLength: {
                value: 128,
                message: localize('com_auth_password_max_length'),
              },
            })}
          />
          {errors.password && (
            <span role="alert" className="mt-1 block text-[11.5px] text-text-destructive">
              {errors.password.message}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="confirm_password" className="field-label">
            {localize('com_auth_password_confirm')}
          </label>
          <input
            type="password"
            id="confirm_password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-label={localize('com_auth_password_confirm')}
            aria-invalid={!!errors.confirm_password}
            className="inp focus:border-brand focus:outline-none"
            {...register('confirm_password', {
              validate: (value) => value === password || localize('com_auth_password_not_match'),
            })}
          />
          {errors.confirm_password && (
            <span role="alert" className="mt-1 block text-[11.5px] text-text-destructive">
              {errors.confirm_password.message}
            </span>
          )}
        </div>
      </div>

      {errors.token && (
        <span role="alert" className="block text-[11.5px] text-text-destructive">
          {errors.token.message}
        </span>
      )}
      {errors.userId && (
        <span role="alert" className="block text-[11.5px] text-text-destructive">
          {errors.userId.message}
        </span>
      )}

      <button
        type="submit"
        aria-label={localize('com_auth_submit_registration')}
        disabled={!!errors.password || !!errors.confirm_password || isSubmitting}
        className="flex h-9 w-full items-center justify-center rounded-md bg-brand text-[13.5px] font-medium text-brand-fg transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
      >
        {isSubmitting ? <Spinner className="size-4" /> : localize('com_auth_continue')}
      </button>
    </form>
  );
}

export default ResetPassword;
