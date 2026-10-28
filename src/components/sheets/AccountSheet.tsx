/**
 * "Account": who is signed in and the way out — or, for a guest, the form to
 * sign in. Sharing opens it too, after its own sheet has said why.
 */
import { fill, useT } from '../../features/i18n';
import { useSessionStore } from '../../features/session';
import { toast } from '../../lib/toast';

import { useState } from 'react';

import { AuthForm, type AuthMode } from '../account/AuthForm';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { GlassPanel } from '../ui/Glass';
import { Sheet } from '../ui/Sheet';

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

  return (
    <Sheet
      open={open}
      title={account ? t.sheetAccount : mode === 'register' ? t.signUp : t.signIn}
      large={!account}
      onClose={onClose}
      closeLabel={t.close}
    >
      {account ? (
        <div className="flex flex-col gap-3">
          <GlassPanel level="row" radius={14} border="var(--color-line-strong)">
            <div className="flex items-center gap-3 p-3.5">
              <Avatar name={nickname} color={nickColor} avatar={avatar} size={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.9375rem] leading-tight font-bold">{nickname}</div>
                <div className="mt-0.5 truncate text-[0.75rem] text-text-secondary">
                  {fill(t.signedInAs, { USER: account.username })}
                </div>
              </div>
            </div>
          </GlassPanel>
          <Button
            label={t.signOut}
            variant="secondary"
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
          <AuthForm mode={mode} onModeChange={setMode} onDone={onSignedIn ?? onClose} />
        </div>
      )}
    </Sheet>
  );
}
