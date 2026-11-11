import type { InputHTMLAttributes, ReactNode } from 'react';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  /** Codes and PINs are typed in JetBrains Mono, spaced out. */
  mono?: boolean;
  /** Drops the well: for a field sitting inside a grouped row. */
  bare?: boolean;
}

/**
 * A borderless well on the sheet: white on the grouped grey, 36px under a
 * mouse and 44px under a finger. The label and the hint line up with the text
 * inside it. Focus and error are drawn by `.sb-field` (index.css).
 */
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
    <label className="flex flex-col gap-1">
      {label ? <span className="px-3 text-[0.8125rem] font-medium text-text-secondary">{label}</span> : null}
      <input
        aria-invalid={error ? true : undefined}
        className={[
          'w-full min-w-0 text-text outline-none placeholder:text-text-tertiary',
          bare ? 'sb-bare bg-transparent p-0' : 'sb-field touch-44 min-h-9 rounded-[10px] bg-glass-row px-3 py-1.5',
          mono ? 'font-mono text-[0.9375rem] font-bold tracking-[1.5px]' : 'text-[1rem]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error ? (
        <span role="alert" className="px-3 text-[0.75rem] leading-snug font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="px-3 text-[0.75rem] leading-snug text-text-secondary">{hint}</span>
      ) : null}
    </label>
  );
}
