/**
 * Buttons, in the six variants the design uses.
 *
 * Pills, like the line badges on a transit sign. `primary` (blue), `go`
 * (green: the step that finishes a flow) and `danger` are filled with a
 * darker base edge (`.shadow-*` in index.css); `secondary` is ink-outlined.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'go' | 'secondary' | 'ghost' | 'danger' | 'dashed';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white shadow-accent hover:bg-accent-deep',
  go: 'bg-go text-white shadow-go hover:brightness-110',
  danger: 'bg-danger text-white shadow-danger hover:brightness-110',
  // Outlined in ink: clearly a button, never competing with a filled one.
  secondary: 'border-2 border-text text-text hover:bg-surface active:bg-surface-selected',
  ghost: 'text-text-secondary hover:bg-text/[0.06] hover:text-text active:bg-text/[0.1]',
  dashed:
    'border-2 border-dashed border-line-dashed text-text-secondary hover:bg-surface hover:text-text active:bg-surface-selected',
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
        'flex items-center justify-center gap-2 font-bold tracking-[-0.1px] transition',
        stacked ? 'flex-col gap-2' : '',
        variant === 'dashed' || stacked ? 'rounded-[14px]' : 'rounded-full',
        compact ? 'min-h-10 px-4 py-2 text-[0.875rem]' : 'min-h-12 px-5 py-3 text-[0.9375rem]',
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
          {icon ? <Icon name={icon} size={compact ? 16 : 18} /> : null}
          <span>{label}</span>
          {children}
        </>
      )}
    </button>
  );
}

/** Round icon button ringed in ink, like a station marker — the header's back / menu affordances. */
export function IconButton({
  icon,
  label,
  onClick,
  size = 40,
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
        'touch-44 flex flex-none items-center justify-center border-2 transition',
        active
          ? 'border-accent bg-accent text-white'
          : 'border-text/85 bg-background text-text hover:bg-surface',
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
      className="touch-36 flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-text/85 bg-background text-text transition hover:bg-surface disabled:opacity-40"
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
