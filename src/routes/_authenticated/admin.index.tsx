import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "@/lib/admin.functions";
import { toPersianNumber } from "@/lib/format";
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
    { label: "نمایش‌ها", value: data.shows },
    { label: "سانس‌ها", value: data.sessions },
    { label: "رزروها", value: data.bookings },
    { label: "کاربران", value: data.users },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((i) => (
        <Card key={i.label}>
          <p className="text-xs font-bold text-muted-foreground">{i.label}</p>
          <p className="mt-2 text-2xl font-extrabold text-gold">
            {toPersianNumber(i.value)}
          </p>
        </Card>
      ))}
    </div>
  );
}
