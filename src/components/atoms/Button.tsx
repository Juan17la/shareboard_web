/**
 * Buttons, in the five variants the design uses.
 *
 * Rounded rectangles, flat. `primary` is the one filled blue button a surface
 * gets; `secondary` is a grey fill, `ghost` is plain tinted text, `danger` is
 * a red tint for the answer that destroys something, `dashed` a drop target.
 * 36px under a mouse, 44px under a finger (`touch-44`).
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dashed';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white shadow-accent hover:bg-accent-deep',
  secondary: 'bg-fill text-text hover:bg-fill-strong active:bg-fill-strong',
  ghost: 'text-accent-text hover:bg-accent-softer active:bg-accent-soft',
  danger: 'bg-danger-soft text-danger hover:brightness-95 active:brightness-90',
  dashed:
    'border-[1.5px] border-dashed border-line-dashed text-text-secondary hover:bg-fill hover:text-text active:bg-fill-strong',
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  /** Compact height for inline use next to an input. */
  compact?: boolean;
  /** Stacks the icon above the label — the import sheet's drop target. */
  stacked?: boolean;
  children?: ReactNode;
}

export function Button({
  label,
  variant = 'primary',
  icon,
  loading = false,
  fullWidth = false,
  compact = false,
  stacked = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const off = !!disabled || loading;
  return (
    <button
      type="button"
      aria-label={label}
      aria-busy={loading || undefined}
      disabled={off}
      className={[
        'flex items-center justify-center font-semibold transition-colors',
        stacked ? 'flex-col gap-2' : 'gap-1.5',
        compact
          ? 'touch-36 min-h-8 rounded-[8px] px-3 py-1 text-[0.8125rem]'
          : 'touch-44 min-h-9 rounded-[12px] px-4 py-1.5 text-[0.9375rem]',
        fullWidth ? 'w-full' : '',
        off ? 'opacity-45' : '',
        VARIANT[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : (
        <>
          {icon ? <Icon name={icon} size={compact ? 15 : 17} /> : null}
          <span>{label}</span>
          {children}
        </>
      )}
    </button>
  );
}

/** Round icon button on a grey fill: the sheet's close and back, the header's menu. */
export function IconButton({
  icon,
  label,
  onClick,
  size = 36,
  iconSize = 18,
  radius,
  disabled,
  active,
  title,
  tipSide = 'bottom',
  className = '',
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  size?: number;
  iconSize?: number;
  radius?: number;
  disabled?: boolean;
  active?: boolean;
  /** Tooltip text when it should say more than the label. */
  title?: string;
  /** Where the tooltip opens; icon buttons mostly sit in the header, so below. */
  tipSide?: 'top' | 'bottom' | 'left';
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-tip={title ?? label}
      data-tip-side={tipSide}
      disabled={disabled}
      onClick={onClick}
      style={{ width: size, height: size, borderRadius: radius ?? size / 2 }}
      className={[
        'sb-hit flex flex-none items-center justify-center transition-colors',
        active ? 'bg-accent text-white' : 'bg-fill text-text hover:bg-fill-strong active:bg-fill-strong',
        disabled ? 'cursor-not-allowed opacity-40' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}

/** The `+`/`−` steppers in the text options panel. */
export function StepperButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tip={label}
      disabled={disabled}
      onClick={onClick}
      className="touch-36 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-fill text-text transition-colors hover:bg-fill-strong active:bg-fill-strong disabled:opacity-40"
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

/** Divider used inside panels and rails. */
export function Hairline({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-line ${className}`} />;
}

function Spinner() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="44"
        strokeDashoffset="30"
        opacity="0.9"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}
