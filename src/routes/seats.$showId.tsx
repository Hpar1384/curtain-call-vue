import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { formatPrice, getSession, getShowById, toPersianNumber } from "@/lib/shows";
import { MAX_SEATS, getSeatMap } from "@/lib/seats";
import { AppScreen, BackIcon, backButtonClass } from "@/components/AppScreen";
import { SeatMap } from "@/components/SeatMap";
import { PrimaryButton, StickyBar } from "@/components/StickyBar";

export const Route = createFileRoute("/seats/$showId")({
  validateSearch: (search: Record<string, unknown>) => ({
    session: typeof search["session"] === "string" ? search["session"] : "",
  }),
  loader: ({ params }) => {
    const show = getShowById(params.showId);
    if (!show) throw notFound();
    return { show };
  },
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
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SeatsScreen,
});

function SeatsScreen() {
  const { show } = Route.useLoaderData();
  const { session: sessionParam } = Route.useSearch();
  const navigate = useNavigate();

  const session = getSession(show, sessionParam) ?? show.sessions[0]!;
  const seats = useMemo(
    () => getSeatMap(show.id, session.id),
    [show.id, session.id],
  );
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : prev.length >= MAX_SEATS
          ? prev
          : [...prev, id],
    );

  const total = show.price * selected.length;

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
