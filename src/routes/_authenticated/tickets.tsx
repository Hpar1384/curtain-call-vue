import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listMyBookings } from "@/lib/booking.functions";
import { formatPrice, toPersianNumber } from "@/lib/shows";
import { posterFor, statusLabel } from "@/lib/booking-ui";
import { BottomNav } from "@/components/BottomNav";

const bookingsQueryOptions = queryOptions({
  queryKey: ["my-bookings"],
  queryFn: () => listMyBookings(),
});

export const Route = createFileRoute("/_authenticated/tickets")({
  loader: ({ context }) => context.queryClient.ensureQueryData(bookingsQueryOptions),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-muted-foreground">
      خطا در دریافت بلیت‌ها: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">چیزی یافت نشد.</div>
  ),
  head: () => ({
    meta: [
      { title: "بلیت‌های من | TheaterReserve" },
      {
        name: "description",
        content: "بلیت‌های رزروشدهٔ تئاتر خود را ببین: نمایش، سانس و صندلی‌ها.",
      },
      { property: "og:title", content: "بلیت‌های من | TheaterReserve" },
      { property: "og:description", content: "فهرست بلیت‌های رزروشدهٔ تئاتر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TicketsScreen,
});

function TicketsScreen() {
  const { data: bookings } = useSuspenseQuery(bookingsQueryOptions);

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
            <Link
              key={b.id}
              to="/confirmation/$bookingId"
              params={{ bookingId: b.id }}
              className="flex gap-3 rounded-2xl bg-card p-3 transition-colors hover:bg-card/70"
            >
              <img
                src={posterFor(b.posterKey)}
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
                    {statusLabel(b.status)}
                  </span>
                  <span className="text-sm font-extrabold text-gold">
                    {formatPrice(b.total)} تومان
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {toPersianNumber(b.seats.length)} بلیت
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
