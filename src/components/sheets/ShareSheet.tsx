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

import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { loadLocal, updateLocal } from '../../features/board-local';
import { useSessionStore } from '../../features/session';
import { ApiError, importSnapshot } from '../../lib/api';
import { copyText } from '../../lib/clipboard';
import { SNAPSHOT_FORMAT, SNAPSHOT_VERSION } from '../../lib/contract';
import { formatShortCode } from '../../lib/short-code';

import { Button } from '../ui/Button';

import { GlassPanel } from '../ui/Glass';
import { Icon, type IconName } from '../ui/Icon';
import { QRCode } from '../ui/QRCode';
import { SectionLabel, Sheet } from '../ui/Sheet';
import { toast } from '../../lib/toast';

export function ShareSheet({
  open,
  onClose,
  link,
  onOpenExport,
  onOpenPrivacy,
}: {
  open: boolean;
  onClose: () => void;
  link: string;
  onOpenExport: () => void;
  onOpenPrivacy: () => void;
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

  if (local) return <LocalShare open={open} onClose={onClose} onOpenExport={onOpenExport} />;

  return (
    <Sheet open={open} title={t.sheetShare} onClose={onClose} closeLabel={t.close}>
      <div className="flex flex-col gap-3">
        <GlassPanel level="row" radius={18}>
          <div className="flex items-center gap-3.5 p-4">
            <QRCode value={link} size={104} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <SectionLabel>{t.code}</SectionLabel>
              <button
                type="button"
                aria-label={`${t.code} ${code}`}
                onClick={() => copy(code, t.toastCopied)}
                className="flex items-center gap-2 self-start rounded-[13px] border border-line-strong bg-surface px-[11px] py-2.5 transition hover:bg-surface-selected"
              >
                <span className="text-[1.0625rem] font-extrabold tracking-[1.6px]">
                  {formatShortCode(code)}
                </span>
                <Icon name="copy" size={15} />
              </button>
              <p className="text-[0.75rem] leading-snug text-text-secondary">{t.qrHint}</p>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel level="row" radius={16}>
          <button
            type="button"
            aria-label={t.copyLink}
            onClick={() => copy(link, t.toastLink)}
            className="flex w-full items-center gap-2.5 p-3.5 text-left transition hover:bg-surface-selected"
          >
            <Icon name="link" size={18} />
            <div className="min-w-0 flex-1">
              <div className="text-[0.8438rem] leading-tight font-bold">{t.copyLink}</div>
              <div className="truncate font-mono text-[0.75rem] text-text-secondary">{link}</div>
            </div>
          </button>
        </GlassPanel>

        <div className="flex gap-2.5">
          <ShortcutTile icon="image" label={t.exportImage} onClick={onOpenExport} />
          <ShortcutTile icon="lock" label={t.permissions} onClick={onOpenPrivacy} />
        </div>
      </div>
    </Sheet>
  );
}

/**
 * The offline board has no code yet (plans/34): sharing makes a live copy of
 * it and opens that, this sheet staying up to show the new code and link. The
 * offline board stays as it is — a private copy, never merged with the live one.
 */
function LocalShare({ open, onClose, onOpenExport }: { open: boolean; onClose: () => void; onOpenExport: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const userId = useSessionStore((s) => s.userId);
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
      <div className="flex flex-col gap-3">
        <p className="text-[0.8125rem] leading-relaxed text-text-secondary">{t.shareLocalBody}</p>
        <Button label={t.shareLocalCta} icon="share" loading={busy} fullWidth onClick={() => void promote()} />
        {sharedAs ? (
          <Button label={t.openShared} icon="link" variant="secondary" fullWidth onClick={() => navigate(`/board/${sharedAs}`)} />
        ) : null}
        <ShortcutTile icon="image" label={t.exportImage} onClick={onOpenExport} />
      </div>
    </Sheet>
  );
}

function ShortcutTile({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
}) {
  return (
    <GlassPanel level="row" radius={16} className="flex-1">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="flex w-full flex-col items-center gap-1.5 px-2 py-3.5 transition hover:bg-surface-selected"
      >
        <Icon name={icon} size={20} />
        <span className="text-[0.75rem] font-bold">{label}</span>
      </button>
    </GlassPanel>
  );
}
