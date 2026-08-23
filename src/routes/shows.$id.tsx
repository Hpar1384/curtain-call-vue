import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getShow } from "@/lib/catalog.functions";
import { formatPrice, toPersianNumber, toShow } from "@/lib/shows";
import { AppScreen, BackIcon, backButtonClass } from "@/components/AppScreen";
import { SessionPicker } from "@/components/SessionPicker";
import { PrimaryButton, StickyBar } from "@/components/StickyBar";

export const showQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["show", slug],
    queryFn: () => getShow({ data: { slug } }),
  });

export const Route = createFileRoute("/shows/$id")({
  loader: async ({ params, context }) => {
    const show = await context.queryClient.ensureQueryData(
      showQueryOptions(params.id),
    );
    if (!show) throw notFound();
    return { title: show.title, description: show.description };
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-muted-foreground">
      خطا در دریافت نمایش: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">نمایش یافت نشد.</div>
  ),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "نمایش یافت نشد | TheaterReserve" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: `${loaderData.title} | TheaterReserve` },
        { name: "description", content: loaderData.description },
        { property: "og:title", content: `${loaderData.title} | TheaterReserve` },
        { property: "og:description", content: loaderData.description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ShowDetail,
});

function ShowDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(showQueryOptions(id));
  const navigate = useNavigate();
  const show = toShow(data!);
  const soldOut = show.availableSeats === 0;
  const [sessionId, setSessionId] = useState(show.sessions[0]?.id ?? "");

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
