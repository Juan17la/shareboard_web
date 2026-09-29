# Changelog

All notable changes to the Shareboard web client. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). `git_scripts/release.sh` turns
`Unreleased` into the released version.

## [Unreleased]

## [1.1.0-beta] - 2026-09-29

### Added

- `vercel.json`: Vite build, `dist` output, every path rewritten to `index.html`
  (so a reload on `/board/:id` or `/b/CODE` works), hashed assets cached for a
  year. `VITE_API_URL` / `VITE_WS_URL` are set in the Vercel project.
- The selected "who can edit" option is a hairline ring with a centred dot; the
  old 5.5 px ring looked like a heavy blob on the light board.

- A board opens framed on its content instead of on an origin that may be empty
  space, and a **Fit to content** button sits beside the zoom controls (Shift+1
  as before). Reconnecting never moves the camera.
- On touch screens, picking a tool names it for a moment (tooltips never show
  there), and an empty board shows a one-time "pick a tool and draw" hint.
- Menus and confirmations are real dialogs: focus moves in, Tab stays inside,
  and focus returns to the button that opened them. `<html lang>` follows the
  chosen language, and the page can be pinch-zoomed again.
- Nicknames may be 40 characters (was 24); leading spaces are dropped and no
  longer count toward the limit.
- The options strip names its rows (*Style* / *Arrange*), the "Aa" handle on a
  selected figure says "Add text", and on a phone the strip stops at 45 % of
  the screen and scrolls, so what is being edited stays in view.
- Touch screens get 36 px controls (they stay compact under a mouse); the
  Start card sits in two columns on a phone held sideways; the header, toolbar
  and options fit a 320 px screen; the Share button says "Share" where there
  is room; `?` opens the keyboard shortcuts, and the menu lists them.
- Text follows the browser's font-size setting (rem, never below 12 px), the
  controls move down with a taller header, and a long board name is shown
  whole in the menu.

- Selecting something holds it: the first person to select an element owns
  it until they deselect it or leave. Everyone else sees it dimmed, framed in
  that person's colour with their name on a tag, and cannot select, erase,
  fill or edit it.

- Export only what is selected: with a selection, the export sheet offers
  *Whole board* or *Selection* (selection first); the preview, the picture and
  the embedded board follow the choice.
- SVG export next to PNG and JPG: a vector file with the board's fonts,
  wrapped labels, polygons and rotation, optionally transparent.

- Font picker for text and figure labels: rounded (Nunito, the default),
  serif (Lora), monospace (JetBrains Mono) and handwritten (Caveat).
- Typing into a figure edits its label in place: the text appears exactly as
  it will look — centred, wrapped inside the figure, in its font and turn —
  instead of in a separate box. Text elements are edited in place too.

### Changed

- A figure's label wraps to fit inside the figure.

- Polygons with 3 to 12 sides: a new shape tool (G) with a sides stepper in
  the options strip.
- Rotation: a selected figure, text or image has a round knob above it; drag
  it to turn the element (it snaps to 15° steps). Handles, hit-testing and
  arrow links follow the turned outline.
- Images behave like figures: arrows bind to them and follow them, and
  resizing from a corner keeps their proportions.
- Text can be resized like an image: its corners scale the font, and the
  handle on its right edge sets a width the text wraps to.

- Draw with AI shows a preview of each drawing first: *Add to board* puts it
  there as one group (one undo removes it), *Discard* drops it. The AI sheet is
  bigger to fit it.

- Ctrl/⌘ V pastes an image straight from the system clipboard onto the board,
  centred under the pointer (copied elements still paste as before).
- Images in WebP, GIF, SVG, AVIF and BMP can be imported, not just PNG/JPG.

### Changed

- The ✦ AI button in the top-right controls is filled in the brand colour so it
  stands out.
- The board code reads as `ABC·DEF` in a sans font; codes typed or pasted with
  the `·` still join.

### Fixed

- The active tab and links in the dark theme are readable (`accent-text`
  token, 6.6:1 instead of 2.5:1), and the nickname field's focus ring follows
  the rounded row instead of drawing a hard rectangle.

- Transparent PNG/SVG images keep their transparency instead of getting a white
  background.

## [1.0.0-beta.4] - 2026-09-26

### Changed

- No web changes; released alongside the app fix in mobile 1.0.0-beta.4.

## [1.0.0-beta.3] - 2026-09-26

## [1.0.0-beta.2] - 2026-09-26

### Added

- `render.yaml` Blueprint: static site on Render with the SPA rewrite, so
  reloading `/board/:id` works. Set `VITE_API_URL` and `VITE_WS_URL`.

## [1.0.0-beta.1] - 2026-09-25

First public beta.

### Added

- **Draw with AI** — the ✦ button next to undo/redo (or the board menu) opens a
  chat: describe a picture and it lands in the middle of your screen as separate
  figures, labels and connected arrows, for everyone on the board.
- **Copy, cut and paste** — Ctrl/⌘ C, X, V (paste lands under the pointer) and
  buttons in the selection options.
- **Sketch to shape** — hold the pen still at the end of a stroke and it becomes
  the rectangle, ellipse, triangle, line or arrow it was meant to be.
- Boards: create (named; public, or private with a PIN), join by link, short
  code or QR, rename, delete; recent boards and a live demo board on the home
  screen.
- Tools: pencil, eraser, rectangle, ellipse, triangle, line, arrow, text and
  hand; a cursor tool to select, marquee, move, resize, group, duplicate and
  reorder (to back / backward / forward / to front).
- Lines and arrows: 15 end markers, straight, curved or elbow routes with a
  fold handle, dash styles, and ends that bind to a shape and follow it.
- Shape labels, fill levels, colour palette plus a custom colour, stroke width,
  bold and italic text.
- Realtime collaboration: live cursors, a presence list with colours and emoji
  avatars, edit permissions (everyone, selected people, creator only) applied
  live.
- PNG export, board file export/import, placing images.
- Undo/redo, zoom controls, keyboard shortcuts and tooltips, panning with space
  or the hand tool.
- Spanish and English, light and dark theme, landscape and compact layouts.

### Fixed

- A click on a figure drawn above the selection picks that figure; after "send
  to back" it used to move or resize everything behind it. Strokes are
  hit-tested along their whole line, not only at their points.

### Known limitations

- Drawings made with AI are not in the undo history; select and delete them.
