import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListTickets } from "@/modules/admin/admin.functions";
import { Card, ErrorNote, Loading } from "@/components/admin/ui";
import { ticketStatusLabel } from "@/lib/payment-types";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  component: AdminTickets,
});

function AdminTickets() {
  const tickets = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: () => adminListTickets(),
  });

  if (tickets.isPending) return <Loading />;
  if (tickets.error) return <ErrorNote message={tickets.error.message} />;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-extrabold text-foreground">بلیت‌ها</h2>
      {tickets.data.length === 0 && (
        <p className="text-sm text-muted-foreground">هنوز بلیتی صادر نشده است.</p>
      )}
      {tickets.data.map((t) => (
        <Card key={t.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">{t.showTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.session}</p>
              <p className="mt-1 text-xs text-muted-foreground">صندلی: {t.seat}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                کاربر: {t.userId.slice(0, 8)} · کد:{" "}
                <span dir="ltr">{t.code}</span> ·{" "}
                {new Date(t.createdAt).toLocaleDateString("fa-IR")}
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-muted-foreground">
              {ticketStatusLabel(t.status)}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
