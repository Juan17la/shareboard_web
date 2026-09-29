/**
 * "Share board": the three ways someone else gets in — scan it, read the code
 * out, or send the link.
 *
 * The QR is generated for real (`lib/qr.ts`) rather than being a decorative
 * block, because the whole point of the panel is a phone pointing a camera at a
 * laptop — which is also how a class gets from a projected board to thirty
 * devices without anyone typing a URL.
 */
import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { copyText } from '../../lib/clipboard';
import { formatShortCode } from '../../lib/short-code';

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
  const code = meta?.shortCode ?? '';

  const copy = async (value: string, message: string) => {
    try {
      await copyText(value);
      toast(message);
    } catch {
      toast(t.errClipboard);
    }
  };

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
                <span className="text-[17px] font-extrabold tracking-[1.6px]">
                  {formatShortCode(code)}
                </span>
                <Icon name="copy" size={15} />
              </button>
              <p className="text-[11px] leading-snug text-text-secondary">{t.qrHint}</p>
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
              <div className="text-[13.5px] leading-tight font-bold">{t.copyLink}</div>
              <div className="truncate font-mono text-[11px] text-text-secondary">{link}</div>
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
        <span className="text-[11.5px] font-bold">{label}</span>
      </button>
    </GlassPanel>
  );
}
