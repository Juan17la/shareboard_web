/**
 * The app's icon set: [Phosphor](https://phosphoricons.com), one glyph per
 * name the UI asks for. Callers keep saying `<Icon name="plus" />`; this file
 * is the only place that knows which Phosphor glyph and weight that means, so
 * swapping one is a one-line change. Everything is drawn from `currentColor`,
 * so a button tints its icon by setting one colour.
 *
 * Same names and mapping as `mobile/src/components/ui/Icon.tsx`.
 */
import {
  ArrowDownIcon,
  ArrowLineDownIcon,
  ArrowLineUpIcon,
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  BoundingBoxIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ChalkboardSimpleIcon,
  CheckIcon,
  CircleIcon,
  ClipboardTextIcon,
  CopyIcon,
  CornersOutIcon,
  CursorIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  DropIcon,
  EraserIcon,
  ExportIcon,
  GearSixIcon,
  HandIcon,
  HexagonIcon,
  ImageIcon,
  KeyboardIcon,
  LineSegmentIcon,
  LinkIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  MoonIcon,
  PencilSimpleIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  RectangleIcon,
  ScissorsIcon,
  SelectionSlashIcon,
  ShapesIcon,
  SparkleIcon,
  SunIcon,
  TextTIcon,
  TrashIcon,
  TriangleIcon,
  UploadSimpleIcon,
  UsersIcon,
  WarningIcon,
  XCircleIcon,
  XIcon,
  type Icon as PhosphorIcon,
  type IconWeight,
} from '@phosphor-icons/react';

export type IconName =
  | 'back'
  | 'chevron'
  | 'more'
  | 'close'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'link'
  | 'plus'
  | 'minus'
  | 'check'
  | 'search'
  | 'lock'
  | 'lock-open'
  | 'share'
  | 'board'
  | 'people'
  | 'settings'
  | 'image'
  | 'download'
  | 'upload'
  | 'trash'
  | 'x-circle'
  | 'warning'
  | 'hand'
  | 'pencil'
  | 'eraser'
  | 'shapes'
  | 'text'
  | 'fill'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'polygon'
  | 'line'
  | 'arrow'
  | 'undo'
  | 'redo'
  | 'edit'
  | 'keyboard'
  | 'cursor'
  | 'group'
  | 'ungroup'
  | 'to-back'
  | 'backward'
  | 'forward'
  | 'to-front'
  | 'moon'
  | 'sun'
  | 'sparkle'
  | 'fit';

/** `bold` for the small marks (chevrons, the cross) so they hold up at 15px. */
const GLYPHS: Record<IconName, [PhosphorIcon, IconWeight?]> = {
  back: [CaretLeftIcon, 'bold'],
  chevron: [CaretRightIcon, 'bold'],
  more: [DotsThreeIcon, 'bold'],
  close: [XIcon, 'bold'],
  copy: [CopyIcon],
  cut: [ScissorsIcon],
  paste: [ClipboardTextIcon],
  link: [LinkIcon],
  plus: [PlusIcon, 'bold'],
  minus: [MinusIcon, 'bold'],
  check: [CheckIcon, 'bold'],
  search: [MagnifyingGlassIcon],
  lock: [LockSimpleIcon],
  'lock-open': [LockSimpleOpenIcon],
  share: [ExportIcon],
  board: [ChalkboardSimpleIcon],
  people: [UsersIcon],
  settings: [GearSixIcon],
  image: [ImageIcon],
  download: [DownloadSimpleIcon],
  upload: [UploadSimpleIcon],
  trash: [TrashIcon],
  'x-circle': [XCircleIcon],
  warning: [WarningIcon],
  hand: [HandIcon],
  pencil: [PencilSimpleIcon],
  eraser: [EraserIcon],
  shapes: [ShapesIcon],
  text: [TextTIcon],
  fill: [DropIcon],
  rectangle: [RectangleIcon],
  ellipse: [CircleIcon],
  triangle: [TriangleIcon],
  polygon: [HexagonIcon],
  line: [LineSegmentIcon],
  arrow: [ArrowUpRightIcon],
  undo: [ArrowUUpLeftIcon],
  redo: [ArrowUUpRightIcon],
  edit: [PencilSimpleLineIcon],
  keyboard: [KeyboardIcon],
  cursor: [CursorIcon],
  group: [BoundingBoxIcon],
  ungroup: [SelectionSlashIcon],
  'to-back': [ArrowLineDownIcon],
  backward: [ArrowDownIcon],
  forward: [ArrowUpIcon],
  'to-front': [ArrowLineUpIcon],
  moon: [MoonIcon],
  sun: [SunIcon],
  sparkle: [SparkleIcon],
  fit: [CornersOutIcon],
};

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** Colour comes from `currentColor`: set `color` on the element or a parent. */
export function Icon({ name, size = 20, className }: IconProps) {
  const [Glyph, weight = 'regular'] = GLYPHS[name];
  return (
    <Glyph
      className={className}
      size={size}
      weight={weight}
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, display: 'block' }}
    />
  );
}
