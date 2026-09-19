/**
 * The floating tool rail and its options panel.
 *
 * The design puts five tools in a vertical rail on the right, and hides
 * everything else in a second column that opens beside it and only ever shows
 * the options belonging to the tool in hand. That is the "las herramientas más
 * usadas siempre visibles; las menos frecuentes, ocultas hasta que se
 * necesitan" rule from mobile/docs/01 made literal: the pencil never shows you
 * a bold button.
 *
 * The rail is a single component rather than five, because which options are on
 * screen is a function of the active tool and nothing else.
 *
 * Every tool also has a one-key shortcut, which is the browser's own
 * contribution: on a phone the rail is the only way to switch tools, but at a
 * keyboard reaching for the mouse to change pen colour is the slow path.
 */
import { useEffect, useState } from 'react';

import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { LIMITS, SHAPE_TEXT_SIZE, type ShapeKind, type ToolType } from '../../lib/contract';
import { Colors, DrawingPalette, StrokeSizes } from '../../lib/theme';

import { Hairline, StepperButton } from '../ui/Button';
import { ColorPickerSheet } from '../ui/ColorPickerSheet';
import { GlassPanel } from '../ui/Glass';
import { Icon, type IconName } from '../ui/Icon';

type ToolKey = 'pencil' | 'eraser' | 'shapes' | 'text' | 'fill';

/**
 * `key` is the keyboard shortcut. They are the initials of the *English* tool
 * names, which is also where the mnemonic survives a language switch: the keys
 * do not move when the labels do.
 */
const TOOLS: { tool: ToolType; icon: IconName; labelKey: ToolKey; key: string }[] = [
  { tool: 'pen', icon: 'pencil', labelKey: 'pencil', key: 'p' },
  { tool: 'eraser', icon: 'eraser', labelKey: 'eraser', key: 'e' },
  { tool: 'shape', icon: 'shapes', labelKey: 'shapes', key: 's' },
  { tool: 'text', icon: 'text', labelKey: 'text', key: 't' },
  { tool: 'fill', icon: 'fill', labelKey: 'fill', key: 'f' },
];

type ShapeKey =
  | 'shapeRectangle'
  | 'shapeEllipse'
  | 'shapeTriangle'
  | 'shapeLine'
  | 'shapeArrow';

const SHAPE_KINDS: { kind: ShapeKind; icon: IconName; labelKey: ShapeKey }[] = [
  { kind: 'rectangle', icon: 'rectangle', labelKey: 'shapeRectangle' },
  { kind: 'ellipse', icon: 'ellipse', labelKey: 'shapeEllipse' },
  { kind: 'triangle', icon: 'triangle', labelKey: 'shapeTriangle' },
  { kind: 'line', icon: 'line', labelKey: 'shapeLine' },
  { kind: 'arrow', icon: 'arrow', labelKey: 'shapeArrow' },
];

export function ToolRail({ compact, landscape }: { compact: boolean; landscape: boolean }) {
  const t = useT();
  const tool = useBoardStore((s) => s.tool);
  const config = useBoardStore((s) => s.config);
  const setTool = useBoardStore((s) => s.setTool);
  const setConfig = useBoardStore((s) => s.setConfig);
  const updateShape = useBoardStore((s) => s.updateShape);
  const selected = useBoardStore((s) => s.selectedShape());
  const canEdit = useBoardStore((s) => s.canEditNow());
  const open = useBoardStore((s) => s.railOpen);
  const setOpen = useBoardStore((s) => s.setRailOpen);

  const [picking, setPicking] = useState(false);

  // Tool shortcuts. Bound on the window so they work wherever focus happens to
  // be on the board — but never while text is being typed.
  useEffect(() => {
    if (!canEdit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const match = TOOLS.find((entry) => entry.key === e.key.toLowerCase());
      if (!match) return;
      e.preventDefault();
      setTool(match.tool);
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit, setTool, setOpen]);

  // A viewer has no tools at all: the design hides them rather than greying
  // them out, so the board is all there is to look at (mobile/docs/04).
  if (!canEdit) return null;

  const toolLabel = t[TOOLS.find((entry) => entry.tool === tool)!.labelKey];
  const showSizes = tool === 'pen' || tool === 'eraser' || tool === 'shape';
  const showShapeKinds = tool === 'shape';
  // A selected shape borrows the text tool's size stepper for its label.
  const showTextOptions = tool === 'text' || selected !== null;
  const fontSize = selected ? (selected.fontSize ?? SHAPE_TEXT_SIZE) : config.fontSize;
  const setFontSize = (next: number) =>
    selected ? updateShape(selected.id, { fontSize: next }) : setConfig({ fontSize: next });

  const button = compact ? 36 : 40;
  const radius = compact ? 12 : 14;

  return (
    <>
      <div
        className="absolute top-0 right-2.5 z-30 flex flex-row-reverse items-start gap-2 sm:right-4"
        // Just under the header: in landscape that is a single row, so the
        // rail moves up to meet it (BoardHeader runs flush to the rail's edge).
        style={{ top: landscape ? (compact ? 72 : 88) : compact ? 112 : 132 }}
      >
        <GlassPanel level="panel" radius={compact ? 17 : 20} className="shadow-panel">
          <div className="flex flex-col gap-1 p-1.5" role="toolbar" aria-label={t.sheetMenu}>
            {TOOLS.map((entry) => (
              <RailButton
                key={entry.tool}
                icon={entry.icon}
                label={t[entry.labelKey]}
                shortcut={entry.key}
                active={tool === entry.tool}
                size={button}
                radius={radius}
                onClick={() => {
                  setTool(entry.tool);
                  setOpen(true);
                }}
              />
            ))}

            <Hairline className="mx-1.5 my-px" />

            {/* The swatch doubles as the options toggle: it is both the current
                colour and the handle for the column that changes it. */}
            <button
              type="button"
              aria-label={t.color}
              aria-expanded={open}
              title={`${t.color} — ${config.color}`}
              onClick={() => setOpen(!open)}
              style={{ width: button, height: button, borderRadius: radius }}
              className="flex items-center justify-center border border-line bg-white/60 transition hover:bg-white"
            >
              <span
                className="rounded-[7px] border-2 border-white"
                style={{
                  width: compact ? 19 : 22,
                  height: compact ? 19 : 22,
                  background: config.color,
                }}
              />
            </button>
          </div>
        </GlassPanel>

        {open ? (
          <GlassPanel level="panel" radius={20} className="shadow-panel">
            <div
              className="no-scrollbar flex w-20 flex-col items-stretch gap-2.5 overflow-y-auto px-2 py-2.5"
              style={{ maxHeight: compact ? '58vh' : '68vh' }}
            >
              <div className="text-center text-[10.5px] font-extrabold tracking-[0.8px] text-text-secondary uppercase">
                {toolLabel}
              </div>

              {showSizes ? (
                <>
                  <div className="flex flex-col items-center gap-1.5">
                    {StrokeSizes.map((value) => {
                      const active = config.width === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-label={`${t.size} ${value}`}
                          aria-pressed={active}
                          onClick={() => setConfig({ width: value })}
                          className="flex h-[26px] w-[52px] items-center justify-center rounded-[9px] border transition"
                          style={{
                            borderColor: active ? 'transparent' : Colors.border,
                            background: active ? Colors.accentSoft : '#FFFFFF',
                          }}
                        >
                          <span
                            className="rounded-full"
                            style={{
                              width: Math.min(20, value + 3),
                              height: Math.min(20, value + 3),
                              background: active ? Colors.accent : '#4A515F',
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <Hairline />
                </>
              ) : null}

              {showShapeKinds ? (
                <>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {SHAPE_KINDS.map((entry) => (
                      <MiniButton
                        key={entry.kind}
                        icon={entry.icon}
                        label={t[entry.labelKey]}
                        active={config.shape === entry.kind}
                        onClick={() => setConfig({ shape: entry.kind })}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    aria-label={t.filled}
                    aria-pressed={config.filled}
                    onClick={() => setConfig({ filled: !config.filled })}
                    className="rounded-[11px] border px-1.5 py-[7px] text-[10px] font-bold transition"
                    style={{
                      borderColor: config.filled ? 'transparent' : Colors.borderStrong,
                      background: config.filled ? Colors.accent : '#FFFFFF',
                      color: config.filled ? '#FFFFFF' : '#4A515F',
                    }}
                  >
                    {t.filled}
                  </button>
                  <Hairline />
                </>
              ) : null}

              {showTextOptions ? (
                <>
                  {/* The size sits above its own +/− pair rather than between
                      them: side by side, the three do not fit the column's
                      width without the "+" sliding off the edge. */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold">{fontSize}px</span>
                    <div className="flex gap-1.5">
                      <StepperButton
                        icon="minus"
                        label={t.smaller}
                        disabled={fontSize <= LIMITS.minFontSize}
                        onClick={() => setFontSize(Math.max(LIMITS.minFontSize, fontSize - 4))}
                      />
                      <StepperButton
                        icon="plus"
                        label={t.bigger}
                        disabled={fontSize >= LIMITS.maxFontSize}
                        onClick={() => setFontSize(Math.min(LIMITS.maxFontSize, fontSize + 4))}
                      />
                    </div>
                  </div>
                  {selected ? null : (
                  <div className="flex justify-center gap-1.5">
                    <MiniButton
                      glyph="B"
                      glyphClass="font-extrabold"
                      label={t.bold}
                      active={config.bold}
                      onClick={() => setConfig({ bold: !config.bold })}
                    />
                    <MiniButton
                      glyph="I"
                      glyphClass="font-semibold italic"
                      label={t.italic}
                      active={config.italic}
                      onClick={() => setConfig({ italic: !config.italic })}
                    />
                  </div>
                  )}
                  <Hairline />
                </>
              ) : null}

              <div className="flex flex-wrap justify-center gap-1.5">
                {DrawingPalette.map((swatch) => {
                  const active = config.color.toUpperCase() === swatch.toUpperCase();
                  return (
                    <button
                      key={swatch}
                      type="button"
                      aria-label={`${t.color} ${swatch}`}
                      aria-pressed={active}
                      title={swatch}
                      onClick={() => setConfig({ color: swatch })}
                      className="h-[26px] w-[26px] rounded-lg border-2 transition hover:scale-110"
                      style={{
                        background: swatch,
                        borderColor: active ? Colors.accent : 'rgba(255,255,255,0.9)',
                      }}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                aria-label={t.custom}
                onClick={() => setPicking(true)}
                className="flex items-center justify-center gap-1.5 rounded-[11px] border border-dashed border-line-dashed px-1 py-1.5 text-[9.5px] font-bold text-text/60 transition hover:bg-white/60"
              >
                <span
                  className="h-4 w-4 rounded border border-line"
                  style={{ background: config.color }}
                />
                {t.custom}
              </button>
            </div>
          </GlassPanel>
        ) : null}
      </div>

      <ColorPickerSheet
        open={picking}
        value={config.color}
        onClose={() => setPicking(false)}
        onPick={(color) => {
          setConfig({ color });
          setPicking(false);
        }}
      />
    </>
  );
}

function RailButton({
  icon,
  label,
  shortcut,
  active,
  size,
  radius,
  onClick,
}: {
  icon: IconName;
  label: string;
  shortcut: string;
  active: boolean;
  size: number;
  radius: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={`${label}  (${shortcut.toUpperCase()})`}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderColor: active ? 'transparent' : Colors.border,
        background: active ? Colors.accent : 'rgba(255,255,255,0.55)',
        color: active ? '#FFFFFF' : Colors.text,
      }}
      className={`flex items-center justify-center border transition ${
        active ? 'shadow-accent' : 'hover:bg-white'
      }`}
    >
      <Icon name={icon} size={22} />
    </button>
  );
}

function MiniButton({
  icon,
  glyph,
  glyphClass = '',
  label,
  active,
  onClick,
}: {
  icon?: IconName;
  glyph?: string;
  glyphClass?: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className="flex h-[30px] w-[34px] items-center justify-center rounded-[9px] border transition"
      style={{
        borderColor: active ? 'transparent' : Colors.borderStrong,
        background: active ? Colors.accent : '#FFFFFF',
        color: active ? '#FFFFFF' : Colors.text,
      }}
    >
      {icon ? (
        <Icon name={icon} size={20} />
      ) : (
        <span className={`text-[13px] ${glyphClass}`}>{glyph}</span>
      )}
    </button>
  );
}
