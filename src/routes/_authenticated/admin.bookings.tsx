import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminCancelBooking, adminListBookings } from "@/modules/admin/admin.functions";
import { bookingFilterOf, type BookingFilter } from "@/modules/admin/admin-rules";
import { Card, ErrorNote, Loading, ghostButtonClass } from "@/components/admin/ui";
import { formatPrice, toPersianNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  component: AdminBookings,
});

const filters: { key: BookingFilter | "all"; label: string }[] = [
  { key: "all", label: "همه" },
  { key: "pending", label: "در انتظار" },
  { key: "paid", label: "پرداخت‌شده" },
  { key: "cancelled", label: "لغوشده" },
  { key: "expired", label: "منقضی" },
];

function AdminBookings() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<BookingFilter | "all">("all");
  const bookings = useQuery({ queryKey: ["admin-bookings"], queryFn: () => adminListBookings() });

  const cancel = useMutation({
    mutationFn: (id: string) => adminCancelBooking({ data: { id } }),
    onSuccess: () => {
      toast.success("رزرو لغو و صندلی‌ها آزاد شد");
      void qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (bookings.isPending) return <Loading />;
  if (bookings.error) return <ErrorNote message={bookings.error.message} />;

  const now = Date.now();
  const rows = bookings.data
    .map((b) => ({ ...b, bucket: bookingFilterOf(b.status, b.createdAt, now) }))
    .filter((b) => filter === "all" || b.bucket === filter);
  const label = Object.fromEntries(filters.map((f) => [f.key, f.label]));

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-extrabold text-foreground">رزروها</h2>
      <div className="flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
              filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">رزروی یافت نشد.</p>}
      {rows.map((b) => (
        <Card key={b.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">{b.showTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{b.session}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                صندلی: {b.seats.join("، ")} ({toPersianNumber(b.seatCount)} بلیت)
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                شماره: <span dir="ltr">{b.id.slice(0, 8)}</span> · کاربر: {b.userId.slice(0, 8)} ·{" "}
                {new Date(b.createdAt).toLocaleString("fa-IR")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-sm font-extrabold text-gold">{formatPrice(b.total)} تومان</span>
              <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-muted-foreground">
                {label[b.bucket]}
              </span>
              {b.bucket !== "cancelled" && (
                <button
                  type="button"
                  className={ghostButtonClass}
                  disabled={cancel.isPending}
                  onClick={() => {
                    if (confirm("رزرو لغو شود؟ بلیت‌های معتبر باطل و صندلی‌ها آزاد می‌شوند."))
                      cancel.mutate(b.id);
                  }}
                >
                  لغو رزرو
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
