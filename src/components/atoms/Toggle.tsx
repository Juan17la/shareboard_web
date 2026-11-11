/**
 * The switch in the settings and export sheets: green when on, as a switch is
 * on a phone, so "on" never reads as "this is the primary action".
 *
 * A `role="switch"` button rather than a native checkbox, which would paint
 * itself differently on every platform.
 */
export function Toggle({
  value,
  onChange,
  label,
  disabled,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`relative h-[26px] w-11 flex-none rounded-full transition-colors duration-200 ${
        value ? 'bg-switch' : 'bg-fill-strong'
      } ${disabled ? 'pointer-events-none opacity-45' : ''}`}
    >
      <span
        className="absolute top-[2px] left-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-200 motion-reduce:transition-none"
        style={{ transform: `translateX(${value ? 18 : 0}px)` }}
      />
    </button>
  );
}
