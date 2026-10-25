/**
 * Create an account, or sign in to one: a segmented switch on top, two fields
 * that explain themselves, one button. Used by the account sheet, which is
 * also wherever sharing asks for an account first.
 *
 * Registering takes the name and icon already chosen (asked just before the
 * account sheet, or in settings), so it asks for nothing else. Either way the
 * guest id this browser had goes along, and the boards it made become the account's.
 */
import { useRef, useState } from 'react';

import { useT } from '../../features/i18n';
import { useSessionStore } from '../../features/session';
import { ApiError, login, register } from '../../lib/api';
import { LIMITS } from '../../lib/contract';
import { toast } from '../../lib/toast';

import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { Segmented } from '../ui/Segmented';

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
  const [taken, setTaken] = useState(false);
  const [shown, setShown] = useState({ username: false, password: false });
  const formRef = useRef<HTMLFormElement>(null);

  const registering = mode === 'register';
  const name = username.trim();
  // Sign-in only needs something typed: older accounts may predate today's rules.
  const userErr = !name
    ? t.errUserRequired
    : registering && !USERNAME.test(name)
      ? t.errUserInvalid
      : taken
        ? t.errUsernameTaken
        : null;
  const passErr = !password
    ? t.errPassRequired
    : registering && password.length < LIMITS.minPasswordLength
      ? t.errPassShort
      : null;

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setTaken(false);
    setShown({ username: false, password: false });
  }

  async function submit() {
    if (busy) return;
    if (userErr || passErr) {
      setShown({ username: true, password: true });
      // Wait for the errors to render, then land the caret on the first one.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true);
    setError(null);
    const { guestId, nickname, avatar, signIn } = useSessionStore.getState();
    try {
      const res = registering
        ? await register({ username: name, password, nickname, avatar, deviceId: guestId })
        : await login({ username: name, password, deviceId: guestId });
      signIn(
        { id: res.account.id, username: res.account.username, token: res.token },
        { nickname: res.account.nickname, avatar: res.account.avatar },
      );
      toast(t.toastSignedIn);
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'USERNAME_TAKEN') {
        setTaken(true);
        setShown((s) => ({ ...s, username: true }));
      } else {
        setError(messageFor(err, t));
      }
      setBusy(false);
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Segmented
        label={t.accountTitle}
        value={mode}
        onChange={switchMode}
        options={[
          { value: 'register', label: t.createAccount },
          { value: 'login', label: t.signIn },
        ]}
      />
      <Field
        label={t.username}
        value={username}
        onChange={(e) => {
          setUsername(e.target.value.replace(/\s/g, '').slice(0, 24));
          setTaken(false);
        }}
        onBlur={() => setShown((s) => ({ ...s, username: true }))}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        name="username"
        error={shown.username ? userErr : null}
        hint={registering ? t.usernameHint : undefined}
      />
      <div className="relative">
        <Field
          label={t.password}
          type={reveal ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value.slice(0, 128))}
          onBlur={() => setShown((s) => ({ ...s, password: true }))}
          autoComplete={registering ? 'new-password' : 'current-password'}
          name="password"
          error={shown.password ? passErr : null}
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

      <Button type="submit" label={registering ? t.createAccount : t.signIn} loading={busy} fullWidth />
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
