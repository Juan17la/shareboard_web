/**
 * "Account": who is signed in, their email and password, and the way out — or,
 * for a guest, the form to sign in. Sharing opens it too, after its own sheet
 * has said why; it carries on (`onSignedIn`) once the account may share, which
 * for a new or older account means after its email is verified here.
 */
import { fill, useT } from '../../../features/i18n';
import { useSessionStore } from '../../../features/session';
import { ApiError, getMe } from '../../../lib/api';
import { toast } from '../../../lib/toast';

import { useEffect, useState } from 'react';

import { EmailSection, PasswordSection } from '../account/AccountSecurity';
import { AuthForm, type AuthMode } from '../account/AuthForm';
import { Avatar } from '../../atoms/Avatar';
import { Button } from '../../atoms/Button';
import { Sheet } from '../../molecules/Sheet';

export function AccountSheet({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after signing in; closes the sheet by default. */
  onSignedIn?: () => void;
}) {
  const t = useT();
  const account = useSessionStore((s) => s.account);
  const nickname = useSessionStore((s) => s.nickname);
  const nickColor = useSessionStore((s) => s.nickColor);
  const avatar = useSessionStore((s) => s.avatar);
  // Sign in first: most people opening this already have an account somewhere.
  const [mode, setMode] = useState<AuthMode>('login');
  const done = onSignedIn ?? onClose;

  // The email may have been verified (or the password changed) on another
  // device since this browser signed in: ask the server, which decides anyway.
  const signedIn = account !== null;
  useEffect(() => {
    if (!open || !signedIn) return;
    getMe().then(
      (me) =>
        useSessionStore.getState().updateAccount({
          email: me.email,
          emailVerified: me.emailVerified,
          verificationRequired: me.verificationRequired,
        }),
      (err) => {
        if (err instanceof ApiError && err.code === 'AUTH_REQUIRED') {
          useSessionStore.getState().signOut();
          toast(t.sessionExpired);
        }
      },
    );
  }, [open, signedIn, t]);

  return (
    <Sheet
      open={open}
      title={account ? t.sheetAccount : mode === 'register' ? t.signUp : mode === 'reset' ? t.forgotPassword : t.signIn}
      large={!account}
      onClose={onClose}
      closeLabel={t.close}
    >
      {account ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-[12px] bg-glass-row px-3 py-2.5">
            <Avatar name={nickname} color={nickColor} avatar={avatar} size={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.9375rem] leading-tight font-semibold">{nickname}</div>
              <div className="mt-0.5 truncate text-[0.75rem] text-text-secondary">
                {fill(t.signedInAs, { USER: account.username })}
              </div>
            </div>
          </div>
          <EmailSection onVerified={onSignedIn} />
          <PasswordSection />
          <Button
            label={t.signOut}
            variant="danger"
            fullWidth
            onClick={() => {
              useSessionStore.getState().signOut();
              toast(t.toastSignedOut);
              onClose();
            }}
          />
        </div>
      ) : (
        <div className="pb-1">
          {/* An account that cannot share yet stays here, on its email. */}
          <AuthForm mode={mode} onModeChange={setMode} onDone={(res) => (res.account.emailVerified || !res.account.verificationRequired ? done() : undefined)} />
        </div>
      )}
    </Sheet>
  );
}
