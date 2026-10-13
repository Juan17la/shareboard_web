/**
 * Create an account, or sign in to one: two fields and one button, with a
 * link underneath that flips between the two. Used by the last welcome screen,
 * the account sheet, and wherever sharing asks for an account first.
 *
 * Registering takes the name and icon already chosen (welcome screen or
 * settings), so it asks for nothing else. Either way the guest id this browser
 * had goes along, and the boards it made become the account's.
 */
import { useState } from 'react';

import { useT } from '../../features/i18n';
import { useSessionStore } from '../../features/session';
import { ApiError, login, register } from '../../lib/api';
import { LIMITS } from '../../lib/contract';
import { toast } from '../../lib/toast';

import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Icon } from '../ui/Icon';

export type AuthMode = 'register' | 'login';

const USERNAME = /^[a-zA-Z0-9._]{3,24}$/;

export function AuthForm({
  initialMode = 'register',
  onDone,
}: {
  initialMode?: AuthMode;
  /** Signed in. */
  onDone: () => void;
}) {
  const t = useT();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registering = mode === 'register';
  const ready =
    USERNAME.test(username.trim()) &&
    (registering ? password.length >= LIMITS.minPasswordLength : password.length > 0);

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const { guestId, nickname, avatar, signIn } = useSessionStore.getState();
    try {
      const res = registering
        ? await register({ username: username.trim(), password, nickname, avatar, deviceId: guestId })
        : await login({ username: username.trim(), password, deviceId: guestId });
      signIn(
        { id: res.account.id, username: res.account.username, token: res.token },
        { nickname: res.account.nickname, avatar: res.account.avatar },
      );
      toast(t.toastSignedIn);
      onDone();
    } catch (err) {
      setError(messageFor(err, t));
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field
        label={t.username}
        value={username}
        onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').slice(0, 24))}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        name="username"
        hint={registering ? t.usernameHint : undefined}
      />
      <div className="relative">
        <Field
          label={t.password}
          type={reveal ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value.slice(0, 128))}
          autoComplete={registering ? 'new-password' : 'current-password'}
          name="password"
          hint={registering ? t.passwordHint : undefined}
          className="!pr-12"
        />
        {/* Sits on the input row: the label above it is 7px + one line. */}
        <button
          type="button"
          aria-label={reveal ? t.hidePassword : t.showPassword}
          aria-pressed={reveal}
          onClick={() => setReveal((on) => !on)}
          className="absolute right-1.5 top-[29px] grid h-10 w-10 place-items-center rounded-[10px] text-text-secondary transition hover:bg-surface-selected hover:text-text"
        >
          <Icon name={reveal ? 'eye-slash' : 'eye'} size={18} />
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-[0.7812rem] leading-snug font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        label={registering ? t.createAccount : t.signIn}
        loading={busy}
        disabled={!ready}
        fullWidth
      />
      <button
        type="button"
        onClick={() => {
          setMode(registering ? 'login' : 'register');
          setError(null);
        }}
        className="self-center rounded-[10px] px-2 py-1 text-[0.8125rem] font-bold text-accent transition hover:underline"
      >
        {registering ? t.haveAccount : t.noAccount}
      </button>
    </form>
  );
}

function messageFor(err: unknown, t: ReturnType<typeof useT>): string {
  if (!(err instanceof ApiError)) return t.errAuth;
  switch (err.code) {
    case 'LOGIN_INVALID':
      return t.errLogin;
    case 'USERNAME_TAKEN':
      return t.errUsernameTaken;
    case 'NETWORK':
      return t.needOnline;
    case 'VALIDATION':
    case 'RATE_LIMITED':
      return err.message;
    default:
      return t.errAuth;
  }
}
