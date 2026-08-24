import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createBooking, getShow } from "@/lib/catalog.functions";
import {
  formatPrice,
  getSession,
  toPersianNumber,
  toShow,
} from "@/lib/shows";
import { bookingStore } from "@/lib/bookings";
import { AppScreen, BackIcon, backButtonClass } from "@/components/AppScreen";
import { PrimaryButton, StickyBar } from "@/components/StickyBar";

const showQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["show", slug],
    queryFn: () => getShow({ data: { slug } }),
  });

export const Route = createFileRoute("/booking/$showId")({
  validateSearch: (search: Record<string, unknown>) => ({
    session: typeof search["session"] === "string" ? search["session"] : "",
    seats: typeof search["seats"] === "string" ? search["seats"] : "",
  }),
  loader: async ({ params, context }) => {
    const show = await context.queryClient.ensureQueryData(
      showQueryOptions(params.showId),
    );
    if (!show) throw notFound();
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-muted-foreground">
      خطا در دریافت اطلاعات رزرو: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">نمایش یافت نشد.</div>
  ),
  head: () => ({
    meta: [
      { title: "خلاصهٔ رزرو | TheaterReserve" },
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
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingSummary,
});

function BookingSummary() {
  const { showId } = Route.useParams();
  const { session: sessionParam, seats: seatsParam } = Route.useSearch();
  const { data } = useSuspenseQuery(showQueryOptions(showId));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const show = toShow(data!);
  const session = getSession(show, sessionParam) ?? show.sessions[0]!;
  const seats = seatsParam.split(",").filter(Boolean);
  const total = show.price * seats.length;

  const confirm = async () => {
    if (saving || seats.length === 0) return;
    setSaving(true);
    try {
      const result = await createBooking({
        data: { slug: show.id, sessionId: session.id, seatIds: seats },
      });
      bookingStore.add({
        id: result.bookingId,
        showId: show.id,
        showTitle: show.title,
        poster: show.poster,
        venue: show.venue,
        date: session.date,
        weekday: session.weekday,
        time: session.time,
        seats,
        unitPrice: show.price,
        total: result.total,
      });
      await queryClient.invalidateQueries({ queryKey: ["seats", session.id] });
      navigate({ to: "/tickets" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "ثبت رزرو ناموفق بود",
      );
      setSaving(false);
    }
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
