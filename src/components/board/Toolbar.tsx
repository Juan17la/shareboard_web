/**
 * The toolbar: Excalidraw style, with every tool — cursor, hand, pencil, eraser, each shape kind, text,
 * fill — one click away. On a wide screen the shape kinds are buttons of their
 * own rather than a sub-menu: the old rail needed two clicks and a second
 * column to get to an arrow, and that is the click this layout gives back. On
 * a phone that width is not there, so the six kinds fold into one "shapes"
 * button and the options strip offers the kind.
 *
 * What is not a tool (colour, stroke size, fill, font size, bold/italic) lives
 * in an options strip above the bar that only shows the options belonging to
 * the tool in hand. Picking a tool opens it; clicking the tool you already hold
 * toggles it. It closes itself the moment a
 * gesture starts on the canvas and comes back when one ends on a selection
 * (`railOpen` in the store).
 *
 * On a wide screen the tools are a rail down the left edge with the options panel
 * beside it, both centred vertically so they stay clear of the header and the
 * zoom chip; under `Layout.compactBreakpoint` both fold back into the
 * strips at the bottom, where a phone's thumb is.
 *
 * Every tool also has a one-key shortcut, which is the browser's own
 * contribution: on a phone the bar is the only way to switch tools, but at a
 * keyboard reaching for the mouse to change pen colour is the slow path.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useT } from '../../features/i18n';
import { useBoardStore } from '../../features/board-store';
import {
  DASHES,
  FONTS,
  LIMITS,
  MARKERS,
  ROUTES,
  SHAPE_TEXT_SIZE,
  TEXT_SIZES,
  nearestTextSize,
  isFillable,
  type BoardElement,
  type Dash,
  type Marker,
  type Route,
  type ShapeKind,
  type ToolType,
} from '../../lib/contract';
import { primaryOptions, subjectsOf, type OptionId } from '../../lib/tool-options';
import { canRound, dashIntervals, headsOf, isLineLike, markerPaths, routePath } from '../../lib/geometry';
import { Css, StrokeSizes, fillColorOf, fillOpacityOf, fillWith, inkFor } from '../../lib/theme';
import { useSessionStore } from '../../features/session';
import { useViewport } from '../../hooks/use-viewport';

import { StepperButton } from '../ui/Button';
import { ColorPickerSheet } from '../ui/ColorPickerSheet';
import { ColorSwatch } from '../ui/ColorSwatch';
import { FillSheet } from './FillSheet';
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
  const selectedIds = useBoardStore((s) => s.selectedIds);
  const elements = useBoardStore((s) => s.elements);
  const canEdit = useBoardStore((s) => s.canEditNow());
  const open = useBoardStore((s) => s.railOpen);
  const dark = useSessionStore((s) => s.theme === 'dark');
  const narrow = useViewport().width < 360;

  const [picking, setPicking] = useState(false);
  const [filling, setFilling] = useState(false);
  // "More" is remembered across visits (a per-browser nicety: it renders fine without storage).
  const [moreOpen, setMoreOpen] = useState(() => {
    try {
      return localStorage.getItem('sb-more-options') === '1';
    } catch {
      return false;
    }
  });
  const toggleMore = () => {
    setMoreOpen(!moreOpen);
    try {
      localStorage.setItem('sb-more-options', moreOpen ? '0' : '1');
    } catch {
      // not remembered
    }
  };
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
  const showDash = shapeTool || selShape;
  const showAlign = selText || selShape;
  const showCorners = (shapeTool && canRound(config.shape)) || has((el) => el.kind === 'shape' && canRound(el.shape));
  const showSides =
    (shapeTool && config.shape === 'polygon') || has((el) => el.kind === 'shape' && el.shape === 'polygon');
  // A selected shape borrows the text tool's size stepper for its label.
  const showTextOptions = tool === 'text' || selText || selShape;
  const showStyle = tool === 'text' || selText;
  const showColor = tool !== 'hand' && tool !== 'eraser' && (tool !== 'select' || selected.length > 0);
  // The cursor with nothing selected, and the hand, have nothing to offer: an
  // empty strip is noise, whatever asked for it.
  // Which of them are up front for what is in hand; the rest sit behind "More".
  const primary = primaryOptions(subjectsOf(tool, config.shape, selected));
  const at = (id: OptionId, slot: 'main' | 'more') => (primary.has(id) ? 'main' : 'more') === slot;
  const available: Record<OptionId, boolean> = {
    kinds: false, // the kinds are up front for every shape, never behind More
    color: showColor,
    size: showSizes,
    fill: showFill,
    dash: showDash,
    opacity: showDash,
    corners: showCorners,
    sides: showSides,
    ends: showLine,
    route: showLine,
    text: showTextOptions,
    align: showAlign,
  };
  const hasMore = (Object.keys(available) as OptionId[]).some((id) => available[id] && !primary.has(id));
  const hasOptions = showSizes || showFill || showLine || showDash || showTextOptions || showColor;
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

  const line = (el: BoardElement) => (el.kind === 'shape' && isLineLike(el) ? el : undefined);
  const cur = {
    width:
      first((el) => (el.kind === 'stroke' ? el.width : el.kind === 'shape' ? el.strokeWidth : undefined)) ??
      config.width,
    color:
      first((el) => (el.kind === 'shape' ? el.stroke : el.kind === 'image' ? undefined : el.color)) ??
      config.color,
    // What the fill chip shows: the first selected shape's own fill, else the next shape's.
    fillOpacity:
      first((el) => (el.kind === 'shape' && isFillable(el.shape) ? fillOpacityOf(el.fill) : undefined)) ??
      config.fillOpacity,
    fillColor:
      first((el) => (el.kind === 'shape' && isFillable(el.shape) ? (fillColorOf(el.fill) ?? undefined) : undefined)) ??
      config.fillColor,
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
    dash: first((el) => (el.kind === 'shape' ? (el.dash ?? 'solid') : undefined)) ?? config.dash,
    align:
      first((el) => (el.kind === 'text' ? (el.align ?? 'left') : el.kind === 'shape' ? (el.align ?? 'center') : undefined)) ??
      config.align,
    valign: first((el) => (el.kind === 'shape' ? (el.valign ?? 'middle') : undefined)) ?? config.valign,
    rounded: first((el) => (el.kind === 'shape' && canRound(el.shape) ? !!el.rounded : undefined)) ?? config.rounded,
    opacity: first((el) => (el.kind === 'shape' ? Math.round((el.opacity ?? 1) * 100) : undefined)) ?? config.opacity,
  };
  const fontSize = cur.fontSize;
  // The board ink flips on the dark theme (`inkFor`); the swatches follow it.
  const ink = inkFor(cur.color, dark);
  const fillInk = inkFor(cur.fillColor ?? cur.color, dark);
  const setFontSize = (next: number) => setConfig({ fontSize: next });
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

  // 320px phones: eight 38px buttons plus their gaps do not fit, so the strip tightens.
  const button = narrow ? 34 : compact ? 38 : 40;
  const tools = compact ? COMPACT_TOOLS : TOOLS;

  const captionEl = caption ? (
    <div
      aria-hidden="true"
      className="sb-touch-only rounded-full bg-text px-3 py-1 text-[0.7812rem] font-bold text-background shadow-panel"
    >
      {caption}
    </div>
  ) : null;
  /** The strip's groups for one slot: up front (`main`), or behind More. */
  const groups = (slot: 'main' | 'more') => (
    <>
              {showSizes && at('size', slot) ? (
                <Group title={t.size}>
                  <WidthSlider value={cur.width} label={t.size} onChange={(width) => setConfig({ width })} />
                </Group>
              ) : null}

              {kinds.length && at('kinds', slot) ? (
                <Group title={t.secShape}>
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

              {showSides && at('sides', slot) ? (
                <Group title={t.sides}>
                  <StepperButton
                    icon="minus"
                    label={t.fewerSides}
                    disabled={cur.sides <= LIMITS.minSides}
                    onClick={() => setConfig({ sides: cur.sides - 1 })}
                  />
                  <span
                    className="w-6 text-center font-mono text-[0.75rem] font-bold"
                    aria-label={`${cur.sides} ${t.sides}`}
                  >
                    {cur.sides}
                  </span>
                  <StepperButton
                    icon="plus"
                    label={t.moreSides}
                    disabled={cur.sides >= LIMITS.maxSides}
                    onClick={() => setConfig({ sides: cur.sides + 1 })}
                  />
                </Group>
              ) : null}

              {showFill && at('fill', slot) ? (
                <Group title={t.fillColor}>
                  <ColorSwatch
                    label={`${t.fillColor} ${cur.fillOpacity}%`}
                    caption={`${t.fillColor} ${cur.fillOpacity}%`}
                    color={fillWith(fillInk, cur.fillOpacity) ?? 'transparent'}
                    active={filling}
                    onClick={() => setFilling(true)}
                  />
                  <MiniButton label={t.noFill} active={cur.fillOpacity === 0} onClick={() => setConfig({ fillOpacity: 0 })}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                      <rect x="4" y="4" width="16" height="16" rx="3" />
                      <path d="M4 20L20 4" />
                    </svg>
                  </MiniButton>
                </Group>
              ) : null}

              {showDash && at('dash', slot) ? (
                <Group title={t.secStroke}>
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
              ) : null}

              {showDash && at('opacity', slot) ? (
                <Group title={t.secOpacity}>
                  {OPACITIES.map((pct) => (
                    <MiniButton key={pct} label={`${t.secOpacity} ${pct}%`} active={cur.opacity === pct} onClick={() => setConfig({ opacity: pct })}>
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="8" fillOpacity={pct / 100} />
                      </svg>
                    </MiniButton>
                  ))}
                </Group>
              ) : null}

              {showCorners && at('corners', slot) ? (
                <Group title={t.secCorners}>
                  {([false, true] as const).map((rounded) => (
                    <MiniButton
                      key={String(rounded)}
                      label={rounded ? t.cornerRounded : t.cornerSharp}
                      active={cur.rounded === rounded}
                      onClick={() => setConfig({ rounded })}
                    >
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                        <rect x="4" y="4" width="16" height="16" rx={rounded ? 6 : 0} />
                      </svg>
                    </MiniButton>
                  ))}
                </Group>
              ) : null}

              {showLine && at('ends', slot) ? (
                <Group title={t.secEnds}>
                  {(['headStart', 'headEnd'] as const).map((end) => (
                    <MiniButton key={end} label={t[end]} active={false} onClick={() => setPickingHead(end)}>
                      <MarkerIcon kind={cur[end]} end={end === 'headEnd'} />
                    </MiniButton>
                  ))}
                </Group>
              ) : null}

              {showLine && at('route', slot) ? (
                <Group title={t.secRoute}>
                  {ROUTES.map((route) => (
                    <MiniButton
                      key={route}
                      label={t[routeLabel[route]]}
                      active={cur.route === route}
                      onClick={() => setConfig({ route })}
                    >
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d={routePath({ from: { x: 4, y: 19 }, to: { x: 20, y: 5 }, route })} />
                      </svg>
                    </MiniButton>
                  ))}
                </Group>
              ) : null}

              {showTextOptions && at('text', slot) ? (
                <>
                  <Group title={t.secTextSize}>
                  {TEXT_SIZES.map((size) => (
                    <MiniButton
                      key={size.key}
                      glyph={size.glyph}
                      glyphClass="font-bold"
                      label={t[SIZE_LABELS[size.key]]}
                      active={nearestTextSize(fontSize).key === size.key}
                      wide
                      onClick={() => setFontSize(size.px)}
                    />
                  ))}
                  </Group>
                  <Group title={t.secFont}>
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
                  </Group>
                  {showStyle ? (
                    <Group title={t.secStyle}>
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
                    </Group>
                  ) : null}
                </>
              ) : null}

                {showAlign && at('align', slot) ? (
                  <Group title={t.secAlign}>
                    {H_ALIGNS.map((align) => (
                      <MiniButton key={align} label={t[H_ALIGN_LABEL[align]]} active={cur.align === align} onClick={() => setConfig({ align })}>
                        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                          <path d={H_ALIGN_PATH[align]} />
                        </svg>
                      </MiniButton>
                    ))}
                    {selShape ? (
                      <>
                        {V_ALIGNS.map((valign) => (
                          <MiniButton key={valign} label={t[V_ALIGN_LABEL[valign]]} active={cur.valign === valign} onClick={() => setConfig({ valign })}>
                            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                              <rect x="4" y="4" width="16" height="16" rx="2" />
                              <path d={V_ALIGN_PATH[valign]} />
                            </svg>
                          </MiniButton>
                        ))}
                        <MiniButton
                          label={t.alignCentered}
                          active={cur.align === 'center' && cur.valign === 'middle'}
                          onClick={() => setConfig({ align: 'center', valign: 'middle' })}
                        >
                          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                            <circle cx="12" cy="12" r="2.2" fill="currentColor" />
                          </svg>
                        </MiniButton>
                      </>
                    ) : null}
                  </Group>
                ) : null}

              {showColor && at('color', slot) ? (
                <Group title={showFill ? t.strokeColor : t.color}>
                  <ColorSwatch
                    label={`${t.color} ${cur.color}`}
                    color={ink}
                    active={picking}
                    onClick={() => setPicking(true)}
                  />
                </Group>
              ) : null}
    </>
  );
  const optionsEl = (
    <>
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
            <div className={`sb-strip flex ${compact ? 'max-w-[min(calc(100vw-16px),30rem)] flex-wrap items-center justify-center' : 'max-h-[calc(100vh-14rem)] w-fit flex-col items-stretch divide-y divide-line overflow-y-auto'} gap-3 px-3 py-2.5`}>
              {groups('main')}
              {hasMore ? (
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  onClick={() => toggleMore()}
                  className="flex cursor-pointer items-center justify-center rounded-md px-2 py-1 text-[0.6875rem] font-bold text-text-secondary transition hover:bg-surface-selected hover:text-text"
                >
                  {moreOpen ? t.optionsLess : t.optionsMore}
                </button>
              ) : null}
              {hasMore && moreOpen ? groups('more') : null}
            </div>
            )}
          </GlassPanel>
        ) : null}
    </>
  );
  const railEl = (
        <GlassPanel level="panel" radius={compact ? 17 : 20} overflow="visible" className="pointer-events-auto max-w-full shadow-panel">
          <div
            className={`flex items-center p-1.5 ${compact ? 'max-w-[calc(100vw-16px)] flex-wrap justify-center' : 'max-h-[calc(100vh-15rem)] flex-col flex-wrap justify-center'} ${narrow ? 'gap-0' : 'gap-1'}`}
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
          </div>
        </GlassPanel>
  );

  return (
    <Vertical.Provider value={!compact}>
      {compact ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2 px-2">
          {captionEl}
          {optionsEl}
          {railEl}
        </div>
      ) : (
        <>
          <div className="pointer-events-none absolute top-1/2 left-4 z-30 flex -translate-y-1/2 items-center gap-2">
            {railEl}
            {optionsEl}
          </div>
          {captionEl ? <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center">{captionEl}</div> : null}
        </>
      )}

      <FillSheet
        open={filling}
        color={cur.fillColor ?? cur.color}
        custom={cur.fillColor !== null && cur.fillColor.toUpperCase() !== cur.color.slice(0, 7).toUpperCase()}
        opacity={cur.fillOpacity}
        onColor={(fillColor) => setConfig({ fillColor, fillOpacity: cur.fillOpacity || 100 })}
        onOpacity={(fillOpacity) => setConfig({ fillOpacity })}
        onClose={() => setFilling(false)}
      />
      <ColorPickerSheet
        open={picking}
        value={cur.color}
        onClose={() => setPicking(false)}
        onPick={(color) => {
          setConfig({ color });
          setPicking(false);
        }}
      />
    </Vertical.Provider>
  );
}

/** Whether the strips are the side columns (wide screens) rather than the bottom rows. */
const Vertical = createContext(false);

/** One cluster of options, with a small subtitle saying what it is; the panel's `divide-y` separates them. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const vertical = useContext(Vertical);
  return (
    <div className={`flex min-w-0 max-w-full flex-col gap-1.5 ${vertical ? 'py-2.5 first:pt-0 last:pb-0' : ''}`}>
      <span className="text-[0.625rem] leading-none font-extrabold tracking-[0.8px] text-text-secondary uppercase">
        {title}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

/**
 * Stroke width as a slider with one stop per size: native range input snapped to
 * the four widths, with a dot under each stop drawn at that width.
 */
/** Drawn on a 24px grid: text lines against the left, middle or right; a bar at the top, middle or bottom of a frame. */
const H_ALIGN_PATH = { left: 'M4 6h16M4 12h10M4 18h14', center: 'M4 6h16M7 12h10M5 18h14', right: 'M4 6h16M10 12h10M6 18h14' } as const;
const V_ALIGN_PATH = { top: 'M8 8h8', middle: 'M8 12h8', bottom: 'M8 16h8' } as const;
const H_ALIGNS = ['left', 'center', 'right'] as const;
const V_ALIGNS = ['top', 'middle', 'bottom'] as const;
const H_ALIGN_LABEL = { left: 'alignLeft', center: 'alignCenter', right: 'alignRight' } as const;
const V_ALIGN_LABEL = { top: 'alignTop', middle: 'alignMiddle', bottom: 'alignBottom' } as const;

/** The stops of the figure opacity control, in percent. */
const OPACITIES = [25, 50, 75, 100];

function WidthSlider({ value, label, onChange }: { value: number; label: string; onChange: (width: number) => void }) {
  // The nearest stop, for a selected figure drawn at a width the slider never sets.
  const index = StrokeSizes.reduce((best, size, i) => (Math.abs(size - value) < Math.abs(StrokeSizes[best] - value) ? i : best), 0);
  return (
    <div className="w-40 max-w-full">
      <input
        type="range"
        min={0}
        max={StrokeSizes.length - 1}
        step={1}
        value={index}
        aria-label={label}
        data-tip={`${label} ${StrokeSizes[index]}`}
        onChange={(e) => onChange(StrokeSizes[Number(e.target.value)])}
        className="block h-5 w-full cursor-pointer accent-accent"
      />
      <div className="flex justify-between px-[7px]">
        {StrokeSizes.map((size, i) => (
          <span
            key={size}
            aria-hidden
            className="rounded-full"
            style={{
              width: Math.min(14, size + 3),
              height: Math.min(14, size + 3),
              background: i === index ? Css.accent : Css.textSecondary,
              opacity: i === index ? 1 : 0.45,
            }}
          />
        ))}
      </div>
    </div>
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
      data-tip-side={useContext(Vertical) ? 'right' : undefined}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: size < 40 ? 12 : 14,
        borderColor: active ? 'transparent' : 'transparent',
        backgroundColor: active ? Css.accent : 'transparent',
        color: active ? '#FFFFFF' : Css.text,
      }}
      className={`relative flex flex-none items-center justify-center border transition ${
        active ? 'shadow-accent' : 'hover:bg-surface-selected'
      }`}
    >
      <Icon name={icon} size={21} />
      {/* The key, as small as Excalidraw's; a touch screen has no keyboard to use it. */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-[3px] bottom-[1px] text-[0.5625rem] leading-none font-bold uppercase opacity-55 [@media(hover:none)]:hidden"
      >
        {shortcut}
      </span>
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

const SIZE_LABELS = {
  small: 'textSmall',
  medium: 'textMedium',
  large: 'textLarge',
  xlarge: 'textXLarge',
} as const;

function MiniButton({
  glyph,
  glyphClass = '',
  label,
  active,
  onClick,
  wide = false,
  children,
}: {
  glyph?: string;
  glyphClass?: string;
  label: string;
  active: boolean;
  onClick: () => void;
  /** Room for a swatch and a number, not one glyph. */
  wide?: boolean;
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
      className={`touch-36 flex h-8 items-center justify-center rounded-[9px] border transition ${wide ? 'min-w-8 px-2' : 'w-8'}`}
      style={{
        borderColor: active ? 'transparent' : Css.borderStrong,
        background: active ? Css.accent : Css.surface,
        color: active ? '#FFFFFF' : Css.text,
      }}
    >
      {children ?? <span className={`text-[0.8125rem] ${glyphClass}`}>{glyph}</span>}
    </button>
  );
}
