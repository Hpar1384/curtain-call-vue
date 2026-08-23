import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listShows } from "@/lib/catalog.functions";
import { toShow } from "@/lib/shows";
import { ShowCard } from "@/components/ShowCard";
import { BottomNav } from "@/components/BottomNav";

const showsQueryOptions = queryOptions({
  queryKey: ["shows"],
  queryFn: () => listShows(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(showsQueryOptions);
  },
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-muted-foreground">
      خطا در دریافت نمایش‌ها: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">نمایشی یافت نشد.</div>
  ),
  head: () => ({
    meta: [
      { title: "TheaterReserve | رزرو بلیت تئاتر" },
      {
        name: "description",
        content:
          "اپلیکیشن رزرو بلیت تئاتر؛ نمایش‌های در حال اجرا را ببین و در چند ثانیه بلیت بگیر.",
      },
      { property: "og:title", content: "TheaterReserve | رزرو بلیت تئاتر" },
      {
        property: "og:description",
        content: "نمایش‌های در حال اجرا را ببین و در چند ثانیه بلیت بگیر.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(showsQueryOptions);
  const shows = data.map(toShow);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="flex items-center justify-between px-5 pb-2 pt-7">
        <div>
          <p className="text-xs text-muted-foreground">سلام 👋</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
            Theater<span className="text-gold">Reserve</span>
          </h1>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-soft text-xl">
          🎭
        </span>
      </header>

      <section className="px-5 pt-4">
        <h2 className="text-sm font-bold text-muted-foreground">
          نمایش‌های در حال اجرا
        </h2>
        <div className="mt-3 flex flex-col gap-3 pb-28">
          {shows.map((show) => (
            <ShowCard key={show.id} show={show} />
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}

export default Index;
