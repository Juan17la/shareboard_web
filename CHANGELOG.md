# Changelog

All notable changes to the Shareboard web client. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). `git_scripts/release.sh` turns
`Unreleased` into the released version.

## [Unreleased]

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
