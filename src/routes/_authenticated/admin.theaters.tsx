import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminDeleteTheater,
  adminListTheatersFull,
  adminSaveTheater,
} from "@/modules/admin/admin.functions";
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

export const Route = createFileRoute("/_authenticated/admin/theaters")({
  component: AdminTheaters,
});

type FormState = { id?: string; name: string; city: string };

function AdminTheaters() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin-theaters"], queryFn: () => adminListTheatersFull() });
  const [form, setForm] = useState<FormState | null>(null);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-theaters"] });
    void qc.invalidateQueries({ queryKey: ["admin-halls"] });
  };

  const save = useMutation({
    mutationFn: (v: FormState) => adminSaveTheater({ data: v }),
    onSuccess: () => {
      toast.success("ذخیره شد");
      setForm(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteTheater({ data: { id } }),
    onSuccess: () => {
      toast.success("حذف شد");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (list.isPending) return <Loading />;
  if (list.error) return <ErrorNote message={list.error.message} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-foreground">تئاترها</h2>
        <button type="button" className={buttonClass} onClick={() => setForm({ name: "", city: "تهران" })}>
          تئاتر جدید
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
            <Field label="نام">
              <input
                required
                maxLength={120}
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="شهر">
              <input
                required
                maxLength={80}
                className={inputClass}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
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
        {list.data.map((t) => (
          <Card key={t.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold text-foreground">{t.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.city} · {toPersianNumber(t.hallCount)} سالن
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => setForm({ id: t.id, name: t.name, city: t.city })}
                >
                  ویرایش
                </button>
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => {
                    if (t.hallCount > 0) {
                      toast.error("این تئاتر سالن دارد؛ ابتدا سالن‌ها را حذف کنید");
                      return;
                    }
                    if (confirm(`تئاتر «${t.name}» حذف شود؟`)) remove.mutate(t.id);
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
