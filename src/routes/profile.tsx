import { createFileRoute } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { bookingStore } from "@/lib/bookings";
import { toPersianNumber } from "@/lib/shows";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/profile")({
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
    ],
  }),
  component: ProfileScreen,
});

function ProfileScreen() {
  const bookings = useSyncExternalStore(
    bookingStore.subscribe,
    bookingStore.getAll,
    () => [],
  );
  const tickets = bookings.reduce((n, b) => n + b.seats.length, 0);

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
          <div>
            <p className="text-base font-bold text-foreground">مهمان</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              ورود به حساب در مرحلهٔ بعد فعال می‌شود.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="رزروها" value={toPersianNumber(bookings.length)} />
          <Stat label="بلیت‌ها" value={toPersianNumber(tickets)} />
        </div>
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
