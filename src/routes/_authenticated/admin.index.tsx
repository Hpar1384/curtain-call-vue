import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "@/modules/admin/admin.functions";
import { formatPrice, toPersianNumber } from "@/lib/format";
import { Card, ErrorNote, Loading } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getAdminStats(),
  });

  if (isPending) return <Loading />;
  if (error) return <ErrorNote message={error.message} />;

  const items = [
    { label: "نمایش‌های فعال", value: toPersianNumber(data.activeShows) },
    { label: "سانس‌های آینده", value: toPersianNumber(data.upcomingSessions) },
    { label: "رزروهای امروز", value: toPersianNumber(data.bookingsToday) },
    { label: "بلیت‌های فروخته‌شده", value: toPersianNumber(data.ticketsSold) },
    { label: "ورود امروز", value: toPersianNumber(data.checkinsToday) },
    { label: "درآمد کل (تومان)", value: formatPrice(data.revenue) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((i) => (
        <Card key={i.label}>
          <p className="text-xs font-bold text-muted-foreground">{i.label}</p>
          <p className="mt-2 text-2xl font-extrabold text-gold">{i.value}</p>
        </Card>
      ))}
    </div>
  );
}
