import { useState } from "react";
import { AISLE_AFTER, type Seat } from "@/lib/seats";
import { formatPrice, toPersianNumber } from "@/lib/format";

const SECTION_LABEL: Record<Seat["section"], string> = { main: "سالن اصلی", balcony: "بالکن" };
const ZONE_LABEL: Record<Seat["zone"], string> = { standard: "عادی", vip: "VIP", economy: "اقتصادی" };
const ZONE_FREE: Record<Seat["zone"], string> = {
  standard: "bg-secondary text-muted-foreground",
  vip: "bg-secondary text-gold ring-1 ring-inset ring-gold/60",
  economy: "bg-secondary/60 text-muted-foreground",
};

export function SeatMap({
  seats,
  selected,
  onToggle,
  basePrice,
}: {
  seats: Seat[];
  selected: string[];
  onToggle: (id: string) => void;
  basePrice?: number;
}) {
  const [zoom, setZoom] = useState(1);
  const curved = seats[0]?.curved ?? false;
  const hasCustomAisles = seats.some((s) => s.aisleAfter);
  const isAisle = (s: Seat) => (hasCustomAisles ? s.aisleAfter : s.number === AISLE_AFTER);
  const sections = (["main", "balcony"] as const).filter((sec) => seats.some((s) => s.section === sec));

  const zones = (["vip", "standard", "economy"] as const)
    .map((z) => {
      const prices = seats.filter((s) => s.zone === z).map((s) => s.price ?? basePrice ?? 0);
      return prices.length ? { zone: z, price: Math.min(...prices) } : null;
    })
    .filter((x): x is { zone: Seat["zone"]; price: number } => x !== null);
  const showZones = zones.length > 1;

  return (
    <div className="space-y-4">
      <div className="mx-auto w-full max-w-xs">
        <div className="h-1.5 w-full rounded-full bg-gold/70 shadow-[0_0_28px_2px_var(--spotlight)]" />
        <p className="mt-2 text-center text-[11px] font-bold tracking-widest text-muted-foreground">صحنه</p>
      </div>

      <div className="overflow-x-auto pb-2 pt-3" dir="ltr">
        <div
          className="mx-auto w-max origin-top space-y-5 px-2 transition-transform"
          style={{ transform: `scale(${zoom})`, marginBottom: `${(zoom - 1) * 100}%` }}
          dir="rtl"
        >
          {sections.map((sec) => {
            const list = seats.filter((s) => s.section === sec);
            const rows = Array.from(new Set(list.map((s) => s.row)));
            return (
              <div key={sec} className="space-y-1.5">
                {sections.length > 1 && (
                  <p className="text-center text-[11px] font-bold text-muted-foreground">{SECTION_LABEL[sec]}</p>
                )}
                {rows.map((row, ri) => {
                  const rowSeats = list.filter((s) => s.row === row);
                  const mid = (rowSeats.length - 1) / 2 || 1;
                  return (
                    <div key={row} className="flex items-center justify-center gap-1">
                      <span className="w-4 text-center text-[10px] font-bold text-muted-foreground">{row}</span>
                      {rowSeats.map((seat, i) => {
                        const d = (i - mid) / mid;
                        const lift = curved ? -d * d * (6 + ri * 0.6) : 0;
                        return (
                          <SeatButton
                            key={seat.id}
                            seat={seat}
                            aisle={isAisle(seat)}
                            lift={lift}
                            selected={selected.includes(seat.id)}
                            onToggle={onToggle}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {seats.length > 120 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="کوچک‌نمایی"
            onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))}
            className="h-10 w-10 rounded-xl bg-card text-lg font-bold text-foreground"
          >
            −
          </button>
          <button
            type="button"
            aria-label="بزرگ‌نمایی"
            onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.2).toFixed(1)))}
            className="h-10 w-10 rounded-xl bg-card text-lg font-bold text-foreground"
          >
            +
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-[11px] text-muted-foreground">
        <Legend className="bg-secondary" label="آزاد" />
        <Legend className="bg-gold" label="انتخاب‌شده" />
        <Legend className="bg-muted opacity-40" label="رزروشده" />
      </div>
      {showZones && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
          {zones.map((z) => (
            <span key={z.zone} className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-muted-foreground">
              <span className={"h-3 w-3 rounded-[4px] " + ZONE_FREE[z.zone]} />
              {ZONE_LABEL[z.zone]} · {formatPrice(z.price)} تومان
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SeatButton({
  seat,
  selected,
  aisle,
  lift,
  onToggle,
}: {
  seat: Seat;
  selected: boolean;
  aisle: boolean;
  lift: number;
  onToggle: (id: string) => void;
}) {
  const reserved = seat.status === "reserved";
  return (
    <button
      type="button"
      aria-label={`صندلی ${seat.row}${toPersianNumber(seat.number)} ${ZONE_LABEL[seat.zone]}`}
      aria-pressed={selected}
      disabled={reserved}
      onClick={() => onToggle(seat.id)}
      style={{
        marginInlineEnd: aisle ? "0.75rem" : undefined,
        transform: lift ? `translateY(${lift}px)` : undefined,
      }}
      className={
        "h-[26px] w-[26px] shrink-0 rounded-md text-[10px] font-bold transition-transform active:scale-90 " +
        (reserved
          ? "cursor-not-allowed bg-muted text-muted-foreground opacity-40"
          : selected
            ? "bg-gold text-primary-foreground"
            : ZONE_FREE[seat.zone])
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
