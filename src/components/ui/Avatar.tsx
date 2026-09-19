/** First letter of a nickname, the way the design labels presence. */
function initialsOf(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : '?';
}

export function Avatar({
  name,
  color,
  avatar,
  size = 36,
  overlap = false,
  title,
}: {
  name: string;
  color: string;
  /** An emoji shown instead of the initial. */
  avatar?: string;
  size?: number;
  /** Pulls the avatar left so a row of them reads as a stack. */
  overlap?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title ?? name}
      className="grid flex-none place-items-center rounded-full font-extrabold text-white ring-2 ring-white/85"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.round(size * (avatar ? 0.52 : 0.4)),
        marginLeft: overlap ? -Math.round(size * 0.3) : 0,
      }}
    >
      {avatar || initialsOf(name)}
    </span>
  );
}

/** The "+2" bubble that closes an overflowing avatar stack. */
export function AvatarOverflow({ count, size = 26 }: { count: number; size?: number }) {
  return (
    <span
      className="grid flex-none place-items-center rounded-full bg-white font-extrabold text-text-secondary ring-2 ring-white/85"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        marginLeft: -Math.round(size * 0.3),
      }}
    >
      +{count}
    </span>
  );
}
