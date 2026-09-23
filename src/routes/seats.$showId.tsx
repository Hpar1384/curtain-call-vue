import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getSeatMap, getShow } from "@/lib/catalog.functions";
import { formatPrice, getSession, toPersianNumber, toShow } from "@/lib/shows";
import { MAX_SEATS } from "@/lib/seats";
import { AppScreen, BackIcon, backButtonClass } from "@/components/AppScreen";
import { SeatMap } from "@/components/SeatMap";
import { PrimaryButton, StickyBar } from "@/components/StickyBar";

const showQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["show", slug],
    queryFn: () => getShow({ data: { slug } }),
  });

const seatsQueryOptions = (sessionId: string) =>
  queryOptions({
    queryKey: ["seats", sessionId],
    queryFn: () => getSeatMap({ data: { sessionId } }),
    enabled: sessionId !== "",
  });

export const Route = createFileRoute("/seats/$showId")({
  validateSearch: (search: Record<string, unknown>) => ({
    session: typeof search["session"] === "string" ? search["session"] : "",
  }),
  loader: async ({ params, context }) => {
    const show = await context.queryClient.ensureQueryData(
      showQueryOptions(params.showId),
    );
    if (!show) throw notFound();
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-muted-foreground">
      خطا در دریافت صندلی‌ها: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">نمایش یافت نشد.</div>
  ),
  head: () => ({
    meta: [
      { title: "انتخاب صندلی | TheaterReserve" },
      {
        name: "description",
        content: "نقشهٔ سالن را ببین و صندلی‌های موردنظرت را انتخاب کن.",
      },
      { property: "og:title", content: "انتخاب صندلی | TheaterReserve" },
      { property: "og:description", content: "انتخاب صندلی برای رزرو بلیت تئاتر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SeatsScreen,
});

function SeatsScreen() {
  const { showId } = Route.useParams();
  const { session: sessionParam } = Route.useSearch();
  const { data } = useSuspenseQuery(showQueryOptions(showId));
  const navigate = useNavigate();

  const show = toShow(data!);
  const session = getSession(show, sessionParam) ?? show.sessions[0]!;
  const { data: seats } = useSuspenseQuery(seatsQueryOptions(session.id));
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : prev.length >= MAX_SEATS
          ? prev
          : [...prev, id],
    );

  const priceOf = new Map(seats.map((s) => [s.id, s.price ?? show.price]));
  const total = selected.reduce((sum, id) => sum + (priceOf.get(id) ?? show.price), 0);

  return (
    <AppScreen
      title="انتخاب صندلی"
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
      <div className="space-y-5 px-5 pb-40 pt-5">
        <p className="text-center text-xs text-muted-foreground">
          {session.weekday} {session.date} · {session.time}
        </p>
        <SeatMap seats={seats} selected={selected} onToggle={toggle} />
      </div>

      <StickyBar>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {toPersianNumber(selected.length)} صندلی
          </span>
          <span className="font-extrabold text-gold">
            {formatPrice(total)} تومان
          </span>
        </div>
        <PrimaryButton
          disabled={selected.length === 0}
          onClick={() =>
            navigate({
              to: "/booking/$showId",
              params: { showId: show.id },
              search: { session: session.id, seats: selected.join(",") },
            })
          }
        >
          ادامه رزرو
        </PrimaryButton>
      </StickyBar>
    </AppScreen>
  );
}
