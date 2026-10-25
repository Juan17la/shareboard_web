/**
 * "Account": who is signed in and the way out — or, for a guest, the form to
 * sign in. Sharing opens it too, with `reason` saying why it is asking.
 */
import { fill, useT } from '../../features/i18n';
import { useSessionStore } from '../../features/session';
import { toast } from '../../lib/toast';

import { AuthForm } from '../account/AuthForm';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { GlassPanel } from '../ui/Glass';
import { Sheet } from '../ui/Sheet';

export function AccountSheet({
  open,
  onClose,
  reason,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  /** Shown above the form: why an account is needed right now. */
  reason?: string;
  /** Called after signing in; closes the sheet by default. */
  onSignedIn?: () => void;
}) {
  const t = useT();
  const account = useSessionStore((s) => s.account);
  const nickname = useSessionStore((s) => s.nickname);
  const nickColor = useSessionStore((s) => s.nickColor);
  const avatar = useSessionStore((s) => s.avatar);

  return (
    <Sheet open={open} title={account ? t.sheetAccount : (reason ? t.signInToShare : t.signIn)} onClose={onClose} closeLabel={t.close}>
      {account ? (
        <div className="flex flex-col gap-3">
          <GlassPanel level="row" radius={18}>
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
        <div className="flex flex-col gap-4 pb-1">
          <p className="text-[0.8125rem] leading-relaxed text-text-secondary">{reason ?? t.accountSub}</p>
          <AuthForm initialMode="login" onDone={onSignedIn ?? onClose} />
        </div>
      )}
    </Sheet>
  );
}
