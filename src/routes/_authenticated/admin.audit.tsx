import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListAuditLogs } from "@/modules/admin/admin.functions";
import { auditLabel } from "@/modules/admin/admin-rules";
import { Card, ErrorNote, Loading } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AdminAudit,
});

function describe(details: Record<string, string | number | boolean | null>): string {
  if ("from" in details) return `${String(details["from"])} ← ${String(details["to"])}`;
  return Object.values(details)
    .filter((v) => v !== null && v !== undefined && typeof v !== "object")
    .map(String)
    .join(" · ");
}

function AdminAudit() {
  const logs = useQuery({ queryKey: ["admin-audit"], queryFn: () => adminListAuditLogs() });
  if (logs.isPending) return <Loading />;
  if (logs.error) return <ErrorNote message={logs.error.message} />;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-extrabold text-foreground">گزارش فعالیت</h2>
      {logs.data.length === 0 && (
        <p className="text-sm text-muted-foreground">هنوز فعالیتی ثبت نشده است.</p>
      )}
      {logs.data.map((l) => (
        <Card key={l.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">
                {auditLabel(l.entity, l.action)}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{describe(l.details)}</p>
            </div>
            <div className="text-end text-[11px] text-muted-foreground">
              <p dir="ltr">{l.actor}</p>
              <p>{new Date(l.createdAt).toLocaleString("fa-IR")}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
