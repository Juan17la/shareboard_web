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
      className={`flex gap-0.5 rounded-[11px] bg-text/[0.07] p-[3px] ${
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
            className={`flex-1 rounded-[9px] px-1 py-[7px] text-[0.7812rem] font-bold transition ${
              active ? 'bg-background text-accent-text shadow-[0_1px_3px_rgb(0_0_0/0.14),0_0_0_0.5px_rgb(0_0_0/0.05)]' : 'text-text-secondary hover:bg-surface-selected'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
