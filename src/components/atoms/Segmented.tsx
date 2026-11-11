/** Two-to-four-way choice: visibility, export format. */
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A grey track with one white key that slides under the chosen option. The
 * options share the width equally, so the key is one n-th of the track and
 * its place is a translate by whole key widths.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
  label,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  label?: string;
}) {
  const index = Math.max(0, options.findIndex((opt) => opt.value === value));
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`relative flex rounded-[9px] bg-fill p-[2px] ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-[2px] left-[2px] rounded-[7px] bg-key shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-[cubic-bezier(0.22,0.9,0.26,1)] motion-reduce:transition-none"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`touch-32 relative min-h-7 flex-1 rounded-[7px] px-2 text-[0.8125rem] transition-colors ${
              active ? 'font-semibold text-text' : 'font-medium text-text-secondary hover:text-text'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
