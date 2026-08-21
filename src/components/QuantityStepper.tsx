import { toPersianNumber } from "@/lib/shows";

export function QuantityStepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-card p-2">
      <StepButton
        label="کاهش"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </StepButton>
      <span className="min-w-14 text-center text-2xl font-extrabold text-foreground">
        {toPersianNumber(value)}
      </span>
      <StepButton
        label="افزایش"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </StepButton>
    </div>
  );
}

function StepButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-2xl font-bold text-foreground transition-all active:scale-95 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
