/**
 * "Share board": the three ways someone else gets in — scan it, read the code
 * out, or send the link.
 *
 * The QR is generated for real (`lib/qr.ts`) rather than being a decorative
 * block, because the whole point of the panel is a phone pointing a camera at a
 * laptop — which is also how a class gets from a projected board to thirty
 * devices without anyone typing a URL.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useT } from '../../../features/i18n';
import { useBoardStore } from '../../../features/board-store';
import { loadLocal, updateLocal } from '../../../features/board-local';
import { mayShare, useSessionStore } from '../../../features/session';
import { ApiError, importSnapshot } from '../../../lib/api';
import { copyText } from '../../../lib/clipboard';
import { SNAPSHOT_FORMAT, SNAPSHOT_VERSION } from '../../../lib/contract';
import { formatShortCode } from '../../../lib/short-code';

import { Button } from '../../atoms/Button';

import { Icon, type IconName } from '../../atoms/Icon';
import { QRCode } from '../../atoms/QRCode';
import { RowChevron, Sheet, SheetGroup, SheetRow } from '../../molecules/Sheet';
import { toast } from '../../../lib/toast';

export function ShareSheet({
  open,
  onClose,
  link,
  onOpenPrivacy,
  onNeedAccount,
  onCreateBlank,
  creating,
}: {
  open: boolean;
  onClose: () => void;
  link: string;
  onOpenPrivacy: () => void;
  /** Sharing the offline board needs an account; a guest is sent to sign in. */
  onNeedAccount: () => void;
  /** A new, blank live board instead of a copy of this one. */
  onCreateBlank: () => void;
  creating: boolean;
}) {
  const t = useT();
  const meta = useBoardStore((s) => s.meta);
  const local = useBoardStore((s) => s.connection === 'local');
  const code = meta?.shortCode ?? '';

  const copy = async (value: string, message: string) => {
    try {
      await copyText(value);
      toast(message);
    } catch {
      toast(t.errClipboard);
    }
  };

  if (local) {
    return (
      <LocalShare
        open={open}
        onClose={onClose}
        onNeedAccount={onNeedAccount}
        onCreateBlank={onCreateBlank}
        creating={creating}
      />
    );
  }

  return (
    <Sheet open={open} title={t.sheetShare} onClose={onClose} closeLabel={t.close} wide>
      {/* Left: the thing to scan. Right: the things to read out or send. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-5">
        <div className="flex flex-col items-center justify-center gap-2 sm:w-[240px] sm:flex-none">
          <QRCode value={link} size={176} />
          <p className="text-center text-[0.75rem] leading-snug text-text-secondary">{t.qrHint}</p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
          {/* The code is what gets read out loud: big, mono, one tap to copy. */}
          <SheetGroup title={t.code}>
            <button
              type="button"
              aria-label={`${t.code} ${code}`}
              onClick={() => copy(code, t.toastCopied)}
              className="touch-44 flex min-h-12 w-full items-center justify-between gap-3 px-3 text-left transition-colors hover:bg-fill active:bg-fill-strong"
            >
              <span className="font-mono text-[1.375rem] font-bold tracking-[2px]">{formatShortCode(code)}</span>
              <Icon name="copy" size={17} className="flex-none text-accent-text" />
            </button>
          </SheetGroup>

          <SheetGroup>
            <SheetRow
              title={t.copyLink}
              description={<span className="block truncate font-mono">{link}</span>}
              left={<Icon name="link" size={19} className="flex-none text-accent-text" />}
              onClick={() => copy(link, t.toastLink)}
            />
            <SheetRow
              title={t.permissions}
              left={<Icon name="lock" size={19} className="flex-none text-accent-text" />}
              right={<RowChevron />}
              onClick={onOpenPrivacy}
            />
          </SheetGroup>
        </div>
      </div>
    </Sheet>
  );
}

/**
 * The offline board has no code yet (plans/34): sharing makes a live copy of
 * it and opens that, this sheet staying up to show the new code and link. The
 * offline board stays as it is — a private copy, never merged with the live one.
 * A guest is asked to sign in first: a live board belongs to an account.
 */
function LocalShare({
  open,
  onClose,
  onNeedAccount,
  onCreateBlank,
  creating,
}: {
  open: boolean;
  onClose: () => void;
  onNeedAccount: () => void;
  onCreateBlank: () => void;
  creating: boolean;
}) {
  const t = useT();
  const navigate = useNavigate();
  const userId = useSessionStore((s) => s.userId);
  const signedIn = useSessionStore((s) => s.account !== null);
  const verified = useSessionStore((s) => mayShare(s.account));
  const [busy, setBusy] = useState(false);
  const [sharedAs, setSharedAs] = useState<string | undefined>();
  useEffect(() => {
    if (open) void loadLocal().then((board) => setSharedAs(board?.sharedAs));
  }, [open]);

  async function promote() {
    const { meta, visibleElements } = useBoardStore.getState();
    if (!meta) return;
    setBusy(true);
    try {
      const created = await importSnapshot(
        { format: SNAPSHOT_FORMAT, version: SNAPSHOT_VERSION, meta: { name: meta.name }, elements: visibleElements(), exportedAt: Date.now() },
        userId,
      );
      await updateLocal(meta.id, { sharedAs: created.id });
      navigate(`/board/${created.id}`);
    } catch (error) {
      toast(error instanceof ApiError && error.code !== 'NETWORK' ? error.message : t.needOnline);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} title={t.sheetShare} onClose={onClose} closeLabel={t.close}>
      {verified ? (
        <div className="flex flex-col gap-3">
          <p className="text-[0.875rem] leading-snug text-text-secondary">{t.shareLocalBody}</p>
          <ShareChoice
            label={t.shareThisBoard}
            description={t.shareThisBoardDesc}
            icon="share"
            loading={busy}
            disabled={creating}
            onClick={() => void promote()}
          />
          <ShareChoice
            label={t.shareBlank}
            description={t.shareBlankDesc}
            icon="plus"
            variant="secondary"
            loading={creating}
            disabled={busy}
            onClick={onCreateBlank}
          />
          {sharedAs ? (
            <Button label={t.openShared} icon="link" variant="secondary" fullWidth onClick={() => navigate(`/board/${sharedAs}`)} />
          ) : null}
        </div>
      ) : (
        // Sharing needs an account with a verified email, so that is the one way forward and nothing else.
        <div className="flex flex-col gap-3">
          <p className="text-[0.875rem] leading-snug text-text-secondary">
            {signedIn ? t.addEmailBody : t.signInToShareBody}
          </p>
          <Button label={signedIn ? t.verifyTitle : t.signInToShare} icon="user" fullWidth onClick={onNeedAccount} />
        </div>
      )}
    </Sheet>
  );
}

/** One way to share: the button, and what it does under it. */
function ShareChoice({
  label,
  description,
  icon,
  variant,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  icon: IconName;
  variant?: 'secondary';
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Button label={label} icon={icon} variant={variant} loading={loading} disabled={disabled} fullWidth onClick={onClick} />
      <p className="text-center text-[0.75rem] leading-snug text-text-secondary">{description}</p>
    </div>
  );
}

