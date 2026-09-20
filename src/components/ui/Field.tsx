import type { InputHTMLAttributes, ReactNode } from 'react';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  /** Codes and PINs are typed in JetBrains Mono, spaced out. */
  mono?: boolean;
  /** Drops the border and background: for a field sitting inside a glass row. */
  bare?: boolean;
}

export function Field({
  label,
  hint,
  error,
  mono = false,
  bare = false,
  className = '',
  ...rest
}: FieldProps) {
  return (
    <label className="flex flex-col gap-[7px]">
      {label ? (
        <span className="text-[10.5px] font-extrabold tracking-[0.9px] text-text-secondary uppercase">
          {label}
        </span>
      ) : null}
      <input
        aria-invalid={error ? true : undefined}
        className={[
          'w-full min-w-0 text-text outline-none placeholder:text-text/30',
          bare
            ? 'bg-transparent p-0'
            : 'rounded-lg border bg-surface px-[13px] py-3 focus:border-accent',
          bare ? '' : error ? 'border-danger-bright' : 'border-line-strong',
          mono ? 'font-mono text-[15px] font-bold tracking-[1.5px]' : 'text-[16px] font-semibold',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error ? (
        <span className="text-[11.5px] leading-snug text-danger">{error}</span>
      ) : hint ? (
        <span className="text-[11.5px] leading-snug text-text-secondary">{hint}</span>
      ) : null}
    </label>
  );
}
