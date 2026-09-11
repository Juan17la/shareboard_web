/** Two-or-three-way choice: visibility, export format. */
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
      className={`flex gap-[7px] rounded-lg bg-[rgba(27,32,48,0.05)] p-[5px] ${
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
            className={`flex-1 rounded-[11px] py-[9px] text-[12.5px] font-extrabold transition ${
              active ? 'bg-white text-accent shadow-card' : 'text-text-secondary hover:bg-white/50'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
