import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { listMyBookings } from "@/lib/booking.functions";
import { toPersianNumber } from "@/lib/shows";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";

const bookingsQueryOptions = queryOptions({
  queryKey: ["my-bookings"],
  queryFn: () => listMyBookings(),
});

export const Route = createFileRoute("/_authenticated/profile")({
  loader: ({ context }) => context.queryClient.ensureQueryData(bookingsQueryOptions),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-muted-foreground">
      خطا در دریافت پروفایل: {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">چیزی یافت نشد.</div>
  ),
  head: () => ({
    meta: [
      { title: "پروفایل | TheaterReserve" },
      {
        name: "description",
        content: "حساب کاربری و خلاصهٔ فعالیت رزرو بلیت تئاتر شما.",
      },
      { property: "og:title", content: "پروفایل | TheaterReserve" },
      { property: "og:description", content: "حساب کاربری در TheaterReserve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfileScreen,
});

function ProfileScreen() {
  const { data: bookings } = useSuspenseQuery(bookingsQueryOptions);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const tickets = bookings.reduce((n, b) => n + b.seats.length, 0);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: "" }, replace: true });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="flex items-center px-5 pb-2 pt-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          پروفایل
        </h1>
      </header>

      <div className="space-y-4 px-5 pb-28 pt-3">
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-soft text-2xl">
            🎭
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-foreground" dir="ltr">
              {user?.email ?? "کاربر"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              حساب کاربری فعال
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="رزروها" value={toPersianNumber(bookings.length)} />
          <Stat label="بلیت‌ها" value={toPersianNumber(tickets)} />
        </div>

        <button
          onClick={signOut}
          className="w-full rounded-2xl bg-card py-3.5 text-sm font-extrabold text-destructive"
        >
          خروج از حساب
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card px-4 py-4 text-center">
      <p className="text-xl font-extrabold text-gold">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
