/**
 * The inline editor a text element is typed into.
 *
 * It is positioned over the exact spot on the board where the text will land
 * and drawn at the zoomed font size, so what is being typed sits where it will
 * end up rather than in a dialog somewhere else. Committing on blur (and on
 * Enter) is what makes clicking elsewhere on the board finish the text
 * naturally; an empty value deletes the element the click created.
 */
import { useEffect, useRef, useState } from 'react';

import { useT } from '../../features/i18n';
import { boardToScreen, useBoardStore, type Camera } from '../../features/board-store';
import { SHAPE_TEXT_SIZE, type ShapeElement, type TextElement } from '../../lib/contract';
import { shapeBounds } from '../../lib/geometry';
import { Colors } from '../../lib/theme';

export function TextEditorOverlay({
  element,
  camera,
  onClose,
}: {
  /** A text element, or a shape whose label is being typed. */
  element: TextElement | ShapeElement;
  camera: Camera;
  onClose: () => void;
}) {
  const t = useT();
  const updateText = useBoardStore((s) => s.updateText);
  const updateShape = useBoardStore((s) => s.updateShape);
  const [value, setValue] = useState(element.text ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);
  const committed = useRef(false);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const commit = () => {
    // Blur fires after Enter has already committed; without the guard the
    // second call would delete the element it just created.
    if (committed.current) return;
    committed.current = true;
    if (element.kind === 'text') updateText(element.id, { text: value });
    else updateShape(element.id, { text: value.trim() });
    onClose();
  };

  // A shape's label sits centred in its box, so the editor does too.
  const width = 160;
  const fontSize = (element.fontSize ?? SHAPE_TEXT_SIZE) * camera.scale;
  let at: { x: number; y: number };
  if (element.kind === 'text') {
    at = boardToScreen(element.at.x, element.at.y, camera);
  } else {
    const b = shapeBounds(element);
    const c = boardToScreen(b.x + b.width / 2, b.y + b.height / 2, camera);
    at = { x: c.x - width / 2, y: c.y - fontSize * 0.75 };
  }
  const color = element.kind === 'text' ? element.color : element.stroke;
  const bold = element.kind === 'text' && element.bold;
  const italic = element.kind === 'text' && element.italic;

  return (
    <div className="absolute inset-0">
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
          // Enter commits; shift+Enter is a newline. Escape throws the text
          // away, which for a brand-new empty element removes it.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            commit();
          }
        }}
        placeholder={t.typeHere}
        aria-label={t.text}
        className={`absolute resize-none overflow-hidden rounded-md border-[1.5px] border-dashed bg-white/90 px-1 py-0.5 outline-none placeholder:text-[rgba(27,32,48,0.35)] ${
          element.kind === 'shape' ? 'text-center' : ''
        }`}
        style={{
          left: at.x,
          // The dashed frame sits a hair above the baseline box so it does not
          // cover the glyphs it is framing.
          top: at.y - 4,
          minWidth: element.kind === 'shape' ? width : 120,
          maxWidth: 320,
          borderColor: Colors.accent,
          color,
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontWeight: bold ? 800 : 500,
          fontStyle: italic ? 'italic' : 'normal',
          fontSize,
          lineHeight: 1.25,
        }}
      />
    </div>
  );
}
