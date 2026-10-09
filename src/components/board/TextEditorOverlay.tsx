/**
 * The inline editor a text element is typed into.
 *
 * What is typed is painted by the board itself, in place — a figure's label
 * centred and wrapped inside the figure, a text in its own font and turn — so
 * it looks exactly as it will once committed. The textarea over it only holds
 * the caret and the selection: same box, font and line height, glyphs clear. Committing on blur is
 * what makes clicking elsewhere on the board finish the text naturally; an
 * empty value deletes the element the click created, so nothing is left
 * behind. No confirm button: Enter breaks the line, a click outside (or
 * Ctrl/Cmd+Enter) is the finish.
 */
import { useEffect, useRef, useState } from 'react';

import { useT } from '../../features/i18n';
import { useBoardStore, type Camera } from '../../features/board-store';
import { useSessionStore } from '../../features/session';
import { SHAPE_TEXT_SIZE, type ShapeElement, type TextElement } from '../../lib/contract';
import {
  boxOf,
  isLineLike,
  labelLines,
  labelPlacement,
  lineLabelCentre,
  LABEL_PAD,
  rotationOf,
  shapeBounds,
  TEXT_LINE_HEIGHT,
} from '../../lib/geometry';
import { Css, inkFor } from '../../lib/theme';
import { FONT_FAMILIES } from './renderer';

export function TextEditorOverlay({
  element,
  camera,
  onDraft,
  onClose,
}: {
  /** A text element, or a shape whose label is being typed. */
  element: TextElement | ShapeElement;
  camera: Camera;
  /** Every keystroke's text, for the board to paint in place. */
  onDraft: (text: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const dark = useSessionStore((s) => s.theme === 'dark');
  const updateText = useBoardStore((s) => s.updateText);
  const updateShape = useBoardStore((s) => s.updateShape);
  const [value, setValue] = useState(element.text ?? '');
  useEffect(() => onDraft(value), [value, onDraft]);
  const ref = useRef<HTMLTextAreaElement>(null);
  const committed = useRef(false);

  useEffect(() => {
    // The editor mounts during the pointerdown that created its element. The
    // browser's own focus handling for that press runs right after, and would
    // pull focus off a textarea focused now — blurring it, committing an empty
    // text and deleting the element. A task later, the press is over.
    const timer = setTimeout(() => {
      const area = ref.current;
      if (!area) return;
      area.focus();
      // Typing continues an existing label rather than starting before it.
      area.setSelectionRange(area.value.length, area.value.length);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const commit = () => {
    // Blur fires after Ctrl+Enter has already committed; without the guard the
    // second call would delete the element it just created.
    if (committed.current) return;
    committed.current = true;
    if (element.kind === 'text') updateText(element.id, { text: value });
    else updateShape(element.id, { text: value.trim() });
    onClose();
  };

  /** Throws the draft away: a brand-new text goes, an existing one is kept as it was. */
  const cancel = () => {
    if (committed.current) return;
    committed.current = true;
    if (element.kind === 'text' && !element.text) updateText(element.id, { text: '' });
    onClose();
  };

  // The renderer paints the draft (`onDraft`) exactly as it will look; this
  // textarea lies over it in the same font, size, line height and turn, with
  // its own glyphs invisible — only the caret and the selection show.
  const s = camera.scale;
  const draft = { ...element, text: value } as TextElement | ShapeElement;
  const fontSize = (element.fontSize ?? SHAPE_TEXT_SIZE) * s;
  const step = fontSize * TEXT_LINE_HEIGHT;
  let box: { x: number; y: number; width: number; height: number };
  let paddingTop = 0;
  let paddingX = 0;
  let textAlign: 'left' | 'center' | 'right' = draft.kind === 'text' ? (draft.align ?? 'left') : 'center';
  if (draft.kind === 'text') {
    const b = boxOf(draft);
    // Unwrapped text grows to the right as it is typed: leave the textarea
    // room so the browser never wraps a line the board does not.
    const width = draft.width ? draft.width * s : Math.max(b.width * s + fontSize * 2, 80);
    // The extra room is split by the alignment, so a centred or right-aligned line stays under its caret.
    const slack = draft.width ? 0 : width - b.width * s;
    const lean = textAlign === 'right' ? 1 : textAlign === 'center' ? 0.5 : 0;
    box = { x: b.x * s + camera.x - slack * lean, y: b.y * s + camera.y, width, height: b.height * s };
  } else if (isLineLike(draft)) {
    // A line's label is centred where it stands along the line (paintShapeLabel).
    const lines = labelLines(draft, fontSize / s);
    const at = lineLabelCentre(draft);
    const cx = at.x * s + camera.x;
    const cy = at.y * s + camera.y;
    box = { x: cx - 160, y: cy - (lines.length * step) / 2, width: 320, height: lines.length * step };
  } else {
    // A box's label is centred in it, wrapped inside its padding.
    const b = shapeBounds(draft);
    const lines = labelLines(draft, fontSize / s).length;
    box = {
      x: b.x * s + camera.x,
      y: b.y * s + camera.y,
      width: b.width * s,
      height: b.height * s,
    };
    const at = labelPlacement(draft, fontSize / s, lines);
    paddingTop = Math.max(0, (at.y - fontSize / s / 2 * TEXT_LINE_HEIGHT) * s + camera.y - box.y);
    textAlign = at.align;
    paddingX = LABEL_PAD * s;
  }
  const angle = rotationOf(element);
  const origin = boxOf(element);
  // The stored colour is the light-theme ink by default; flip it to the dark
  // board's ink the same way the committed element already paints (`inked` in
  // renderer.ts) — otherwise the caret is black on black.
  const color = inkFor(element.kind === 'text' ? element.color : element.stroke, dark);
  const bold = element.kind === 'text' && element.bold;
  const italic = element.kind === 'text' && element.italic;

  return (
    <div className="absolute inset-0 overflow-clip">
      {/* Clicking anywhere else finishes the text rather than leaving a stray
          editor open behind the next stroke. */}
      <div aria-hidden="true" onPointerDown={commit} className="absolute inset-0" />
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          // Enter is a newline (the textarea's own); Ctrl/Cmd+Enter commits.
          // Escape throws the text away, which for a brand-new empty element removes it.
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            cancel();
          }
        }}
        placeholder={t.typeHere}
        aria-label={t.text}
        wrap={draft.kind === 'text' && !draft.width ? 'off' : 'soft'}
        className={`absolute resize-none overflow-hidden border-0 bg-transparent p-0 outline-none placeholder:text-text/35 ${element.kind === 'text' ? 'rounded-sm outline-1 outline-offset-4 outline-dashed' : ''}`}
        style={{
          left: box.x,
          top: box.y,
          width: box.width,
          height: Math.max(box.height, step),
          paddingTop,
          paddingLeft: paddingX,
          paddingRight: paddingX,
          textAlign,
          transform: angle ? `rotate(${angle}rad)` : undefined,
          transformOrigin: `${(origin.x + origin.width / 2) * s + camera.x - box.x}px ${(origin.y + origin.height / 2) * s + camera.y - box.y}px`,
          outlineColor: Css.accent,
          color: 'transparent',
          caretColor: color,
          fontFamily: FONT_FAMILIES[element.font ?? 'sans'],
          fontWeight: bold ? 800 : 500,
          fontStyle: italic ? 'italic' : 'normal',
          fontSize,
          lineHeight: TEXT_LINE_HEIGHT,
        }}
      />
    </div>
  );
}
