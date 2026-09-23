import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminDeleteSession,
  adminListSessions,
  adminListShows,
  adminSaveSession,
} from "@/modules/admin/admin.functions";
import type { AdminSessionDTO } from "@/modules/admin/admin-types";
import {
  Card,
  ErrorNote,
  Field,
  Loading,
  buttonClass,
  ghostButtonClass,
  inputClass,
} from "@/components/admin/ui";
import { toPersianNumber } from "@/lib/format";
import { fromTehranLocalInput, sessionLabel, toTehranLocalInput } from "@/lib/session-time";

export const Route = createFileRoute("/_authenticated/admin/sessions")({
  component: AdminSessions,
});

type FormState = {
  id?: string;
  show_id: string;
  /** datetime-local value in Tehran time */
  starts_local: string;
  sort_order: number;
};

function AdminSessions() {
  const qc = useQueryClient();
  const sessions = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: () => adminListSessions(),
  });
  const shows = useQuery({ queryKey: ["admin-shows"], queryFn: () => adminListShows() });
  const [form, setForm] = useState<FormState | null>(null);

  const save = useMutation({
    mutationFn: ({ starts_local, ...values }: FormState) =>
      adminSaveSession({ data: { ...values, starts_at: fromTehranLocalInput(starts_local) } }),
    onSuccess: () => {
      toast.success("سانس ذخیره شد");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["admin-sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteSession({ data: { id } }),
    onSuccess: () => {
      toast.success("حذف شد");
      void qc.invalidateQueries({ queryKey: ["admin-sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (sessions.isPending || shows.isPending) return <Loading />;
  if (sessions.error) return <ErrorNote message={sessions.error.message} />;
  if (shows.error) return <ErrorNote message={shows.error.message} />;

  const startEdit = (s: AdminSessionDTO) =>
    setForm({
      id: s.id,
      show_id: s.show_id,
      starts_local: toTehranLocalInput(s.starts_at),
      sort_order: s.sort_order,
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-foreground">سانس‌ها</h2>
        <button
          type="button"
          className={buttonClass}
          onClick={() =>
            setForm({
              show_id: shows.data[0]?.id ?? "",
              starts_local: "",
              sort_order: 0,
            })
          }
        >
          سانس جدید
        </button>
      </div>

      {form && (
        <Card>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const current = form.id ? sessions.data.find((x) => x.id === form.id) : undefined;
              if (
                current &&
                current.activeBookings > 0 &&
                !confirm(
                  `این سانس ${current.activeBookings} رزرو فعال دارد. تغییر تاریخ/ساعت روی بلیت خریداران اثر می‌گذارد. ادامه می‌دهید؟`,
                )
              )
                return;
              save.mutate(form);
            }}
          >
            <Field label="نمایش (سالن از روی نمایش تعیین می‌شود)">
              <select
                required
                className={inputClass}
                value={form.show_id}
                onChange={(e) => setForm({ ...form, show_id: e.target.value })}
              >
                {shows.data.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} — {s.hallName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="تاریخ و ساعت شروع (به وقت تهران)">
              <input
                required
                type="datetime-local"
                dir="ltr"
                className={inputClass}
                value={form.starts_local}
                onChange={(e) => setForm({ ...form, starts_local: e.target.value })}
              />
              {form.starts_local && (
                <span className="text-[11px] font-normal">
                  {sessionLabel(fromTehranLocalInput(form.starts_local))}
                </span>
              )}
            </Field>
            <Field label="ترتیب نمایش">
              <input
                type="number"
                className={inputClass}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className={buttonClass} disabled={save.isPending}>
                ذخیره
              </button>
              <button type="button" className={ghostButtonClass} onClick={() => setForm(null)}>
                انصراف
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {sessions.data.map((s) => (
          <Card key={s.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold text-foreground">{s.showTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.label} · {s.hallName}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ظرفیت {toPersianNumber(s.capacity)} · فروخته‌شده {toPersianNumber(s.ticketsTotal)}{" "}
                  · رزرو فعال {toPersianNumber(s.activeBookings)}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={ghostButtonClass} onClick={() => startEdit(s)}>
                  ویرایش
                </button>
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => {
                    if (s.activeBookings > 0 || s.ticketsTotal > 0) {
                      toast.error("این سانس رزرو دارد و قابل حذف نیست");
                      return;
                    }
                    if (confirm("این سانس حذف شود؟")) remove.mutate(s.id);
                  }}
                >
                  حذف
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
