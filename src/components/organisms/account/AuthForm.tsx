/**
 * Sign in, sign up, or reset a forgotten password: fields that explain
 * themselves, one button, and under it the way to the other ones. The sheet
 * around it carries the title, so `mode` is the sheet's to hold. Used by the
 * account sheet, which is also wherever sharing asks for an account first.
 *
 * Registering takes the name and icon already chosen (asked just before the
 * account sheet, or in settings), so it asks only for a username, an email and
 * a password. Either way the guest id this browser had goes along, and the
 * boards it made become the account's.
 *
 * A forgotten password is two steps: the email, then the 6-digit code it got
 * and a new password. The server answers the first the same whether or not the
 * email has an account, so this says "if it has one" rather than "sent".
 */
import { useRef, useState, type ReactNode } from 'react';

import { useT } from '../../../features/i18n';
import { useSessionStore } from '../../../features/session';
import { ApiError, forgotPassword, login, register, resetPassword, type SignedIn } from '../../../lib/api';
import { applySignedIn, authMessage, EMAIL, focusInvalid, passwordError } from './auth';
import { LIMITS } from '../../../lib/contract';
import { toast } from '../../../lib/toast';

import { Button } from '../../atoms/Button';
import { Field } from '../../atoms/Field';
import { Icon } from '../../atoms/Icon';

export type AuthMode = 'register' | 'login' | 'reset';

const USERNAME = /^[a-zA-Z0-9._]{3,24}$/;
const CODE = /^\d{6}$/;

export function AuthForm({
  mode,
  onModeChange,
  onDone,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  /** Signed in. */
  onDone: (res: SignedIn) => void;
}) {
  const t = useT();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState<'username' | 'email' | null>(null);
  const [shown, setShown] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const registering = mode === 'register';
  const name = username.trim();
  const mail = email.trim();
  // Sign-in only needs something typed: older accounts may predate today's rules.
  const userErr = registering
    ? !USERNAME.test(name)
      ? t.errUserInvalid
      : taken === 'username'
        ? t.errUsernameTaken
        : null
    : !name
      ? t.errUserRequired
      : null;
  const emailErr = !registering
    ? null
    : !mail
      ? t.errEmailRequired
      : !EMAIL.test(mail)
        ? t.errEmailInvalid
        : taken === 'email'
          ? t.errEmailTaken
          : null;
  const passErr = registering ? passwordError(password, t) : !password ? t.errPassRequired : null;

  function switchMode(next: AuthMode) {
    onModeChange(next);
    setError(null);
    setTaken(null);
    setShown(false);
  }

  async function submit() {
    if (busy) return;
    if (userErr || emailErr || passErr) {
      setShown(true);
      focusInvalid(formRef.current);
      return;
    }
    setBusy(true);
    setError(null);
    const { guestId, nickname, avatar } = useSessionStore.getState();
    try {
      const res = registering
        ? await register({ username: name, email: mail, password, nickname, avatar, deviceId: guestId })
        : await login({ login: name, password, deviceId: guestId });
      applySignedIn(res);
      toast(t.toastSignedIn);
      onDone(res);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'USERNAME_TAKEN' || err.code === 'EMAIL_TAKEN')) {
        setTaken(err.code === 'USERNAME_TAKEN' ? 'username' : 'email');
        setShown(true);
      } else {
        setError(authMessage(err, t));
      }
      setBusy(false);
    }
  }

  if (mode === 'reset') {
    return (
      <ResetForm
        onBack={() => switchMode('login')}
        onDone={(res) => {
          toast(t.toastPasswordChanged);
          onDone(res);
        }}
      />
    );
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
        label={registering ? t.username : t.loginId}
        value={username}
        onChange={(e) => {
          setUsername(e.target.value.replace(/\s/g, '').slice(0, registering ? 24 : 254));
          if (taken === 'username') setTaken(null);
        }}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        name="username"
        error={shown ? userErr : null}
        hint={registering ? <Rule met={USERNAME.test(name)}>{t.usernameHint}</Rule> : undefined}
      />
      {registering ? (
        <Field
          label={t.email}
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value.replace(/\s/g, '').slice(0, 254));
            if (taken === 'email') setTaken(null);
          }}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          name="email"
          error={shown ? emailErr : null}
        />
      ) : null}
      <PasswordField
        label={t.password}
        value={password}
        onChange={setPassword}
        autoComplete={registering ? 'new-password' : 'current-password'}
        error={shown ? passErr : null}
        hint={
          registering ? <Rule met={password.length >= LIMITS.minPasswordLength}>{t.passwordHint}</Rule> : undefined
        }
      />

      <FormError error={error} />

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
        <button
          type="button"
          onClick={() => switchMode('reset')}
          className="self-center text-[0.8125rem] text-text-secondary underline underline-offset-2 hover:text-text"
        >
          {t.forgotPassword}
        </button>
      )}
    </form>
  );
}

/** Forgot password: the email, then its code and a new password. Signs in at the end. */
function ResetForm({ onBack, onDone }: { onBack: () => void; onDone: (res: SignedIn) => void }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const mail = email.trim();
  const emailErr = !mail ? t.errEmailRequired : !EMAIL.test(mail) ? t.errEmailInvalid : null;
  const codeErr = CODE.test(code) ? null : t.errCodeFormat;
  const passErr = passwordError(password, t);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(authMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (busy) return;
    if (emailErr || (sent && (codeErr || passErr))) {
      setShown(true);
      focusInvalid(formRef.current);
      return;
    }
    if (!sent) {
      void run(async () => {
        await forgotPassword(mail);
        setSent(true);
        setShown(false);
      });
    } else {
      void run(async () => {
        const res = await resetPassword({ email: mail, code, password });
        applySignedIn(res);
        onDone(res);
      });
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p role="status" className="text-[0.875rem] leading-snug text-text-secondary">
        {sent ? t.resetSent : t.forgotIntro}
      </p>
      <Field
        label={t.email}
        type="email"
        inputMode="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value.replace(/\s/g, '').slice(0, 254));
          setSent(false);
        }}
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        name="email"
        error={shown ? emailErr : null}
      />
      {sent ? (
        <>
          <CodeField value={code} onChange={setCode} error={shown ? codeErr : null} />
          <PasswordField
            label={t.newPassword}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            error={shown ? passErr : null}
            hint={<Rule met={password.length >= LIMITS.minPasswordLength}>{t.passwordHint}</Rule>}
          />
        </>
      ) : null}

      <FormError error={error} />

      <Button
        type="submit"
        variant="go"
        icon="go"
        label={sent ? t.changePassword : t.sendCode}
        loading={busy}
        fullWidth
        className="flex-row-reverse"
      />
      {sent ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(async () => {
            await forgotPassword(mail);
            toast(t.toastCodeSent);
          })}
          className="self-center text-[0.8125rem] font-bold text-accent-text underline-offset-2 hover:underline"
        >
          {t.resendCode}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onBack}
        className="self-center text-[0.8125rem] text-text-secondary underline underline-offset-2 hover:text-text"
      >
        {t.backToSignIn}
      </button>
    </form>
  );
}

/** The 6-digit code from an email: digits only, filled in by the phone's one-time-code suggestion. */
export function CodeField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (code: string) => void;
  error: string | null;
}) {
  const t = useT();
  return (
    <Field
      label={t.emailCode}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      name="code"
      mono
      error={error}
    />
  );
}

/** A password input with its show/hide toggle sitting on the input row. */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (password: string) => void;
  autoComplete: 'new-password' | 'current-password';
  error: string | null;
  hint?: ReactNode;
}) {
  const t = useT();
  const [reveal, setReveal] = useState(false);
  return (
    <div className="relative">
      <Field
        label={label}
        type={reveal ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 128))}
        autoComplete={autoComplete}
        name={autoComplete === 'new-password' ? 'new-password' : 'password'}
        error={error}
        hint={hint}
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
  );
}

export function FormError({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-[0.7812rem] leading-snug font-semibold text-danger">
      {error}
    </p>
  ) : null;
}

/** A rule under a field that ticks itself off as it is met. */
export function Rule({ met, children }: { met: boolean; children: string }) {
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
