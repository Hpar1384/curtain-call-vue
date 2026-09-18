import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { checkAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "پنل مدیریت | TheaterReserve" },
      {
        name: "description",
        content: "مدیریت نمایش‌ها، سالن‌ها، سانس‌ها و رزروهای تئاتر.",
      },
      { property: "og:title", content: "پنل مدیریت | TheaterReserve" },
      { property: "og:description", content: "مدیریت محتوای سامانهٔ رزرو تئاتر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

const tabs: { to: string; label: string; exact?: boolean }[] = [
  { to: "/admin", label: "داشبورد", exact: true },
  { to: "/admin/shows", label: "نمایش‌ها" },
  { to: "/admin/halls", label: "سالن‌ها" },
  { to: "/admin/sessions", label: "سانس‌ها" },
  { to: "/admin/bookings", label: "رزروها" },
  { to: "/admin/tickets", label: "بلیت‌ها" },
];

function AdminLayout() {
  const { data, isPending, error } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdmin(),
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isPending) {
    return <p className="p-8 text-sm text-muted-foreground">در حال بررسی دسترسی…</p>;
  }
  if (error || !data?.isAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-bold text-foreground">دسترسی مجاز نیست</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          این بخش فقط برای مدیران سامانه است.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm font-bold text-gold">
          بازگشت به خانه
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-extrabold text-foreground">پنل مدیریت</h1>
          <Link to="/" className="text-xs font-bold text-muted-foreground">
            اپ کاربر
          </Link>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}
