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
import type { TextElement } from '../../lib/contract';
import { Colors } from '../../lib/theme';

export function TextEditorOverlay({
  element,
  camera,
  onClose,
}: {
  element: TextElement;
  camera: Camera;
  onClose: () => void;
}) {
  const t = useT();
  const updateText = useBoardStore((s) => s.updateText);
  const [value, setValue] = useState(element.text);
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
    updateText(element.id, { text: value });
    onClose();
  };

  const at = boardToScreen(element.at.x, element.at.y, camera);
  const fontSize = element.fontSize * camera.scale;

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
        className="absolute resize-none overflow-hidden rounded-md border-[1.5px] border-dashed bg-white/90 px-1 py-0.5 outline-none placeholder:text-[rgba(27,32,48,0.35)]"
        style={{
          left: at.x,
          // The dashed frame sits a hair above the baseline box so it does not
          // cover the glyphs it is framing.
          top: at.y - 4,
          minWidth: 120,
          maxWidth: 320,
          borderColor: Colors.accent,
          color: element.color,
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontWeight: element.bold ? 800 : 500,
          fontStyle: element.italic ? 'italic' : 'normal',
          fontSize,
          lineHeight: 1.25,
        }}
      />
    </div>
  );
}
