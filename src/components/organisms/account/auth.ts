/** Account helpers shared by the sign-in form and the account sheet's email and password sections. */
import type { useT } from '../../../features/i18n';
import { useSessionStore } from '../../../features/session';
import { ApiError, type SignedIn } from '../../../lib/api';
import { LIMITS } from '../../../lib/contract';

/** The server's check; it has the last word. */
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Strings = ReturnType<typeof useT>;

/** Puts the account the server returned on this browser. */
export function applySignedIn(res: SignedIn): void {
  useSessionStore.getState().signIn(
    {
      id: res.account.id,
      username: res.account.username,
      token: res.token,
      email: res.account.email,
      emailVerified: res.account.emailVerified,
      verificationRequired: res.account.verificationRequired,
    },
    { nickname: res.account.nickname, avatar: res.account.avatar },
  );
}

/** A new password's rule, as typed. */
export const passwordError = (password: string, t: Strings) =>
  !password ? t.errPassRequired : password.length < LIMITS.minPasswordLength ? t.errPassShort : null;

/** After the errors render, lands the caret on the first one. */
export function focusInvalid(form: HTMLFormElement | null): void {
  requestAnimationFrame(() => form?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
}

export function authMessage(err: unknown, t: Strings): string {
  if (!(err instanceof ApiError)) return t.errAuth;
  switch (err.code) {
    case 'LOGIN_INVALID':
      return t.errLogin;
    case 'USERNAME_TAKEN':
      return t.errUsernameTaken;
    case 'EMAIL_TAKEN':
      return t.errEmailTaken;
    case 'CODE_INVALID':
      return t.errCode;
    case 'NETWORK':
      return t.needOnline;
    case 'VALIDATION':
    case 'RATE_LIMITED':
      return err.message;
    default:
      return t.errAuth;
  }
}
