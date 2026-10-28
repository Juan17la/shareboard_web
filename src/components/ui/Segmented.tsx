/** Two-to-four-way choice: visibility, export format. */
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

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
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex gap-0.5 rounded-full border-2 border-text/85 p-[2px] ${
        disabled ? 'opacity-50' : ''
      }`}
    >
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
            className={`touch-44 flex-1 rounded-full px-2 py-[7px] text-[0.8125rem] font-bold transition ${
              active ? 'bg-text text-background' : 'text-text-secondary hover:bg-surface hover:text-text'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
