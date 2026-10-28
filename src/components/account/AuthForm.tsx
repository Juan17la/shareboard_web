/**
 * Sign in, or sign up: two fields that explain themselves, one button, and
 * under it the way to the other one and the forgotten-password answer. The
 * sheet around it carries the title, so `mode` is the sheet's to hold. Used by the account sheet, which is
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

export type AuthMode = 'register' | 'login';

const USERNAME = /^[a-zA-Z0-9._]{3,24}$/;

export function AuthForm({
  mode,
  onModeChange,
  onDone,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  /** Signed in. */
  onDone: () => void;
}) {
  const t = useT();
  const [forgot, setForgot] = useState(false);
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
    onModeChange(next);
    setForgot(false);
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
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
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
        hint={registering ? <Rule met={USERNAME.test(name)}>{t.usernameHint}</Rule> : undefined}
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
          hint={registering ? <Rule met={password.length >= LIMITS.minPasswordLength}>{t.passwordHint}</Rule> : undefined}
          className="!pr-12"
        />
        {/* Sits on the input row: the label above it is 7px + one line. */}
        <button
          type="button"
          aria-label={reveal ? t.hidePassword : t.showPassword}
          aria-pressed={reveal}
          onClick={() => setReveal((on) => !on)}
          className="absolute right-1 top-[27.5px] grid h-10 w-10 place-items-center rounded-full text-text-secondary transition hover:bg-surface hover:text-text"
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
        variant="go"
        icon="go"
        label={registering ? t.signUp : t.signIn}
        loading={busy}
        fullWidth
        className="flex-row-reverse"
      />

      <p className="text-center text-[0.875rem] text-text-secondary">
        {registering ? t.haveAccount : t.noAccount}{' '}
        <button
          type="button"
          onClick={() => switchMode(registering ? 'login' : 'register')}
          className="font-bold text-accent-text underline-offset-2 hover:underline"
        >
          {registering ? t.signIn : t.signUp}
        </button>
      </p>
      {registering ? null : (
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            aria-expanded={forgot}
            onClick={() => setForgot((on) => !on)}
            className="text-[0.8125rem] text-text-secondary underline underline-offset-2 hover:text-text"
          >
            {t.forgotPassword}
          </button>
          {forgot ? (
            <p role="status" className="text-center text-[0.8125rem] leading-snug text-text-secondary">
              {t.forgotBody}
            </p>
          ) : null}
        </div>
      )}
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

/** A rule under a field that ticks itself off as it is met. */
function Rule({ met, children }: { met: boolean; children: string }) {
  return (
    <span className={`flex items-center gap-1.5 ${met ? 'font-semibold text-go' : ''}`}>
      <span
        className={`grid h-3.5 w-3.5 flex-none place-items-center rounded-full ${met ? 'bg-go text-white' : 'border-[1.5px] border-text-tertiary'}`}
      >
        {met ? <Icon name="check" size={9} /> : null}
      </span>
      {children}
    </span>
  );
}
