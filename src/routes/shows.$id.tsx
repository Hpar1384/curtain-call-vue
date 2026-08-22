import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { formatPrice, getShowById, toPersianNumber } from "@/lib/shows";
import { AppScreen, BackIcon, backButtonClass } from "@/components/AppScreen";
import { SessionPicker } from "@/components/SessionPicker";
import { PrimaryButton, StickyBar } from "@/components/StickyBar";

export const Route = createFileRoute("/shows/$id")({
  loader: ({ params }) => {
    const show = getShowById(params.id);
    if (!show) throw notFound();
    return { show };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "نمایش یافت نشد | TheaterReserve" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { show } = loaderData;
    return {
      meta: [
        { title: `${show.title} | TheaterReserve` },
        { name: "description", content: show.description },
        { property: "og:title", content: `${show.title} | TheaterReserve` },
        { property: "og:description", content: show.description },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: ShowDetail,
});

function ShowDetail() {
  const { show } = Route.useLoaderData();
  const navigate = useNavigate();
  const soldOut = show.availableSeats === 0;
  const [sessionId, setSessionId] = useState(show.sessions[0]!.id);

  return (
    <AppScreen
      title={show.title}
      back={
        <Link to="/" aria-label="بازگشت" className={backButtonClass}>
          <BackIcon />
        </Link>
      }
    >
      <img
        src={show.poster}
        alt={`پوستر نمایش ${show.title}`}
        width={768}
        height={1024}
        className="h-60 w-full object-cover"
      />

      <div className="space-y-5 px-5 pb-32 pt-5">
        <div>
          <h2 className="text-xl font-extrabold text-foreground">{show.title}</h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {show.venue} · {show.duration} · {show.ageRating}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {show.description}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">انتخاب سانس</p>
          <SessionPicker
            sessions={show.sessions}
            value={sessionId}
            onChange={setSessionId}
          />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {soldOut
              ? "تکمیل ظرفیت"
              : `${toPersianNumber(show.availableSeats)} صندلی آزاد`}
          </span>
          <span className="font-extrabold text-gold">
            {formatPrice(show.price)} تومان
          </span>
        </div>
      </div>

      <StickyBar>
        <PrimaryButton
          disabled={soldOut}
          onClick={() =>
            navigate({
              to: "/seats/$showId",
              params: { showId: show.id },
              search: { session: sessionId },
            })
          }
        >
          {soldOut ? "تکمیل ظرفیت" : "انتخاب صندلی"}
        </PrimaryButton>
      </StickyBar>
    </AppScreen>
  );
}
