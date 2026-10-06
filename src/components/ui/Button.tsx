/**
 * Buttons, in the five variants the design uses.
 *
 * `primary` and `danger` are filled the Apple way (`.shadow-accent` /
 * `.shadow-danger` in index.css): flat system colour, lit top edge, hairline
 * ring, tight shadow, dimmed while pressed.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dashed';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white shadow-accent hover:bg-[#0077ed]',
  danger: 'bg-danger text-white shadow-danger hover:brightness-110',
  secondary:
    'bg-glass-solid text-text border border-line-strong backdrop-blur-md hover:bg-surface-selected active:bg-surface-selected',
  ghost: 'text-text-secondary hover:bg-text/[0.04] active:bg-text/[0.07]',
  dashed:
    'border border-dashed border-line-dashed text-text/60 hover:bg-surface-selected hover:text-text active:bg-surface-selected',
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
        'flex items-center justify-center gap-2.5 font-bold transition',
        stacked ? 'flex-col gap-2' : '',
        variant === 'dashed' ? 'rounded-lg' : 'rounded-[14px]',
        compact ? 'px-4 py-3 text-[0.8438rem]' : 'px-[18px] py-4 text-[0.9688rem]',
        fullWidth ? 'w-full' : '',
        off ? 'opacity-55' : 'active:scale-[0.985]',
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
          {icon ? <Icon name={icon} size={compact ? 16 : 19} /> : null}
          <span>{label}</span>
          {children}
        </>
      )}
    </button>
  );
}

/** Square glass icon button — the header's back / menu affordances. */
export function IconButton({
  icon,
  label,
  onClick,
  size = 36,
  iconSize = 18,
  radius = 12,
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
      style={{ width: size, height: size, borderRadius: radius }}
      className={[
        'flex flex-none items-center justify-center border border-line transition',
        active ? 'bg-accent text-white shadow-accent' : 'bg-surface text-text hover:bg-surface-selected',
        disabled ? 'pointer-events-none opacity-40' : '',
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
      className="touch-36 flex h-[26px] w-[26px] items-center justify-center rounded-[9px] border border-line-strong bg-surface text-text transition hover:bg-surface-selected disabled:opacity-40"
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
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
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
