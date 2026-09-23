import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListSessions } from "@/modules/admin/admin.functions";
import { checkinRate } from "@/modules/admin/admin-rules";
import { Card, ErrorNote, Loading } from "@/components/admin/ui";
import { toPersianNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const sessions = useQuery({ queryKey: ["admin-sessions"], queryFn: () => adminListSessions() });
  if (sessions.isPending) return <Loading />;
  if (sessions.error) return <ErrorNote message={sessions.error.message} />;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-extrabold text-foreground">گزارش ورود هر سانس</h2>
      {sessions.data.map((s) => {
        const pct = checkinRate(s.ticketsTotal, s.checkedIn);
        return (
          <Card key={s.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-foreground">{s.showTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.label} · {s.hallName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  بلیت {toPersianNumber(s.ticketsTotal)} · واردشده {toPersianNumber(s.checkedIn)}
                </p>
              </div>
              <span className="text-lg font-extrabold text-gold">٪{toPersianNumber(pct)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
