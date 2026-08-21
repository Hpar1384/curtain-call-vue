import { Link } from "@tanstack/react-router";
import { formatPrice, toPersianNumber, type Show } from "@/lib/shows";

export function ShowCard({ show }: { show: Show }) {
  const soldOut = show.availableSeats === 0;

  return (
    <Link
      to="/shows/$id"
      params={{ id: show.id }}
      className="flex gap-3 rounded-2xl bg-card p-3 transition-transform active:scale-[0.98]"
    >
      <img
        src={show.poster}
        alt={`پوستر نمایش ${show.title}`}
        loading="lazy"
        width={768}
        height={1024}
        className="h-28 w-20 shrink-0 rounded-xl object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <h3 className="truncate text-base font-bold text-foreground">
            {show.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {show.date} · {show.time}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {show.venue}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-gold">
            {formatPrice(show.price)}
            <span className="mr-1 text-[11px] font-medium text-muted-foreground">
              تومان
            </span>
          </span>
          <span
            className={
              "rounded-full px-2.5 py-1 text-[11px] font-bold " +
              (soldOut
                ? "bg-muted text-muted-foreground"
                : "bg-gold-soft text-gold")
            }
          >
            {soldOut
              ? "تکمیل"
              : `${toPersianNumber(show.availableSeats)} صندلی`}
          </span>
        </div>
      </div>
    </Link>
  );
}
