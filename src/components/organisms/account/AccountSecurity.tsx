/**
 * The signed-in half of the account sheet: the account's email (add one,
 * enter its code, change it) and changing the password.
 *
 * An email is what sharing needs (the server refuses an unverified account
 * with EMAIL_UNVERIFIED), and what a forgotten password is recovered through.
 * Accounts from before emails have none, so they are asked for one here.
 * Adding or changing it asks for the password: a borrowed, signed-in browser
 * must not be enough to point the account's resets at someone else's inbox.
 */
import { useRef, useState } from 'react';

import { fill, useT } from '../../../features/i18n';
import { useSessionStore } from '../../../features/session';
import { changePassword, resendEmailCode, setEmail, verifyEmail, type AccountProfile } from '../../../lib/api';
import { LIMITS } from '../../../lib/contract';
import { toast } from '../../../lib/toast';

import { Button } from '../../atoms/Button';
import { Field } from '../../atoms/Field';
import { GlassPanel } from '../../atoms/Glass';
import { Icon } from '../../atoms/Icon';
import { applySignedIn, authMessage, EMAIL, focusInvalid, passwordError } from './auth';
import { CodeField, FormError, PasswordField, Rule } from './AuthForm';

const keep = (a: AccountProfile) =>
  useSessionStore
    .getState()
    .updateAccount({ email: a.email, emailVerified: a.emailVerified, verificationRequired: a.verificationRequired });

/** Add, verify or change the account's email. `onVerified` runs once it is verified here. */
export function EmailSection({ onVerified }: { onVerified?: () => void }) {
  const t = useT();
  const account = useSessionStore((s) => s.account);
  const [editing, setEditing] = useState(false);
  if (!account) return null;
  const email = account.email ?? null;

  const required = account.verificationRequired === true;
  if (!email || editing) {
    return (
      <EmailForm
        current={email}
        required={required}
        onDone={() => setEditing(false)}
        onCancel={email ? () => setEditing(false) : undefined}
      />
    );
  }
  if (!account.emailVerified && required) return <VerifyForm email={email} onChange={() => setEditing(true)} onVerified={onVerified} />;

  return (
    <GlassPanel level="row" radius={14}>
      <div className="flex items-center gap-3 p-3.5">
        {account.emailVerified ? <Icon name="check" size={18} /> : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[0.875rem] font-bold">{email}</div>
          {account.emailVerified ? <div className="text-[0.75rem] font-semibold text-go">{t.emailVerified}</div> : null}
        </div>
        <Button label={t.changeEmail} variant="secondary" compact onClick={() => setEditing(true)} />
      </div>
    </GlassPanel>
  );
}

function EmailForm({
  current,
  required,
  onDone,
  onCancel,
}: {
  current: string | null;
  /** Sharing waits for the email: say so. Otherwise it is only for password resets. */
  required: boolean;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = useT();
  const [email, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const mail = email.trim();
  const emailErr = !mail ? t.errEmailRequired : !EMAIL.test(mail) ? t.errEmailInvalid : null;
  const passErr = password ? null : t.errPassRequired;

  async function submit() {
    if (busy) return;
    if (emailErr || passErr) {
      setShown(true);
      focusInvalid(formRef.current);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      keep(await setEmail(mail, password));
      toast(required ? t.toastCodeSent : t.toastEmailSaved);
      onDone();
    } catch (err) {
      setError(authMessage(err, t));
    } finally {
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
      {current ? null : (
        <div>
          <h3 className="text-[0.9375rem] font-bold">{t.addEmailTitle}</h3>
          <p className="mt-1 text-[0.8125rem] leading-snug text-text-secondary">{required ? t.addEmailBody : t.addEmailBodyReset}</p>
        </div>
      )}
      <Field
        label={t.email}
        type="email"
        inputMode="email"
        value={email}
        onChange={(e) => setValue(e.target.value.replace(/\s/g, '').slice(0, 254))}
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        name="email"
        error={shown ? emailErr : null}
      />
      <PasswordField
        label={t.confirmWithPassword}
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        error={shown ? passErr : null}
      />
      <FormError error={error} />
      <div className="flex gap-2">
        {onCancel ? <Button label={t.cancel} variant="secondary" fullWidth onClick={onCancel} /> : null}
        <Button type="submit" label={t.sendCode} loading={busy} fullWidth />
      </div>
    </form>
  );
}

function VerifyForm({ email, onChange, onVerified }: { email: string; onChange: () => void; onVerified?: () => void }) {
  const t = useT();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<void>) {
    if (busy) return;
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

  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length !== 6) return setError(t.errCodeFormat);
        void run(async () => {
          keep(await verifyEmail(code));
          toast(t.toastEmailVerified);
          onVerified?.();
        });
      }}
    >
      <div>
        <h3 className="text-[0.9375rem] font-bold">{t.verifyTitle}</h3>
        <p className="mt-1 text-[0.8125rem] leading-snug text-text-secondary">{fill(t.verifyBody, { EMAIL: email })}</p>
      </div>
      <CodeField value={code} onChange={setCode} error={null} />
      <FormError error={error} />
      <Button type="submit" variant="go" label={t.verifyCta} loading={busy} fullWidth />
      <div className="flex justify-center gap-4 text-[0.8125rem]">
        <button
          type="button"
          onClick={() => void run(async () => {
            await resendEmailCode();
            toast(t.toastCodeSent);
          })}
          className="font-bold text-accent-text underline-offset-2 hover:underline"
        >
          {t.resendCode}
        </button>
        <button type="button" onClick={onChange} className="text-text-secondary underline underline-offset-2 hover:text-text">
          {t.changeEmail}
        </button>
      </div>
    </form>
  );
}

/** Current password, new password. This browser stays signed in with a new token; every other session ends. */
export function PasswordSection() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) return <Button label={t.changePassword} variant="secondary" fullWidth onClick={() => setOpen(true)} />;

  const currentErr = current ? null : t.errPassRequired;
  const nextErr = passwordError(next, t);

  async function submit() {
    if (busy) return;
    if (currentErr || nextErr) {
      setShown(true);
      focusInvalid(formRef.current);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      applySignedIn(await changePassword(current, next));
      toast(t.toastPasswordChanged);
      setOpen(false);
      setCurrent('');
      setNext('');
    } catch (err) {
      setError(authMessage(err, t));
    } finally {
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
      <h3 className="text-[0.9375rem] font-bold">{t.changePassword}</h3>
      <PasswordField
        label={t.currentPassword}
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
        error={shown ? currentErr : null}
      />
      <PasswordField
        label={t.newPassword}
        value={next}
        onChange={setNext}
        autoComplete="new-password"
        error={shown ? nextErr : null}
        hint={<Rule met={next.length >= LIMITS.minPasswordLength}>{t.passwordHint}</Rule>}
      />
      <FormError error={error} />
      <div className="flex gap-2">
        <Button label={t.cancel} variant="secondary" fullWidth onClick={() => setOpen(false)} />
        <Button type="submit" label={t.changePassword} loading={busy} fullWidth />
      </div>
    </form>
  );
}
