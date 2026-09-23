import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminListUsers, adminSetUserRole } from "@/modules/admin/admin.functions";
import { Card, ErrorNote, Loading, inputClass } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

const roleOptions = [
  { role: "admin", label: "مدیر" },
  { role: "checkin_operator", label: "اپراتور ورود" },
] as const;

function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => adminListUsers() });

  const setRole = useMutation({
    mutationFn: (v: { userId: string; role: "admin" | "checkin_operator"; enabled: boolean }) =>
      adminSetUserRole({ data: v }),
    onSuccess: () => {
      toast.success("نقش به‌روز شد");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (users.isPending) return <Loading />;
  if (users.error) return <ErrorNote message={users.error.message} />;

  const needle = q.trim().toLowerCase();
  const rows = users.data.filter(
    (u) => !needle || u.email.toLowerCase().includes(needle) || u.name.toLowerCase().includes(needle),
  );

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-extrabold text-foreground">کاربران و نقش‌ها</h2>
      <input
        aria-label="جستجوی ایمیل یا نام"
        placeholder="جستجوی ایمیل یا نام"
        className={`${inputClass} sm:max-w-xs`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {rows.length === 0 && <p className="text-sm text-muted-foreground">کاربری یافت نشد.</p>}
      {rows.map((u) => (
        <Card key={u.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-foreground" dir="ltr">
                {u.email || "—"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {u.name ? `${u.name} · ` : ""}عضویت {new Date(u.createdAt).toLocaleDateString("fa-IR")}
                {u.isSelf ? " · حساب شما" : ""}
              </p>
            </div>
            <div className="flex gap-3">
              {roleOptions.map((r) => {
                const on = u.roles.includes(r.role);
                const locked = u.isSelf && r.role === "admin";
                return (
                  <label key={r.role} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={setRole.isPending || locked}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        if (enabled && r.role === "admin" && !confirm(`دسترسی مدیریت کامل به ${u.email} داده شود؟`))
                          return;
                        setRole.mutate({ userId: u.id, role: r.role, enabled });
                      }}
                    />
                    {r.label}
                  </label>
                );
              })}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
