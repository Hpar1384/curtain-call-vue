import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getMyBooking } from "@/lib/booking.functions";
import { getBookingTickets } from "@/lib/payment.functions";
import { formatPrice, toPersianNumber } from "@/lib/shows";
import { posterFor, statusLabel } from "@/lib/booking-ui";

const bookingQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["my-booking", id],
    queryFn: () => getMyBooking({ data: { id } }),
  });

export const Route = createFileRoute("/_authenticated/confirmation/$bookingId")({
  loader: async ({ params, context }) => {
    const booking = await context.queryClient.ensureQueryData(
      bookingQueryOptions(params.bookingId),
    );
    if (!booking) throw notFound();
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-muted-foreground">
      خطا در دریافت رزرو: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">رزرو یافت نشد.</div>
  ),
  head: () => ({
    meta: [
      { title: "رزرو موفق | TheaterReserve" },
      {
        name: "description",
        content: "رسید رزرو بلیت تئاتر شما همراه با شناسهٔ پیگیری و صندلی‌ها.",
      },
      { property: "og:title", content: "رزرو موفق | TheaterReserve" },
      { property: "og:description", content: "رسید رزرو بلیت تئاتر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmationScreen,
});

function ConfirmationScreen() {
  const { bookingId } = Route.useParams();
  const { data } = useSuspenseQuery(bookingQueryOptions(bookingId));
  const b = data!;
  const trackingCode = b.id.split("-")[0]!.toUpperCase();
  const tickets = useQuery({
    queryKey: ["booking-tickets", bookingId],
    queryFn: () => getBookingTickets({ data: { bookingId } }),
    enabled: b.status === "confirmed",
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <div className="px-5 pb-10 pt-10 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold-soft text-4xl">
          ✓
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">
          {b.status === "confirmed"
            ? "پرداخت موفق و بلیت‌ها صادر شد"
            : b.status === "cancelled"
              ? "این رزرو لغو شده است"
              : "رزرو در انتظار پرداخت"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          شناسهٔ پیگیری:{" "}
          <span className="font-extrabold text-gold" dir="ltr">
            {trackingCode}
          </span>
        </p>
      </div>

      <div className="space-y-4 px-5 pb-28">
        <div className="flex gap-3 rounded-2xl bg-card p-3">
          <img
            src={posterFor(b.posterKey)}
            alt={`پوستر نمایش ${b.showTitle}`}
            loading="lazy"
            className="h-24 w-16 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-foreground">
              {b.showTitle}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{b.venue}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.weekday} {b.date} · {b.time}
            </p>
          </div>
        </div>

        <div className="divide-y divide-border rounded-2xl bg-card px-4">
          <Row label="وضعیت" value={statusLabel(b.status)} />
          <Row label="صندلی‌ها" value={b.seats.join("، ") || "—"} />
          <Row
            label="تعداد بلیت"
            value={`${toPersianNumber(b.seats.length)} عدد`}
          />
          <Row
            label="مبلغ کل"
            value={`${formatPrice(b.total)} تومان`}
            highlight
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/tickets"
            className="rounded-2xl bg-primary py-3.5 text-center text-sm font-extrabold text-primary-foreground"
          >
            بلیت‌های من
          </Link>
          <Link
            to="/"
            className="rounded-2xl bg-card py-3.5 text-center text-sm font-extrabold text-foreground"
          >
            صفحهٔ اصلی
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={
          "truncate " +
          (highlight ? "font-extrabold text-gold" : "font-bold text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}
