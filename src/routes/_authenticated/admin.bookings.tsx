import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminListBookings, adminUpdateBookingStatus } from "@/modules/admin/admin.functions";
import type { AdminBookingDTO } from "@/modules/admin/admin-types";
import { Card, ErrorNote, Loading, inputClass } from "@/components/admin/ui";
import { formatPrice, toPersianNumber } from "@/lib/format";
import { statusLabel } from "@/lib/booking-ui";

export const Route = createFileRoute("/_authenticated/admin/bookings")({
  component: AdminBookings,
});

const statuses: AdminBookingDTO["status"][] = ["pending", "confirmed", "cancelled"];

function AdminBookings() {
  const qc = useQueryClient();
  const bookings = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => adminListBookings(),
  });

  const update = useMutation({
    mutationFn: (v: { id: string; status: AdminBookingDTO["status"] }) =>
      adminUpdateBookingStatus({ data: v }),
    onSuccess: () => {
      toast.success("وضعیت به‌روزرسانی شد");
      void qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (bookings.isPending) return <Loading />;
  if (bookings.error) return <ErrorNote message={bookings.error.message} />;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-extrabold text-foreground">رزروها</h2>
      {bookings.data.length === 0 && (
        <p className="text-sm text-muted-foreground">هنوز رزروی ثبت نشده است.</p>
      )}
      {bookings.data.map((b) => (
        <Card key={b.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">{b.showTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{b.session}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                صندلی: {b.seats.join("، ")} ({toPersianNumber(b.seatCount)} بلیت)
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                کاربر: {b.userId.slice(0, 8)} · کد: {b.id.slice(0, 8)} ·{" "}
                {new Date(b.createdAt).toLocaleDateString("fa-IR")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-sm font-extrabold text-gold">
                {formatPrice(b.total)} تومان
              </span>
              <select
                aria-label={`وضعیت رزرو ${b.showTitle}`}
                className={inputClass}
                value={b.status}
                disabled={update.isPending}
                onChange={(e) =>
                  update.mutate({
                    id: b.id,
                    status: e.target.value as AdminBookingDTO["status"],
                  })
                }
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
