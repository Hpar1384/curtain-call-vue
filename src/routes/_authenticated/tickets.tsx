import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listMyTickets } from "@/lib/payment.functions";
import { listMyBookings } from "@/lib/booking.functions";
import { ticketStatusLabel, type TicketDTO } from "@/lib/payment-types";
import { formatPrice } from "@/lib/shows";
import { posterFor } from "@/lib/booking-ui";
import { BottomNav } from "@/components/BottomNav";

const ticketsQueryOptions = queryOptions({
  queryKey: ["my-tickets"],
  queryFn: () => listMyTickets(),
});

const bookingsQueryOptions = queryOptions({
  queryKey: ["my-bookings"],
  queryFn: () => listMyBookings(),
});

export const Route = createFileRoute("/_authenticated/tickets")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(ticketsQueryOptions),
      context.queryClient.ensureQueryData(bookingsQueryOptions),
    ]);
  },
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
        content: "بلیت‌های دیجیتال تئاتر خود را ببین: معتبر، استفاده‌شده و لغوشده.",
      },
      { property: "og:title", content: "بلیت‌های من | TheaterReserve" },
      { property: "og:description", content: "فهرست بلیت‌های دیجیتال تئاتر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TicketsScreen,
});

const tabs: { key: TicketDTO["status"]; label: string }[] = [
  { key: "valid", label: "فعال" },
  { key: "used", label: "استفاده‌شده" },
  { key: "cancelled", label: "لغوشده" },
];

function TicketsScreen() {
  const { data: tickets } = useSuspenseQuery(ticketsQueryOptions);
  const { data: bookings } = useSuspenseQuery(bookingsQueryOptions);
  const [tab, setTab] = useState<TicketDTO["status"]>("valid");

  const filtered = tickets.filter((t) => t.status === tab);
  const unpaid = bookings.filter((b) => b.status === "awaiting_payment");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="flex items-center px-5 pb-2 pt-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          بلیت‌های من
        </h1>
      </header>

      <nav className="flex gap-2 px-5 pt-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "rounded-full px-4 py-1.5 text-xs font-bold transition-colors " +
              (tab === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-3 px-5 pb-28 pt-4">
        {unpaid.length > 0 && tab === "valid" && (
          <div className="rounded-2xl bg-card p-4">
            <p className="text-xs font-bold text-muted-foreground">
              در انتظار پرداخت
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {unpaid.map((b) => (
                <Link
                  key={b.id}
                  to="/payment/$bookingId"
                  params={{ bookingId: b.id }}
                  className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm font-bold text-foreground">
                    {b.showTitle}
                  </span>
                  <span className="shrink-0 text-xs font-extrabold text-gold">
                    {formatPrice(b.total)} تومان
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-card px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              بلیتی در این بخش وجود ندارد.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground"
            >
              دیدن نمایش‌ها
            </Link>
          </div>
        ) : (
          filtered.map((t) => (
            <Link
              key={t.id}
              to="/ticket/$ticketId"
              params={{ ticketId: t.id }}
              className="flex gap-3 rounded-2xl bg-card p-3 transition-colors hover:bg-card/70"
            >
              <img
                src={posterFor(t.posterKey)}
                alt={`پوستر نمایش ${t.showTitle}`}
                loading="lazy"
                className="h-24 w-16 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold text-foreground">
                  {t.showTitle}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.weekday} {t.date} · {t.time}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  صندلی: {t.seat}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-bold text-gold">
                    {ticketStatusLabel(t.status)}
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground" dir="ltr">
                    {t.code}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
