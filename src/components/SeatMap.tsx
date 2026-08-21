import { AISLE_AFTER, type Seat } from "@/lib/seats";
import { toPersianNumber } from "@/lib/shows";

export function SeatMap({
  seats,
  selected,
  onToggle,
}: {
  seats: Seat[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const rows = Array.from(new Set(seats.map((s) => s.row)));

  return (
    <div className="space-y-4">
      <div className="mx-auto w-full max-w-xs">
        <div className="h-1.5 w-full rounded-full bg-gold/70 shadow-[0_0_28px_2px_var(--spotlight)]" />
        <p className="mt-2 text-center text-[11px] font-bold tracking-widest text-muted-foreground">
          صحنه
        </p>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        {rows.map((row) => (
          <div key={row} className="flex items-center gap-1.5">
            <span className="w-4 text-center text-[10px] font-bold text-muted-foreground">
              {row}
            </span>
            {seats
              .filter((s) => s.row === row)
              .map((seat) => (
                <SeatButton
                  key={seat.id}
                  seat={seat}
                  selected={selected.includes(seat.id)}
                  onToggle={onToggle}
                />
              ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 pt-1 text-[11px] text-muted-foreground">
        <Legend className="bg-secondary" label="آزاد" />
        <Legend className="bg-gold" label="انتخاب‌شده" />
        <Legend className="bg-muted opacity-40" label="رزروشده" />
      </div>
    </div>
  );
}

function SeatButton({
  seat,
  selected,
  onToggle,
}: {
  seat: Seat;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const reserved = seat.status === "reserved";
  return (
    <button
      type="button"
      aria-label={`صندلی ${seat.row}${toPersianNumber(seat.number)}`}
      aria-pressed={selected}
      disabled={reserved}
      onClick={() => onToggle(seat.id)}
      style={seat.number === AISLE_AFTER ? { marginInlineEnd: "0.75rem" } : undefined}
      className={
        "h-7 w-7 rounded-md text-[10px] font-bold transition-transform active:scale-90 " +
        (reserved
          ? "cursor-not-allowed bg-muted text-muted-foreground opacity-40"
          : selected
            ? "bg-gold text-primary-foreground"
            : "bg-secondary text-muted-foreground")
      }
    >
      {toPersianNumber(seat.number)}
    </button>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={"h-3 w-3 rounded-[4px] " + className} />
      {label}
    </span>
  );
}
