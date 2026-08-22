import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  formatPrice,
  getSession,
  getShowById,
  toPersianNumber,
} from "@/lib/shows";
import { bookingStore } from "@/lib/bookings";
import { AppScreen, BackIcon, backButtonClass } from "@/components/AppScreen";
import { PrimaryButton, StickyBar } from "@/components/StickyBar";

export const Route = createFileRoute("/booking/$showId")({
  validateSearch: (search: Record<string, unknown>) => ({
    session: typeof search["session"] === "string" ? search["session"] : "",
    seats: typeof search["seats"] === "string" ? search["seats"] : "",
  }),
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
        content: "خلاصهٔ رزرو بلیت تئاتر: نمایش، سانس، سالن، صندلی‌ها و مبلغ کل.",
      },
      { property: "og:title", content: "خلاصهٔ رزرو | TheaterReserve" },
      {
        property: "og:description",
        content: "خلاصهٔ رزرو بلیت تئاتر پیش از تأیید.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingSummary,
});

function BookingSummary() {
  const { show } = Route.useLoaderData();
  const { session: sessionParam, seats: seatsParam } = Route.useSearch();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const session = getSession(show, sessionParam) ?? show.sessions[0]!;
  const seats = seatsParam.split(",").filter(Boolean);
  const total = show.price * seats.length;

  const confirm = () => {
    if (saving || seats.length === 0) return;
    setSaving(true);
    bookingStore.add({
      showId: show.id,
      showTitle: show.title,
      poster: show.poster,
      venue: show.venue,
      date: session.date,
      weekday: session.weekday,
      time: session.time,
      seats,
      unitPrice: show.price,
      total,
    });
    navigate({ to: "/tickets" });
  };

  return (
    <AppScreen
      title="خلاصهٔ رزرو"
      back={
        <Link
          to="/seats/$showId"
          params={{ showId: show.id }}
          search={{ session: session.id }}
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
              {session.weekday} {session.date} · {session.time}
            </p>
          </div>
        </div>

        <div className="divide-y divide-border rounded-2xl bg-card px-4">
          <Row label="صندلی‌ها" value={seats.join("، ") || "—"} />
          <Row label="تعداد بلیت" value={`${toPersianNumber(seats.length)} عدد`} />
          <Row label="قیمت هر بلیت" value={`${formatPrice(show.price)} تومان`} />
          <Row label="مبلغ کل" value={`${formatPrice(total)} تومان`} highlight />
        </div>
      </div>

      <StickyBar>
        <PrimaryButton disabled={seats.length === 0 || saving} onClick={confirm}>
          تأیید رزرو
        </PrimaryButton>
      </StickyBar>
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
