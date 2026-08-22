import { createFileRoute, Link } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { bookingStore } from "@/lib/bookings";
import { formatPrice, toPersianNumber } from "@/lib/shows";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "بلیت‌های من | TheaterReserve" },
      {
        name: "description",
        content: "بلیت‌های رزروشدهٔ تئاتر خود را ببین: نمایش، سانس و صندلی‌ها.",
      },
      { property: "og:title", content: "بلیت‌های من | TheaterReserve" },
      {
        property: "og:description",
        content: "فهرست بلیت‌های رزروشدهٔ تئاتر.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TicketsScreen,
});

function TicketsScreen() {
  const bookings = useSyncExternalStore(
    bookingStore.subscribe,
    bookingStore.getAll,
    () => [],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="flex items-center px-5 pb-2 pt-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          بلیت‌های من
        </h1>
      </header>

      <div className="flex flex-col gap-3 px-5 pb-28 pt-3">
        {bookings.length === 0 ? (
          <div className="rounded-2xl bg-card px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">هنوز بلیتی نداری.</p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground"
            >
              دیدن نمایش‌ها
            </Link>
          </div>
        ) : (
          bookings.map((b) => (
            <article key={b.id} className="flex gap-3 rounded-2xl bg-card p-3">
              <img
                src={b.poster}
                alt={`پوستر نمایش ${b.showTitle}`}
                loading="lazy"
                className="h-24 w-16 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold text-foreground">
                  {b.showTitle}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {b.weekday} {b.date} · {b.time}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  صندلی: {b.seats.join("، ")}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-bold text-gold">
                    {toPersianNumber(b.seats.length)} بلیت
                  </span>
                  <span className="text-sm font-extrabold text-gold">
                    {formatPrice(b.total)} تومان
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
