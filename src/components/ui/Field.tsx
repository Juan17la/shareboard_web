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
        <span className="text-[0.75rem] font-extrabold tracking-[0.9px] text-text uppercase opacity-70">
          {label}
        </span>
      ) : null}
      <input
        aria-invalid={error ? true : undefined}
        className={[
          'w-full min-w-0 text-text outline-none placeholder:text-text-secondary',
          bare
            ? 'sb-bare bg-transparent p-0'
            : 'min-h-12 rounded-[12px] border-[1.5px] bg-background px-3.5 py-3 shadow-[inset_0_1px_2px_rgb(21_26_45/0.07)] transition-shadow focus:border-accent focus:shadow-[0_0_0_3.5px_var(--color-accent-soft)]',
          bare ? '' : error ? 'border-danger-bright shadow-[0_0_0_3.5px_rgb(255_59_48/0.22)]' : 'border-field',
          mono ? 'font-mono text-[0.9375rem] font-bold tracking-[1.5px]' : 'text-[1rem] font-semibold',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error ? (
        <span role="alert" className="text-[0.75rem] leading-snug font-semibold text-danger">{error}</span>
      ) : hint ? (
        <span className="text-[0.75rem] leading-snug text-text-secondary">{hint}</span>
      ) : null}
    </label>
  );
}
