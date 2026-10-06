# Changelog

All notable changes to the Shareboard web client. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). `git_scripts/release.sh` turns
`Unreleased` into the released version.

## [Unreleased]

### Added

- A "+ Crear / Unirse" button ("+ New / Join") in the header for another
  whiteboard: name a new blank one, or join one with its code. "New whiteboard" and "Join with a code" left the menu.
- The pencil's icon shows its mode: a pencil and ruler while "Draw to shape"
  is on (the toggle in its options uses the same two icons).
- A short tutorial for new users: six coach marks over the real toolbar
  (draw with the pencil, its options, draw to shape, select, arrows and text,
  share). Drawing and selecting move it on by themselves; Skip ends it. It
  shows once — not to anyone who used the app before — and again from
  Settings → "Replay the tutorial".
- An offline board: the app always opens on a board kept in this browser
  (IndexedDB) that works without a connection and survives reloads. Share
  turns it into a live board (a copy; the offline one stays private), "My
  whiteboards" lists it first, and live boards there are hidden once the
  server hasn't been reached for five hours, back as soon as it answers.
  "Draw with AI" works on it while online and is greyed out offline.
- Each tool's options are exactly the to-do's list (rectangle: background,
  border, width, corners, stroke style, alignment; circle: background, border,
  stroke style; arrow: colour, stroke style, tail, head, arrow type, text; …),
  and a selection shows the same ones. Corners, alignment, tail, head, arrow
  type, text size, font and a circle's border open as dropdowns.
- Underline for text (with bold and italic), drawn on the board and in SVG exports.
- "Draw to shape" straightens what it reads: a line that runs nearly level,
  upright or diagonal (within 6°) becomes exactly so, and a polygon's corners
  that nearly share a line snap onto it and a nearly symmetric one is made
  symmetric, so trapezoids, right triangles and the like come out tidy.
- "Draw to shape" now reads irregular figures too: scalene and right triangles,
  trapezoids, parallelograms and polygons of any angles keep their own corners
  (a clean square, circle or regular polygon still comes out regular).
- A pencil stroke with a small loop curled at either end becomes an arrow,
  its head where the loop is.
- While an arrow is drawn, each figure shows only the three connection points
  nearest the pointer; the end still snaps to any of them.
- Arrows bind to text as well as figures and images, each end on its own: a
  tail started on empty board stays free while the head binds. The element an
  end will bind to is framed while drawing, and an arrow let go on the element
  it started from no longer links to itself.
- "Draw to shape" pencil mode (pencil options, remembered): the figure the
  stroke reads as shows faintly while drawing and lands on release — lines,
  arrows, circles, rectangles, triangles, polygons — and the pencil stays in hand, so figures can be drawn one after another. A stroke it can't read stays freehand.
- Several selected elements resize together from the corners of their overall
  box: strokes, figures and lines scale, text moves and re-wraps (its size
  stays), rotated elements move without stretching. One undo step.
- Opacity for figures (25 / 50 / 75 / 100 %): the fill, outline and label fade
  together, in the canvas and in the SVG export. Older boards stay opaque.
- Rounded or sharp corners for rectangles, triangles and polygons (sharp by
  default, so rectangles drawn before this look sharper than they did).
- Text alignment: left / centre / right for text, and left / centre / right plus
  top / middle / bottom (and a one-tap "fully centred") for a figure's label.
- The options strip shows only a tool's main options; the rest are behind
  "More options".
- Four text sizes (small, medium, large, extra large) replace the +/- stepper;
  older boards keep their size and the nearest one is lit.
- An export button in the header, so exporting is one click instead of a trip
  through the menu.
- Each tool button shows its keyboard shortcut as a small letter.
- A stroke style (solid, dashed, dotted) for every figure, not only lines and
  arrows; it shows in the canvas and in SVG/PNG export.

### Changed

- The figure opacity row and the label size/font of boxes left the options
  strip (not on the to-do's list); figures keep the opacity they have.
- The fill tool's icon is a paint bucket.
- The pencil reads a held stroke as a figure after 500 ms instead of 700 ms.
- Choosing a transparent background hides the JPG format instead of greying the
  switch.
- Accepting an AI drawing closes the assistant and shows the board.
- Plain lines no longer bind to shapes; only arrows do. Lines from older boards
  stay where they are.
- Clearer labels: arrow type, tail, head and background.
- The header has no background or glass any more: each button sits on its own
  small solid chip over the board.
- The options strip shows one colour box (opens the picker, which now also has
  the quick palette) instead of a row of swatches; the fill is a labelled box.
- On wide screens the tools are a rail on the right and the options a panel on
  the left; narrow screens keep the bottom strips.
- The eraser fades what it passes over until you lift, instead of hiding it.
- After drawing a figure or a text, the cursor comes back with the new element
  selected. The pencil, hand, eraser and fill stay in hand.
- Stroke width is a four-stop slider; option groups carry a small subtitle, and
  a button next to the background colour removes the background.

### Fixed

- Two tabs (or a tab and a phone) of the same user on one board no longer
  knock each other offline: each keeps its socket and sees the other's
  changes. Before, the second tab closed the first ("Sin conexión") and edits
  from one never showed in the other.
- A selected figure's resize points can be grabbed even where another figure
  is drawn on top of them; a press on that figure's body still selects it.
- A middle click on Linux no longer pastes the highlighted text onto the board.

## [1.3.1-beta] - 2026-10-01

### Changed

- Nothing in this project: released alongside the mobile app's pencil fix so
  the three keep one version.

## [1.3.0-beta] - 2026-10-01

### Fixed

- An elbow's handle is back on every route that has a middle segment, not only
  the plain three-segment ones: wrapped round a shape, or with an end leaving
  sideways, the diamond on the middle run still slides it where you want it. It
  stops where the line would reach a shape or fold back on itself. The paths and
  directions the elbow takes are as they were.

- An elbow arrow no longer runs through the shape it is bound to. Every link
  leaves its shape straight out, away from the shape's centre — not only one on a
  rectangle's side, but any point of an ellipse, a triangle or a polygon's outline —
  and tries its second-best way out when something stands in the first, even
  with two shapes a hair apart.

### Changed

- An elbow arrow bound to a shape leaves it straight out of the side it sits on and
  goes around that shape instead of through it; dragging the end to another side
  turns the way it leaves. The elbow's own handle replaces the toolbar's
  "leaves / arrives" buttons: the diamond in the middle segment slides it, and on
  a single corner between two free ends the corner itself can be dragged across
  to the other corner to turn the route over. Same as the mobile app.

## [1.2.0-beta] - 2026-09-30

### Added

- Copy puts the selection on the system clipboard as well as in the app, so it
  pastes as the same elements — fills, text, images, arrows still bound to their
  shapes, groups — in another tab, on another board, or in the mobile app.
  Pasting copied text from another app adds it as a text element.
- Right-click (without dragging) opens a menu: copy, cut, paste, duplicate,
  bring to front / forward / send backward / to back, group, delete; on empty
  board, paste and select all.

### Changed

- Fill is two options instead of four buttons: a colour (typed as a HEX code such
  as `#FF8800` or `f80`, or picked) and an opacity from 0 to 100%, in one sheet
  behind a single chip in the options strip (0% is no fill). The border's colour
  and the fill's are independent: recolouring the border no longer recolours the
  fill, and a new shape starts with a fill in its border's colour. Boards drawn
  with the old Light / Medium / Solid fills open exactly as before (18%, 50%, 100%).
- The options strip keeps only the style controls and is capped in width; copy,
  cut, stacking order and group moved to the right-click menu.
- Duplicate keeps what is joined: a duplicated arrow follows its copied shapes
  and a duplicated group is a group of its own.
- Edits sent in one burst (a paste of several images) are split to fit the
  server's frame limit instead of closing the connection.
- New app icon: the tab icon and the touch icon.

### Changed

- Elbow lines choose their ends like a diagramming tool: by default they leave
  and arrive along the long axis — or straight out of the side of a shape they
  are bound to; a new row of options picks the direction at each end (across or
  up and down, in any pairing — two different ones make a single corner), and
  the middle segment is still dragged.
- Curved lines are cubic, with a handle on a stem at each end (the direction and
  pull as the line leaves and arrives) and one in the middle that slides the
  whole bow. Curves saved before look exactly as they did until they are shaped.
- A polygon has four sides at least (three is the triangle); a hand-drawn
  four-sided shape is read as a rectangle, or as a four-sided polygon (a diamond)
  when it stands on a corner — not as a triangle when one corner was drawn soft.
- When the pen is held and the stroke is read as a figure (circle, rectangle,
  polygon, line…), the figure is made on the board at once and stays: the pen,
  still down, then resizes it (pull out to grow it, in to shrink it; a line's tip
  follows) instead of turning it back into the stroke. One undo takes it all back.

### Changed

- A line's or arrow's label now sits **in** the line: the line is cut away
  behind the text (canvas, editor and SVG export alike), and the label is
  dragged along the line to move it (a dashed frame shows it is held when the
  line is selected). A touch on the label still picks the line. The place is a
  new `labelAt` (0..1 along the route).
- More connection points: an ellipse offers eight on its outline, a triangle and
  a polygon their corners and the middle of each side, a rectangle its corners
  and sides' middles, plus the centre (which aims at the other end). Line ends
  land on the real outline — no longer on the shape's box — and follow when the
  shape is resized.
- The pencil reads a hand-drawn polygon of five to eight corners as a polygon,
  and a held stroke turns into its figure after 700 ms instead of 800.
- Text fields have a clearly visible edge (accent, with a halo, while typing)
  instead of a hairline lost on the frosted panels; rows that hold a bare field
  draw one ring instead of two.

### Fixed

- A line's label no longer has the line through it: it stands beside the line's
  midpoint on the side facing up (to the right of a vertical line), pushed off
  just far enough to clear it; a flat line's label stays exactly where it was.
  The editor, the canvas and the SVG export agree on the place.
- The Menu is one list again, without the heavy divider between groups.

### Changed

- There is no home page. `/` opens the whiteboard you were last at, or — the
  first time, or when it is gone — makes a blank one and opens that, so there is
  always something to draw on at once. A guest name stands in until you pick one
  in the settings.
- Two buttons on the whiteboard hold the rest: **Menu** (new whiteboard, my
  whiteboards, join with a code, import, export, who can edit, who is here, the
  assistant) and **Settings** (your name and icon, the board's name, the
  switches, theme, language). The back button and the header's theme toggle are
  gone; both live in those two.
- The options strip no longer prints the "Style" and "Arrange" headings, and the
  polygon's side count is a bare number: the text sat off-centre above the rows.

### Performance

- Hit tests skip a stroke whose bounding box is nowhere near the point.

### Fixed

- Undoing an erase (or a cut, or redoing a draw) puts the element back in its
  layer instead of on top of everything.
- A text is one undo step, and one that is left empty leaves none; one eraser
  scrub is one step, however many figures it crossed.
- Undo and redo let go of a selected element that is no longer there.
- An error about a single request (a refused batch, a rate limit) is a toast
  and a resync, not the "could not open" screen; edits waiting when the
  connection dropped are kept and sent after the rejoin.

### Changed

- The home card floats over an empty board (just the dot grid) instead of a
  blurred demo board; the demo board and its test are gone.
- Home has a fourth tab, *Import*, holding the drop zone that used to sit under
  the join code; the logo now sits above the name. The card keeps one height
  on every tab and scrolls inside when a tab has more (many recent boards).
- All icons are [Phosphor](https://phosphoricons.com) (`@phosphor-icons/react`),
  mapped in `components/ui/Icon.tsx`.
- The accent is Apple's blue (`#0071e3`) and filled controls (`.shadow-accent`)
  are flat with a lit top edge, a hairline ring and a tight shadow, not a glow.
  Segmented tabs and buttons are set in bold, not extrabold.

### Fixed

- Switching theme left some icons and borders in the old colour: JSX styles read
  `Colors` at render time, so a component that does not subscribe to the theme
  kept the previous value. They read `Css` (`var(--color-…)`) now, which the
  browser re-resolves.

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
