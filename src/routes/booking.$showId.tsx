import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  MAX_TICKETS,
  MIN_TICKETS,
  formatPrice,
  getShowById,
  toPersianNumber,
} from "@/lib/shows";
import { AppScreen, BackIcon, backButtonClass } from "@/components/AppScreen";

export const Route = createFileRoute("/booking/$showId")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = Number(search["qty"]);
    const qty = Number.isFinite(raw)
      ? Math.min(MAX_TICKETS, Math.max(MIN_TICKETS, Math.trunc(raw)))
      : MIN_TICKETS;
    return { qty };
  },
  loader: ({ params }) => {
    const show = getShowById(params.showId);
    if (!show) throw notFound();
    return { show };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `رزرو ${loaderData.show.title} | TheaterReserve`
          : "رزرو | TheaterReserve",
      },
      {
        name: "description",
        content: "خلاصهٔ رزرو بلیت تئاتر: نمایش، سانس، سالن، تعداد بلیت و مبلغ کل.",
      },
      { property: "og:title", content: "خلاصهٔ رزرو | TheaterReserve" },
      {
        property: "og:description",
        content: "خلاصهٔ رزرو بلیت تئاتر پیش از پرداخت.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingSummary,
});

function BookingSummary() {
  const { show } = Route.useLoaderData();
  const { qty } = Route.useSearch();
  const [confirmed, setConfirmed] = useState(false);
  const total = show.price * qty;

  return (
    <AppScreen
      title="خلاصهٔ رزرو"
      back={
        <Link
          to="/shows/$id"
          params={{ id: show.id }}
          aria-label="بازگشت"
          className={backButtonClass}
        >
          <BackIcon />
        </Link>
      }
    >
      <div className="space-y-4 px-5 pb-40 pt-5">
        <div className="flex gap-3 rounded-2xl bg-card p-3">
          <img
            src={show.poster}
            alt={`پوستر نمایش ${show.title}`}
            loading="lazy"
            width={768}
            height={1024}
            className="h-24 w-16 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-foreground">
              {show.title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{show.venue}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {show.date} · {show.time}
            </p>
          </div>
        </div>

        <div className="divide-y divide-border rounded-2xl bg-card px-4">
          <Row label="تعداد بلیت" value={`${toPersianNumber(qty)} عدد`} />
          <Row label="قیمت هر بلیت" value={`${formatPrice(show.price)} تومان`} />
          <Row
            label="مبلغ کل"
            value={`${formatPrice(total)} تومان`}
            highlight
          />
        </div>

        {confirmed && (
          <p className="rounded-2xl bg-gold-soft px-4 py-3 text-center text-sm font-bold text-gold">
            رزرو شما ثبت شد. پرداخت در فاز بعدی فعال می‌شود.
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-background/95 px-5 py-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setConfirmed(true)}
          className="h-14 w-full rounded-2xl bg-primary text-base font-extrabold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          تأیید رزرو
        </button>
      </div>
    </AppScreen>
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
    <div className="flex items-center justify-between py-3.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          highlight ? "font-extrabold text-gold" : "font-bold text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
