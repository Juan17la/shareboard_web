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
    <label className="flex flex-col gap-1.5">
      {label ? <span className="text-[0.8125rem] font-semibold text-text">{label}</span> : null}
      <input
        aria-invalid={error ? true : undefined}
        className={[
          'w-full min-w-0 text-text outline-none placeholder:text-text-secondary',
          bare
            ? 'sb-bare bg-transparent p-0'
            : 'min-h-11 rounded-[10px] border-2 bg-background px-3 py-2 transition-shadow focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)]',
          bare ? '' : error ? 'border-danger-bright shadow-[0_0_0_3px_var(--color-danger-soft)]' : 'border-field',
          mono ? 'font-mono text-[0.9375rem] font-bold tracking-[1.5px]' : 'text-[1rem] font-medium',
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
