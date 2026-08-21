import { createFileRoute } from "@tanstack/react-router";
import { getShows } from "@/lib/shows";
import { ShowCard } from "@/components/ShowCard";

export const Route = createFileRoute("/")({
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
    ],
  }),
  component: Index,
});

function Index() {
  const shows = getShows();

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
        <div className="mt-3 flex flex-col gap-3 pb-10">
          {shows.map((show) => (
            <ShowCard key={show.id} show={show} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default Index;
