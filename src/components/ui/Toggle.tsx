/**
 * The pill switch from the design's settings and export sheets.
 *
 * Not a native checkbox: the platform control is blue on macOS and green on
 * Android, and would be the only element on screen not wearing the app's
 * accent. The real input stays in the DOM (`sr-only`) so the switch keeps its
 * keyboard and screen-reader behaviour for free.
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
        value ? 'bg-accent' : 'bg-[rgba(120,120,128,0.16)]'
      } ${disabled ? 'pointer-events-none opacity-45' : ''}`}
    >
      <span
        className="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-[left] duration-200"
        style={{ left: value ? 21 : 3 }}
      />
    </button>
  );
}
