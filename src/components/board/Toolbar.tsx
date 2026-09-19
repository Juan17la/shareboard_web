/**
 * The toolbar: one horizontal strip at the bottom of the board, Excalidraw
 * style, with every tool — hand, pencil, eraser, each shape kind, text, fill —
 * one click away. The shape kinds are buttons of their own rather than a
 * sub-menu: the old rail needed two clicks and a second column to get to an
 * arrow, and that is the click this layout gives back.
 *
 * What is not a tool (colour, stroke size, fill, font size, bold/italic) lives
 * in an options strip above the bar that only shows the options belonging to
 * the tool in hand. Picking a tool opens it; clicking the tool you already hold
 * toggles it; the colour swatch toggles it too. It closes itself the moment a
 * gesture starts on the canvas (`railOpen` in the store).
 *
 * Every tool also has a one-key shortcut, which is the browser's own
 * contribution: on a phone the bar is the only way to switch tools, but at a
 * keyboard reaching for the mouse to change pen colour is the slow path.
 */
import { useEffect, useState } from 'react';

import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import { LIMITS, SHAPE_TEXT_SIZE, type ShapeKind, type ToolType } from '../../lib/contract';
import { Colors, DrawingPalette, StrokeSizes } from '../../lib/theme';

import { StepperButton } from '../ui/Button';
import { ColorPickerSheet } from '../ui/ColorPickerSheet';
import { GlassPanel } from '../ui/Glass';
import { Icon, type IconName } from '../ui/Icon';

type LabelKey =
  | 'hand'
  | 'pencil'
  | 'eraser'
  | 'shapeRectangle'
  | 'shapeEllipse'
  | 'shapeTriangle'
  | 'shapeLine'
  | 'shapeArrow'
  | 'text'
  | 'fill';

/**
 * `key` is the keyboard shortcut. They are the initials of the *English* tool
 * names, which is also where the mnemonic survives a language switch: the keys
 * do not move when the labels do.
 */
const TOOLS: { tool: ToolType; shape?: ShapeKind; icon: IconName; labelKey: LabelKey; key: string }[] = [
  { tool: 'hand', icon: 'hand', labelKey: 'hand', key: 'h' },
  { tool: 'pen', icon: 'pencil', labelKey: 'pencil', key: 'p' },
  { tool: 'eraser', icon: 'eraser', labelKey: 'eraser', key: 'e' },
  { tool: 'shape', shape: 'rectangle', icon: 'rectangle', labelKey: 'shapeRectangle', key: 'r' },
  { tool: 'shape', shape: 'ellipse', icon: 'ellipse', labelKey: 'shapeEllipse', key: 'o' },
  { tool: 'shape', shape: 'triangle', icon: 'triangle', labelKey: 'shapeTriangle', key: 'y' },
  { tool: 'shape', shape: 'line', icon: 'line', labelKey: 'shapeLine', key: 'l' },
  { tool: 'shape', shape: 'arrow', icon: 'arrow', labelKey: 'shapeArrow', key: 'a' },
  { tool: 'text', icon: 'text', labelKey: 'text', key: 't' },
  { tool: 'fill', icon: 'fill', labelKey: 'fill', key: 'f' },
];

export function Toolbar({ compact }: { compact: boolean }) {
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

  const isActive = (entry: (typeof TOOLS)[number]) =>
    tool === entry.tool && (!entry.shape || config.shape === entry.shape);

  const pick = (entry: (typeof TOOLS)[number]) => {
    if (isActive(entry)) {
      setOpen(!open);
      return;
    }
    setTool(entry.tool);
    if (entry.shape) setConfig({ shape: entry.shape });
    // The hand has nothing to configure; an empty strip would just be noise.
    setOpen(entry.tool !== 'hand');
  };

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
      pick(match);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, tool, config.shape, open]);

  // A viewer has no tools at all: the design hides them rather than greying
  // them out, so the board is all there is to look at (mobile/docs/04).
  if (!canEdit) return null;

  const showSizes = tool === 'pen' || tool === 'eraser' || tool === 'shape';
  const showFill = tool === 'shape' && config.shape !== 'line' && config.shape !== 'arrow';
  // A selected shape borrows the text tool's size stepper for its label.
  const showTextOptions = tool === 'text' || selected !== null;
  const showColor = tool !== 'hand' && tool !== 'eraser';
  const fontSize = selected ? (selected.fontSize ?? SHAPE_TEXT_SIZE) : config.fontSize;
  const setFontSize = (next: number) =>
    selected ? updateShape(selected.id, { fontSize: next }) : setConfig({ fontSize: next });

  const button = compact ? 36 : 40;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2 px-2">
        {open ? (
          <GlassPanel level="panel" radius={16} className="pointer-events-auto max-w-full shadow-panel">
            <div className="no-scrollbar flex max-w-[calc(100vw-16px)] items-center gap-2 overflow-x-auto px-2.5 py-2">
              {showSizes ? (
                <Group>
                  {StrokeSizes.map((value) => {
                    const active = config.width === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${t.size} ${value}`}
                        aria-pressed={active}
                        onClick={() => setConfig({ width: value })}
                        className="flex h-8 w-8 items-center justify-center rounded-[9px] border transition"
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
                </Group>
              ) : null}

              {showFill ? (
                <Group>
                  <button
                    type="button"
                    aria-label={t.filled}
                    aria-pressed={config.filled}
                    onClick={() => setConfig({ filled: !config.filled })}
                    className="h-8 rounded-[9px] border px-2.5 text-[11px] font-bold transition"
                    style={{
                      borderColor: config.filled ? 'transparent' : Colors.borderStrong,
                      background: config.filled ? Colors.accent : '#FFFFFF',
                      color: config.filled ? '#FFFFFF' : '#4A515F',
                    }}
                  >
                    {t.filled}
                  </button>
                </Group>
              ) : null}

              {showTextOptions ? (
                <Group>
                  <StepperButton
                    icon="minus"
                    label={t.smaller}
                    disabled={fontSize <= LIMITS.minFontSize}
                    onClick={() => setFontSize(Math.max(LIMITS.minFontSize, fontSize - 4))}
                  />
                  <span className="w-10 text-center font-mono text-[11px] font-bold">{fontSize}px</span>
                  <StepperButton
                    icon="plus"
                    label={t.bigger}
                    disabled={fontSize >= LIMITS.maxFontSize}
                    onClick={() => setFontSize(Math.min(LIMITS.maxFontSize, fontSize + 4))}
                  />
                  {selected ? null : (
                    <>
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
                    </>
                  )}
                </Group>
              ) : null}

              {showColor ? (
                <Group last>
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
                        className="h-[26px] w-[26px] flex-none rounded-lg border-2 transition hover:scale-110"
                        style={{
                          background: swatch,
                          borderColor: active ? Colors.accent : 'rgba(255,255,255,0.9)',
                        }}
                      />
                    );
                  })}
                  <button
                    type="button"
                    aria-label={t.custom}
                    onClick={() => setPicking(true)}
                    className="flex h-[26px] flex-none items-center gap-1.5 rounded-lg border border-dashed border-line-dashed px-2 text-[10px] font-bold text-text/60 transition hover:bg-white/60"
                  >
                    <span className="h-3.5 w-3.5 rounded border border-line" style={{ background: config.color }} />
                    {t.custom}
                  </button>
                </Group>
              ) : null}
            </div>
          </GlassPanel>
        ) : null}

        <GlassPanel level="panel" radius={compact ? 17 : 20} className="pointer-events-auto max-w-full shadow-panel">
          <div
            className="no-scrollbar flex max-w-[calc(100vw-16px)] items-center gap-1 overflow-x-auto p-1.5"
            role="toolbar"
            aria-label={t.sheetMenu}
          >
            {TOOLS.map((entry) => (
              <ToolButton
                key={entry.labelKey}
                icon={entry.icon}
                label={t[entry.labelKey]}
                shortcut={entry.key}
                active={isActive(entry)}
                size={button}
                onClick={() => pick(entry)}
              />
            ))}

            <span className="mx-1 h-6 w-px flex-none bg-line" />

            {/* The swatch doubles as the options toggle: it is both the current
                colour and the handle for the strip that changes it. */}
            <button
              type="button"
              aria-label={t.color}
              aria-expanded={open}
              title={`${t.color} — ${config.color}`}
              onClick={() => setOpen(!open)}
              style={{ width: button, height: button, borderRadius: compact ? 12 : 14 }}
              className="flex flex-none items-center justify-center border border-line bg-white/60 transition hover:bg-white"
            >
              <span
                className="rounded-[7px] border-2 border-white"
                style={{ width: compact ? 19 : 22, height: compact ? 19 : 22, background: config.color }}
              />
            </button>
          </div>
        </GlassPanel>
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

/** One cluster of options, separated from the next by a hairline. */
function Group({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <>
      <div className="flex flex-none items-center gap-1.5">{children}</div>
      {last ? null : <span className="h-6 w-px flex-none bg-line" />}
    </>
  );
}

function ToolButton({
  icon,
  label,
  shortcut,
  active,
  size,
  onClick,
}: {
  icon: IconName;
  label: string;
  shortcut: string;
  active: boolean;
  size: number;
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
        borderRadius: size < 40 ? 12 : 14,
        borderColor: active ? 'transparent' : 'transparent',
        background: active ? Colors.accent : 'transparent',
        color: active ? '#FFFFFF' : Colors.text,
      }}
      className={`flex flex-none items-center justify-center border transition ${
        active ? 'shadow-accent' : 'hover:bg-white'
      }`}
    >
      <Icon name={icon} size={21} />
    </button>
  );
}

function MiniButton({
  glyph,
  glyphClass = '',
  label,
  active,
  onClick,
}: {
  glyph: string;
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
      className="flex h-8 w-8 items-center justify-center rounded-[9px] border transition"
      style={{
        borderColor: active ? 'transparent' : Colors.borderStrong,
        background: active ? Colors.accent : '#FFFFFF',
        color: active ? '#FFFFFF' : Colors.text,
      }}
    >
      <span className={`text-[13px] ${glyphClass}`}>{glyph}</span>
    </button>
  );
}
