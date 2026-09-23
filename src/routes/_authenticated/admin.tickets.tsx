import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminCancelTicket,
  adminListTickets,
  adminManualCheckin,
} from "@/modules/admin/admin.functions";
import {
  Card,
  ErrorNote,
  Loading,
  buttonClass,
  ghostButtonClass,
  inputClass,
} from "@/components/admin/ui";
import { ticketStatusLabel } from "@/lib/payment-types";
import { checkinFailureLabel, type CheckinFailureCode } from "@/modules/checkin/checkin-types";

export const Route = createFileRoute("/_authenticated/admin/tickets")({
  component: AdminTickets,
});

function AdminTickets() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"all" | "valid" | "used" | "cancelled">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const tickets = useQuery({ queryKey: ["admin-tickets"], queryFn: () => adminListTickets() });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-tickets"] });

  const cancel = useMutation({
    mutationFn: (id: string) => adminCancelTicket({ data: { id } }),
    onSuccess: () => {
      toast.success("بلیت لغو شد");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkin = useMutation({
    mutationFn: (c: string) => adminManualCheckin({ data: { code: c } }),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success("ورود ثبت شد");
        setCode("");
        refresh();
      } else toast.error(checkinFailureLabel(r.code as CheckinFailureCode));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (tickets.isPending) return <Loading />;
  if (tickets.error) return <ErrorNote message={tickets.error.message} />;

  const PAGE = 30;
  const needle = q.trim().toLowerCase();
  const filtered = tickets.data.filter(
    (t) =>
      (status === "all" || t.status === status) &&
      (!needle ||
        t.code.toLowerCase().includes(needle) ||
        t.userEmail.toLowerCase().includes(needle)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE, current * PAGE + PAGE);
  const statusFilters = [
    { key: "all", label: "همه" },
    { key: "valid", label: "معتبر" },
    { key: "used", label: "استفاده‌شده" },
    { key: "cancelled", label: "لغوشده" },
  ] as const;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-extrabold text-foreground">بلیت‌ها</h2>
      <Card>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) checkin.mutate(code.trim());
          }}
        >
          <input
            dir="ltr"
            aria-label="کد بلیت برای ورود دستی"
            placeholder="کد بلیت برای ورود دستی"
            className={inputClass}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" className={buttonClass} disabled={checkin.isPending}>
            ثبت ورود
          </button>
        </form>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setStatus(f.key);
              setPage(0);
            }}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
              status === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          aria-label="جستجوی کد بلیت یا ایمیل"
          placeholder="جستجوی کد بلیت یا ایمیل"
          className={`${inputClass} sm:max-w-xs`}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
      </div>
      {visible.length === 0 && <p className="text-sm text-muted-foreground">بلیتی یافت نشد.</p>}
      {visible.map((t) => (
        <Card key={t.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-foreground">{t.showTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.session}</p>
              <p className="mt-1 text-xs text-muted-foreground">صندلی: {t.seat}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                کاربر: <span dir="ltr">{t.userEmail}</span> · کد: <span dir="ltr">{t.code}</span> ·{" "}
                {new Date(t.createdAt).toLocaleDateString("fa-IR")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-muted-foreground">
                {ticketStatusLabel(t.status)}
              </span>
              {t.status === "valid" && (
                <button
                  type="button"
                  className={ghostButtonClass}
                  disabled={cancel.isPending}
                  onClick={() => {
                    if (confirm("این بلیت لغو و صندلی آزاد شود؟")) cancel.mutate(t.id);
                  }}
                >
                  لغو بلیت
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2 text-xs text-muted-foreground">
          <button
            type="button"
            className={ghostButtonClass}
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            قبلی
          </button>
          صفحه {(current + 1).toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}
          <button
            type="button"
            className={ghostButtonClass}
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  );
}
