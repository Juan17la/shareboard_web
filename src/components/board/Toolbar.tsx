/**
 * The toolbar: one horizontal strip at the bottom of the board, Excalidraw
 * style, with every tool — cursor, hand, pencil, eraser, each shape kind, text,
 * fill — one click away. On a wide screen the shape kinds are buttons of their
 * own rather than a sub-menu: the old rail needed two clicks and a second
 * column to get to an arrow, and that is the click this layout gives back. On
 * a phone that width is not there, so the six kinds fold into one "shapes"
 * button and the options strip offers the kind.
 *
 * What is not a tool (colour, stroke size, fill, font size, bold/italic) lives
 * in an options strip above the bar that only shows the options belonging to
 * the tool in hand. Picking a tool opens it; clicking the tool you already hold
 * toggles it; the colour swatch toggles it too. It closes itself the moment a
 * gesture starts on the canvas and comes back when one ends on a selection
 * (`railOpen` in the store).
 *
 * Every tool also has a one-key shortcut, which is the browser's own
 * contribution: on a phone the bar is the only way to switch tools, but at a
 * keyboard reaching for the mouse to change pen colour is the slow path.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { useT } from '../../features/i18n';
import { useBoardStore, type ReorderOp } from '../../features/board-store';
import {
  DASHES,
  FONTS,
  LIMITS,
  MARKERS,
  ROUTES,
  SHAPE_TEXT_SIZE,
  isFillable,
  type BoardElement,
  type Dash,
  type Marker,
  type Route,
  type ShapeKind,
  type ToolType,
} from '../../lib/contract';
import { dashIntervals, headsOf, isLineLike, markerPaths, routePath } from '../../lib/geometry';
import { Colors, DrawingPalette, StrokeSizes, fillFor, fillLevelOf, inkFor, type FillLevel } from '../../lib/theme';
import { toast } from '../../lib/toast';
import { useSessionStore } from '../../features/session';
import { useViewport } from '../../hooks/use-viewport';

import { StepperButton } from '../ui/Button';
import { ColorPickerSheet } from '../ui/ColorPickerSheet';
import { GlassPanel } from '../ui/Glass';
import { Icon, type IconName } from '../ui/Icon';
import { FONT_FAMILIES } from './renderer';

type LabelKey =
  | 'hand'
  | 'select'
  | 'pencil'
  | 'eraser'
  | 'shapeRectangle'
  | 'shapeEllipse'
  | 'shapeTriangle'
  | 'shapePolygon'
  | 'shapeLine'
  | 'shapeArrow'
  | 'shapes'
  | 'text'
  | 'fill';

/**
 * `key` is the keyboard shortcut. They are the initials of the *English* tool
 * names, which is also where the mnemonic survives a language switch: the keys
 * do not move when the labels do.
 */
interface ToolEntry {
  tool: ToolType;
  shape?: ShapeKind;
  icon: IconName;
  labelKey: LabelKey;
  key: string;
}

const FONT_LABELS = {
  sans: 'fontSans',
  serif: 'fontSerif',
  mono: 'fontMono',
  hand: 'fontHand',
} as const;

const SHAPES: ToolEntry[] = [
  { tool: 'shape', shape: 'rectangle', icon: 'rectangle', labelKey: 'shapeRectangle', key: 'r' },
  { tool: 'shape', shape: 'ellipse', icon: 'ellipse', labelKey: 'shapeEllipse', key: 'o' },
  { tool: 'shape', shape: 'triangle', icon: 'triangle', labelKey: 'shapeTriangle', key: 'y' },
  { tool: 'shape', shape: 'polygon', icon: 'polygon', labelKey: 'shapePolygon', key: 'g' },
  { tool: 'shape', shape: 'line', icon: 'line', labelKey: 'shapeLine', key: 'l' },
  { tool: 'shape', shape: 'arrow', icon: 'arrow', labelKey: 'shapeArrow', key: 'a' },
];

/** The wide strip: the cursor first, since it is the tool in hand by default. */
const TOOLS: ToolEntry[] = [
  { tool: 'select', icon: 'cursor', labelKey: 'select', key: 'v' },
  { tool: 'hand', icon: 'hand', labelKey: 'hand', key: 'h' },
  { tool: 'pen', icon: 'pencil', labelKey: 'pencil', key: 'p' },
  { tool: 'eraser', icon: 'eraser', labelKey: 'eraser', key: 'e' },
  ...SHAPES,
  { tool: 'text', icon: 'text', labelKey: 'text', key: 't' },
  { tool: 'fill', icon: 'fill', labelKey: 'fill', key: 'f' },
];

/** The phone strip: the six kinds fold into one button (S picks the last kind used). */
const COMPACT_TOOLS: ToolEntry[] = [
  ...TOOLS.slice(0, 4),
  { tool: 'shape', icon: 'shapes', labelKey: 'shapes', key: 's' },
  ...TOOLS.slice(-2),
];

export function Toolbar({ compact }: { compact: boolean }) {
  const t = useT();
  const tool = useBoardStore((s) => s.tool);
  const config = useBoardStore((s) => s.config);
  const pickTool = useBoardStore((s) => s.pickTool);
  const setConfig = useBoardStore((s) => s.setConfig);
  const reorder = useBoardStore((s) => s.reorder);
  const copySelection = useBoardStore((s) => s.copySelection);
  const cutSelection = useBoardStore((s) => s.cutSelection);
  const group = useBoardStore((s) => s.group);
  const ungroup = useBoardStore((s) => s.ungroup);
  const selectedIds = useBoardStore((s) => s.selectedIds);
  const elements = useBoardStore((s) => s.elements);
  const canEdit = useBoardStore((s) => s.canEditNow());
  const open = useBoardStore((s) => s.railOpen);
  const setOpen = useBoardStore((s) => s.setRailOpen);
  const dark = useSessionStore((s) => s.theme === 'dark');
  const narrow = useViewport().width < 360;

  const [picking, setPicking] = useState(false);
  // On a touch screen the tooltips never show, so picking a tool names it for a
  // moment instead (`.sb-touch-only` hides this where a pointer can hover).
  const [caption, setCaption] = useState<string | null>(null);
  const captionTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (captionTimer.current !== null) clearTimeout(captionTimer.current);
    },
    [],
  );
  const announce = (text: string) => {
    setCaption(text);
    if (captionTimer.current !== null) clearTimeout(captionTimer.current);
    captionTimer.current = window.setTimeout(() => setCaption(null), 1600);
  };
  /** Which end's marker grid is open, replacing the strip while it is. */
  // Remembered with the tool it was opened for: a new tool or kind starts
  // without the grid, with no effect needed to close it.
  const [headPick, setHeadPick] = useState<{ end: 'headStart' | 'headEnd'; tool: ToolType; shape: ShapeKind } | null>(null);
  const pickingHead = headPick && headPick.tool === tool && headPick.shape === config.shape ? headPick.end : null;
  const setPickingHead = (end: 'headStart' | 'headEnd' | null) =>
    setHeadPick(end ? { end, tool, shape: config.shape } : null);

  // The selection, when a tool that has one is in hand.
  const selected = useMemo(
    () =>
      tool === 'select' || tool === 'shape'
        ? selectedIds.map((id) => elements[id]).filter((el): el is BoardElement => !!el && !el.deleted)
        : [],
    [tool, selectedIds, elements],
  );
  const has = (test: (el: BoardElement) => boolean) => selected.some(test);
  /** The first selected element's value for an option, so the strip shows what it will change. */
  const first = <T,>(pick: (el: BoardElement) => T | undefined): T | undefined => {
    for (const el of selected) {
      const v = pick(el);
      if (v !== undefined) return v;
    }
    return undefined;
  };

  const isActive = (entry: ToolEntry) =>
    tool === entry.tool && (!entry.shape || config.shape === entry.shape);

  // (Keyboard shortcuts live in `hooks/use-shortcuts.ts`, on the window.)

  // A viewer has no tools at all: the design hides them rather than greying
  // them out, so the board is all there is to look at (mobile/docs/04).
  if (!canEdit) return null;

  // What the strip shows: the options of the tool in hand, or of what is
  // selected. Every button goes through `setConfig`, which restyles the
  // selection as well as setting the next thing drawn.
  const shapeTool = tool === 'shape';
  const lineTool = shapeTool && (config.shape === 'line' || config.shape === 'arrow');
  const selShape = has((el) => el.kind === 'shape');
  const selLine = has((el) => el.kind === 'shape' && isLineLike(el));
  const selBox = has((el) => el.kind === 'shape' && isFillable(el.shape));
  const selText = has((el) => el.kind === 'text');
  const showSizes =
    tool === 'pen' || tool === 'eraser' || shapeTool || has((el) => el.kind === 'stroke') || selShape;
  const showFill = (shapeTool && isFillable(config.shape)) || selBox;
  const showLine = lineTool || selLine;
  const showSides =
    (shapeTool && config.shape === 'polygon') || has((el) => el.kind === 'shape' && el.shape === 'polygon');
  // A selected shape borrows the text tool's size stepper for its label.
  const showTextOptions = tool === 'text' || selText || selShape;
  const showStyle = tool === 'text' || selText;
  const showColor = tool !== 'hand' && tool !== 'eraser' && (tool !== 'select' || selected.length > 0);
  const showOrder = tool === 'select' && selected.length > 0;
  // The cursor with nothing selected, and the hand, have nothing to offer: an
  // empty strip is noise, whatever asked for it.
  const hasOptions = showSizes || showFill || showLine || showTextOptions || showOrder || showColor;
  // A selected shape can change kind within its family: box to box, line to
  // arrow. With the folded shapes button in hand, the strip is where the kind
  // is chosen at all.
  const kinds: ShapeKind[] = selLine
    ? ['line', 'arrow']
    : selShape
      ? ['rectangle', 'ellipse', 'triangle', 'polygon']
      : compact && shapeTool
        ? SHAPES.map((e) => e.shape!)
        : [];
  const pickKind = (kind: ShapeKind) => (selected.length ? setConfig({ shape: kind }) : pickTool('shape', kind));
  // Group only when there is more than one thing to join: loose elements or separate groups.
  const showGroup = new Set(selected.map((el) => el.group ?? el.id)).size > 1;

  const line = (el: BoardElement) => (el.kind === 'shape' && isLineLike(el) ? el : undefined);
  const cur = {
    width:
      first((el) => (el.kind === 'stroke' ? el.width : el.kind === 'shape' ? el.strokeWidth : undefined)) ??
      config.width,
    color:
      first((el) => (el.kind === 'shape' ? el.stroke : el.kind === 'image' ? undefined : el.color)) ??
      config.color,
    fill:
      first((el) => (el.kind === 'shape' && isFillable(el.shape) ? fillLevelOf(el.fill) : undefined)) ??
      config.fill,
    fontSize:
      first((el) =>
        el.kind === 'text' ? el.fontSize : el.kind === 'shape' ? (el.fontSize ?? SHAPE_TEXT_SIZE) : undefined,
      ) ?? config.fontSize,
    font:
      first((el) => (el.kind === 'text' || el.kind === 'shape' ? (el.font ?? 'sans') : undefined)) ??
      config.font,
    bold: first((el) => (el.kind === 'text' ? !!el.bold : undefined)) ?? config.bold,
    italic: first((el) => (el.kind === 'text' ? !!el.italic : undefined)) ?? config.italic,
    headStart: first((el) => (line(el) ? headsOf(line(el)!)[0] : undefined)) ?? config.headStart,
    headEnd: first((el) => (line(el) ? headsOf(line(el)!)[1] : undefined)) ?? config.headEnd,
    route: first((el) => line(el)?.route ?? (line(el) ? 'straight' : undefined)) ?? config.route,
    shape: first((el) => (el.kind === 'shape' ? el.shape : undefined)) ?? config.shape,
    sides: first((el) => (el.kind === 'shape' && el.shape === 'polygon' ? el.sides : undefined)) ?? config.sides,
    dash: first((el) => line(el)?.dash ?? (line(el) ? 'solid' : undefined)) ?? config.dash,
  };
  const fontSize = cur.fontSize;
  // The board ink flips on the dark theme (`inkFor`); the swatches follow it.
  const ink = inkFor(cur.color, dark);
  const setFontSize = (next: number) => setConfig({ fontSize: next });
  const fillLevels: { level: FillLevel; labelKey: 'fillNone' | 'fillLow' | 'fillMedium' | 'fillFull' }[] = [
    { level: 'none', labelKey: 'fillNone' },
    { level: 'low', labelKey: 'fillLow' },
    { level: 'medium', labelKey: 'fillMedium' },
    { level: 'full', labelKey: 'fillFull' },
  ];
  const routeLabel: Record<Route, 'routeStraight' | 'routeCurved' | 'routeElbow'> = {
    straight: 'routeStraight',
    curved: 'routeCurved',
    elbow: 'routeElbow',
  };
  const dashLabel: Record<Dash, 'dashSolid' | 'dashDashed' | 'dashDotted'> = {
    solid: 'dashSolid',
    dashed: 'dashDashed',
    dotted: 'dashDotted',
  };
  const orderOps: { op: ReorderOp; icon: IconName; labelKey: 'toBack' | 'backward' | 'forward' | 'toFront' }[] = [
    { op: 'back', icon: 'to-back', labelKey: 'toBack' },
    { op: 'backward', icon: 'backward', labelKey: 'backward' },
    { op: 'forward', icon: 'forward', labelKey: 'forward' },
    { op: 'front', icon: 'to-front', labelKey: 'toFront' },
  ];

  // 320px phones: eight 38px buttons plus their gaps do not fit, so the strip tightens.
  const button = narrow ? 34 : compact ? 38 : 40;
  const tools = compact ? COMPACT_TOOLS : TOOLS;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2 px-2">
        {caption ? (
          <div
            aria-hidden="true"
            className="sb-touch-only rounded-full bg-text px-3 py-1 text-[0.7812rem] font-bold text-background shadow-panel"
          >
            {caption}
          </div>
        ) : null}
        {open && hasOptions ? (
          <GlassPanel level="panel" radius={16} overflow="visible" className="pointer-events-auto max-w-full shadow-panel">
            {pickingHead ? (
              <div className="flex flex-col gap-1.5 px-2.5 py-2">
                {(
                  [
                    ['markersDefault', MARKERS.default],
                    ['markersOther', MARKERS.other],
                    ['markersCardinality', MARKERS.cardinality],
                  ] as const
                ).map(([labelKey, kinds]) => (
                  <div key={labelKey} className="flex items-center gap-1.5">
                    <span className="w-[76px] text-[0.75rem] font-bold text-text/60">{t[labelKey]}</span>
                    {kinds.map((kind) => (
                      <MiniButton
                        key={kind}
                        label={kind}
                        active={cur[pickingHead] === kind}
                        onClick={() => {
                          setConfig({ [pickingHead]: kind });
                          setPickingHead(null);
                        }}
                      >
                        <MarkerIcon kind={kind} end={pickingHead === 'headEnd'} />
                      </MiniButton>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
            <div className="sb-strip flex max-w-[calc(100vw-16px)] flex-wrap items-center justify-center gap-2 px-2.5 py-2">
              {showOrder ? <Caption>{t.styleGroup}</Caption> : null}
              {showSizes ? (
                <Group>
                  {StrokeSizes.map((value) => {
                    const active = cur.width === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${t.size} ${value}`}
                        aria-pressed={active}
                        data-tip={`${t.size} ${value}`}
                        onClick={() => setConfig({ width: value })}
                        className="touch-36 flex h-8 w-8 items-center justify-center rounded-[9px] border transition"
                        style={{
                          borderColor: active ? 'transparent' : Colors.border,
                          background: active ? Colors.accentSoft : Colors.surface,
                        }}
                      >
                        <span
                          className="rounded-full"
                          style={{
                            width: Math.min(20, value + 3),
                            height: Math.min(20, value + 3),
                            background: active ? Colors.accent : Colors.textSecondary,
                          }}
                        />
                      </button>
                    );
                  })}
                </Group>
              ) : null}

              {kinds.length ? (
                <Group>
                  {kinds.map((kind) => (
                    <MiniButton
                      key={kind}
                      label={t[SHAPES.find((e) => e.shape === kind)!.labelKey]}
                      active={cur.shape === kind}
                      onClick={() => pickKind(kind)}
                    >
                      <Icon name={kind} size={18} />
                    </MiniButton>
                  ))}
                </Group>
              ) : null}

              {showSides ? (
                <Group>
                  <StepperButton
                    icon="minus"
                    label={t.fewerSides}
                    disabled={cur.sides <= LIMITS.minSides}
                    onClick={() => setConfig({ sides: cur.sides - 1 })}
                  />
                  <span className="w-12 text-center font-mono text-[0.75rem] font-bold">
                    {cur.sides} {t.sides}
                  </span>
                  <StepperButton
                    icon="plus"
                    label={t.moreSides}
                    disabled={cur.sides >= LIMITS.maxSides}
                    onClick={() => setConfig({ sides: cur.sides + 1 })}
                  />
                </Group>
              ) : null}

              {showFill ? (
                <Group>
                  {fillLevels.map(({ level, labelKey }) => (
                    <MiniButton
                      key={level}
                      label={t[labelKey]}
                      active={cur.fill === level}
                      onClick={() => setConfig({ fill: level })}
                    >
                      {/* The swatch is the fill itself: the colour at that alpha, outlined. */}
                      <span
                        className="block h-4 w-4 rounded border-[1.5px]"
                        style={{
                          borderColor: cur.fill === level ? '#FFFFFF' : ink,
                          background: fillFor(cur.fill === level ? '#FFFFFF' : ink, level) ?? 'transparent',
                        }}
                      />
                    </MiniButton>
                  ))}
                </Group>
              ) : null}

              {showLine ? (
                <>
                  <Group>
                    {(['headStart', 'headEnd'] as const).map((end) => (
                      <MiniButton key={end} label={t[end]} active={false} onClick={() => setPickingHead(end)}>
                        <MarkerIcon kind={cur[end]} end={end === 'headEnd'} />
                      </MiniButton>
                    ))}
                  </Group>
                  <Group>
                    {ROUTES.map((route) => (
                      <MiniButton
                        key={route}
                        label={t[routeLabel[route]]}
                        active={cur.route === route}
                        onClick={() => setConfig({ route })}
                      >
                        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d={routePath({ x: 4, y: 19 }, { x: 20, y: 5 }, route)} />
                        </svg>
                      </MiniButton>
                    ))}
                  </Group>
                  <Group>
                    {DASHES.map((dash) => (
                      <MiniButton
                        key={dash}
                        label={t[dashLabel[dash]]}
                        active={cur.dash === dash}
                        onClick={() => setConfig({ dash })}
                      >
                        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                          <path d="M3 12H21" strokeDasharray={dashIntervals(dash, 2.2)?.join(' ')} />
                        </svg>
                      </MiniButton>
                    ))}
                  </Group>
                </>
              ) : null}

              {showTextOptions ? (
                <Group>
                  <StepperButton
                    icon="minus"
                    label={t.smaller}
                    disabled={fontSize <= LIMITS.minFontSize}
                    onClick={() => setFontSize(Math.max(LIMITS.minFontSize, fontSize - 4))}
                  />
                  <span className="w-10 text-center font-mono text-[0.75rem] font-bold">{fontSize}px</span>
                  <StepperButton
                    icon="plus"
                    label={t.bigger}
                    disabled={fontSize >= LIMITS.maxFontSize}
                    onClick={() => setFontSize(Math.min(LIMITS.maxFontSize, fontSize + 4))}
                  />
                  {FONTS.map((font) => (
                    <MiniButton
                      key={font}
                      label={t[FONT_LABELS[font]]}
                      active={cur.font === font}
                      onClick={() => setConfig({ font })}
                    >
                      <span className="text-[0.875rem]" style={{ fontFamily: FONT_FAMILIES[font] }}>
                        Aa
                      </span>
                    </MiniButton>
                  ))}
                  {showStyle ? (
                    <>
                      <MiniButton
                        glyph="B"
                        glyphClass="font-extrabold"
                        label={t.bold}
                        active={cur.bold}
                        onClick={() => setConfig({ bold: !cur.bold })}
                      />
                      <MiniButton
                        glyph="I"
                        glyphClass="font-semibold italic"
                        label={t.italic}
                        active={cur.italic}
                        onClick={() => setConfig({ italic: !cur.italic })}
                      />
                    </>
                  ) : null}
                </Group>
              ) : null}

              {showColor ? (
                <Group last>
                  {DrawingPalette.map((swatch) => {
                    const active = cur.color.toUpperCase() === swatch.toUpperCase();
                    return (
                      <button
                        key={swatch}
                        type="button"
                        aria-label={`${t.color} ${swatch}`}
                        aria-pressed={active}
                        data-tip={swatch}
                        onClick={() => setConfig({ color: swatch })}
                        className="touch-36 h-[26px] w-[26px] flex-none rounded-lg border-2 transition hover:scale-110"
                        style={{
                          background: inkFor(swatch, dark),
                          borderColor: active ? Colors.accent : Colors.background,
                        }}
                      />
                    );
                  })}
                  <button
                    type="button"
                    aria-label={t.custom}
                    data-tip={t.custom}
                    onClick={() => setPicking(true)}
                    className="touch-36 flex h-[26px] flex-none items-center gap-1.5 rounded-lg border border-dashed border-line-dashed px-2 text-[0.75rem] font-bold text-text-secondary transition hover:bg-surface-selected"
                  >
                    <span className="h-3.5 w-3.5 rounded border border-line" style={{ background: ink }} />
                    {t.custom}
                  </button>
                </Group>
              ) : null}

              {showOrder ? <Caption>{t.arrangeGroup}</Caption> : null}

              {showOrder ? (
                <Group>
                  <MiniButton
                    label={t.copy}
                    active={false}
                    onClick={() => {
                      copySelection();
                      toast(t.toastCopiedSelection);
                    }}
                  >
                    <Icon name="copy" size={18} />
                  </MiniButton>
                  <MiniButton
                    label={t.cut}
                    active={false}
                    onClick={() => {
                      cutSelection();
                      announce(t.cut);
                    }}
                  >
                    <Icon name="cut" size={18} />
                  </MiniButton>
                </Group>
              ) : null}

              {showOrder ? (
                <Group last>
                  {orderOps.map(({ op, icon, labelKey }) => (
                    <MiniButton
                      key={op}
                      label={t[labelKey]}
                      active={false}
                      onClick={() => {
                        reorder(op);
                        announce(t[labelKey]);
                      }}
                    >
                      <Icon name={icon} size={18} />
                    </MiniButton>
                  ))}
                  {showGroup ? (
                    <MiniButton label={t.group} active={false} onClick={group}>
                      <Icon name="group" size={18} />
                    </MiniButton>
                  ) : null}
                  {has((el) => !!el.group) ? (
                    <MiniButton label={t.ungroup} active={false} onClick={ungroup}>
                      <Icon name="ungroup" size={18} />
                    </MiniButton>
                  ) : null}
                </Group>
              ) : null}
            </div>
            )}
          </GlassPanel>
        ) : null}

        <GlassPanel level="panel" radius={compact ? 17 : 20} overflow="visible" className="pointer-events-auto max-w-full shadow-panel">
          <div
            className={`flex max-w-[calc(100vw-16px)] flex-wrap items-center justify-center p-1.5 ${narrow ? 'gap-0' : 'gap-1'}`}
            role="toolbar"
            aria-label={t.tools}
          >
            {tools.map((entry) => (
              <ToolButton
                key={entry.labelKey}
                icon={entry.icon}
                label={t[entry.labelKey]}
                shortcut={entry.key}
                active={isActive(entry)}
                size={button}
                onClick={() => {
                  pickTool(entry.tool, entry.shape);
                  announce(t[entry.labelKey]);
                }}
              />
            ))}

            <span className="mx-1 h-6 w-px flex-none bg-line" />

            {/* The swatch doubles as the options toggle: it is both the current
                colour and the handle for the strip that changes it. */}
            <button
              type="button"
              aria-label={t.color}
              aria-expanded={open}
              data-tip={`${t.color} · ${config.color}`}
              onClick={() => {
                setOpen(!open);
                announce(t.color);
              }}
              style={{ width: button, height: button, borderRadius: compact ? 12 : 14 }}
              className="flex flex-none items-center justify-center border border-line bg-glass-solid transition hover:bg-surface-selected"
            >
              <span
                className="rounded-[7px] border-2 border-white"
                style={{ width: 22, height: 22, background: inkFor(config.color, dark) }}
              />
            </button>
          </div>
        </GlassPanel>
      </div>

      <ColorPickerSheet
        open={picking}
        value={cur.color}
        onClose={() => setPicking(false)}
        onPick={(color) => {
          setConfig({ color });
          setPicking(false);
        }}
      />
    </>
  );
}

/** A one-line heading for a row of the options strip (only shown with a selection). */
function Caption({ children }: { children: React.ReactNode }) {
  return (
    <span className="basis-full text-[0.75rem] font-extrabold tracking-[0.6px] text-text-secondary uppercase">
      {children}
    </span>
  );
}

/** One cluster of options, separated from the next by a hairline. */
function Group({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <>
      {/* Wraps inside itself when it is wider than the screen (the text group is ~340px). */}
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">{children}</div>
      {/* Hairlines only where the groups share a row: wrapped, they would dangle at a row's end. */}
      {last ? null : <span className="hidden h-6 w-px flex-none bg-line sm:block" />}
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
      data-tip={`${label} · ${shortcut.toUpperCase()}`}
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
        active ? 'shadow-accent' : 'hover:bg-surface-selected'
      }`}
    >
      <Icon name={icon} size={21} />
    </button>
  );
}

/** A marker as the strip shows it: on the end of a short line, pointing out of it. */
function MarkerIcon({ kind, end }: { kind: Marker; end: boolean }) {
  const tip = end ? { x: 21, y: 12 } : { x: 3, y: 12 };
  const parts = markerPaths(kind, tip, end ? 0 : Math.PI, 7);
  return (
    // "None" is greyed: a bare line reads as nothing on purpose, not as a missing icon.
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" opacity={kind === 'none' ? 0.35 : 1} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12H21" />
      {parts.map((part, i) => (
        <path key={i} d={part.d} fill={part.fill === 'solid' ? 'currentColor' : part.fill === 'hollow' ? 'var(--color-background)' : 'none'} />
      ))}
    </svg>
  );
}

function MiniButton({
  glyph,
  glyphClass = '',
  label,
  active,
  onClick,
  children,
}: {
  glyph?: string;
  glyphClass?: string;
  label: string;
  active: boolean;
  onClick: () => void;
  /** Drawn instead of the glyph. */
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-tip={label}
      onClick={onClick}
      className="touch-36 flex h-8 w-8 items-center justify-center rounded-[9px] border transition"
      style={{
        borderColor: active ? 'transparent' : Colors.borderStrong,
        background: active ? Colors.accent : Colors.surface,
        color: active ? '#FFFFFF' : Colors.text,
      }}
    >
      {children ?? <span className={`text-[0.8125rem] ${glyphClass}`}>{glyph}</span>}
    </button>
  );
}
