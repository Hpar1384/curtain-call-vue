import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminDeleteHall,
  adminListHalls,
  adminListTheaters,
  adminSaveHall,
} from "@/modules/admin/admin.functions";
import type { AdminHallDTO } from "@/modules/admin/admin-types";
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

export const Route = createFileRoute("/_authenticated/admin/halls")({
  component: AdminHalls,
});

type FormState = {
  id?: string;
  theater_id: string;
  name: string;
  rows_count: number;
  seats_per_row: number;
};

function AdminHalls() {
  const qc = useQueryClient();
  const halls = useQuery({ queryKey: ["admin-halls"], queryFn: () => adminListHalls() });
  const theaters = useQuery({
    queryKey: ["admin-theaters"],
    queryFn: () => adminListTheaters(),
  });
  const [form, setForm] = useState<FormState | null>(null);

  const save = useMutation({
    mutationFn: (values: FormState) => adminSaveHall({ data: values }),
    onSuccess: () => {
      toast.success("سالن ذخیره شد");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["admin-halls"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteHall({ data: { id } }),
    onSuccess: () => {
      toast.success("حذف شد");
      void qc.invalidateQueries({ queryKey: ["admin-halls"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (halls.isPending || theaters.isPending) return <Loading />;
  if (halls.error) return <ErrorNote message={halls.error.message} />;
  if (theaters.error) return <ErrorNote message={theaters.error.message} />;

  const startEdit = (h: AdminHallDTO) =>
    setForm({
      id: h.id,
      theater_id: h.theater_id,
      name: h.name,
      rows_count: h.rows_count,
      seats_per_row: h.seats_per_row,
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-foreground">سالن‌ها</h2>
        <button
          type="button"
          className={buttonClass}
          onClick={() =>
            setForm({
              theater_id: theaters.data[0]?.id ?? "",
              name: "",
              rows_count: 8,
              seats_per_row: 10,
            })
          }
        >
          سالن جدید
        </button>
      </div>

      {form && (
        <Card>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(form);
            }}
          >
            <Field label="نام سالن">
              <input
                required
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="مجموعه/تئاتر">
              <select
                required
                className={inputClass}
                value={form.theater_id}
                onChange={(e) => setForm({ ...form, theater_id: e.target.value })}
              >
                {theaters.data.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="تعداد ردیف (۱ تا ۲۰)">
              <input
                type="number"
                min={1}
                max={20}
                className={inputClass}
                value={form.rows_count}
                onChange={(e) => setForm({ ...form, rows_count: Number(e.target.value) })}
              />
            </Field>
            <Field label="صندلی در هر ردیف (۱ تا ۳۰)">
              <input
                type="number"
                min={1}
                max={30}
                className={inputClass}
                value={form.seats_per_row}
                onChange={(e) =>
                  setForm({ ...form, seats_per_row: Number(e.target.value) })
                }
              />
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              با ذخیره، چیدمان صندلی‌های این سالن دوباره ساخته می‌شود.
            </p>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className={buttonClass} disabled={save.isPending}>
                ذخیره
              </button>
              <button
                type="button"
                className={ghostButtonClass}
                onClick={() => setForm(null)}
              >
                انصراف
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {halls.data.map((h) => (
          <Card key={h.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold text-foreground">
                  {h.theaterName} — {h.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {toPersianNumber(h.rows_count)} ردیف ×{" "}
                  {toPersianNumber(h.seats_per_row)} صندلی
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => startEdit(h)}
                >
                  ویرایش چیدمان
                </button>
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => {
                    if (confirm(`سالن «${h.name}» حذف شود؟`)) remove.mutate(h.id);
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
