import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminDeleteShow,
  adminListHalls,
  adminListShows,
  adminSaveShow,
} from "@/modules/admin/admin.functions";
import type { AdminShowDTO } from "@/modules/admin/admin-types";
import {
  Card,
  ErrorNote,
  Field,
  Loading,
  buttonClass,
  ghostButtonClass,
  inputClass,
} from "@/components/admin/ui";
import { formatPrice, toPersianNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/shows")({
  component: AdminShows,
});

const posterKeys = ["hamlet", "seller", "rhinoceros", "veil"];

type FormState = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  poster_key: string;
  director: string;
  genre: string;
  duration_minutes: number;
  age_rating: string;
  price: number;
  hall_id: string;
  sort_order: number;
  is_active: boolean;
};

const emptyForm: FormState = {
  slug: "",
  title: "",
  description: "",
  poster_key: "hamlet",
  director: "",
  genre: "",
  duration_minutes: 90,
  age_rating: "",
  price: 0,
  hall_id: "",
  sort_order: 0,
  is_active: true,
};

function AdminShows() {
  const qc = useQueryClient();
  const shows = useQuery({ queryKey: ["admin-shows"], queryFn: () => adminListShows() });
  const halls = useQuery({ queryKey: ["admin-halls"], queryFn: () => adminListHalls() });
  const [form, setForm] = useState<FormState | null>(null);

  const save = useMutation({
    mutationFn: (values: FormState) =>
      adminSaveShow({
        data: {
          ...values,
          director: values.director || null,
          genre: values.genre || null,
          age_rating: values.age_rating || null,
        },
      }),
    onSuccess: () => {
      toast.success("ذخیره شد");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["admin-shows"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteShow({ data: { id } }),
    onSuccess: () => {
      toast.success("حذف شد");
      void qc.invalidateQueries({ queryKey: ["admin-shows"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (shows.isPending || halls.isPending) return <Loading />;
  if (shows.error) return <ErrorNote message={shows.error.message} />;
  if (halls.error) return <ErrorNote message={halls.error.message} />;

  const startNew = () => setForm({ ...emptyForm, hall_id: halls.data[0]?.id ?? "" });

  const startEdit = (s: AdminShowDTO) =>
    setForm({
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      poster_key: s.poster_key,
      director: s.director ?? "",
      genre: s.genre ?? "",
      duration_minutes: s.duration_minutes,
      age_rating: s.age_rating ?? "",
      price: s.price,
      hall_id: s.hall_id,
      sort_order: s.sort_order,
      is_active: s.is_active,
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-foreground">نمایش‌ها</h2>
        <button type="button" className={buttonClass} onClick={startNew}>
          نمایش جدید
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
            <Field label="عنوان">
              <input
                required
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="شناسهٔ آدرس (انگلیسی)">
              <input
                required
                className={inputClass}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </Field>
            <Field label="پوستر">
              <select
                className={inputClass}
                value={form.poster_key}
                onChange={(e) => setForm({ ...form, poster_key: e.target.value })}
              >
                {posterKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="سالن">
              <select
                required
                className={inputClass}
                value={form.hall_id}
                onChange={(e) => setForm({ ...form, hall_id: e.target.value })}
              >
                {halls.data.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.theaterName} — {h.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="مدت (دقیقه)">
              <input
                type="number"
                min={1}
                max={600}
                className={inputClass}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              />
            </Field>
            <Field label="ردهٔ سنی">
              <input
                className={inputClass}
                value={form.age_rating}
                onChange={(e) => setForm({ ...form, age_rating: e.target.value })}
              />
            </Field>
            <Field label="کارگردان">
              <input
                className={inputClass}
                value={form.director}
                onChange={(e) => setForm({ ...form, director: e.target.value })}
              />
            </Field>
            <Field label="ژانر">
              <input
                className={inputClass}
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
              />
            </Field>
            <Field label="قیمت (تومان)">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </Field>
            <Field label="ترتیب نمایش">
              <input
                type="number"
                className={inputClass}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </Field>
            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              نمایش فعال (در اپ کاربر دیده و رزرو شود)
            </label>
            <div className="sm:col-span-2">
              <Field label="خلاصه">
                <textarea
                  rows={3}
                  className={inputClass}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
            </div>
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
        {shows.data.map((s) => (
          <Card key={s.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-foreground">
                  {s.title}
                  {!s.is_active && (
                    <span className="ms-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      غیرفعال
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.hallName} · {toPersianNumber(s.duration_minutes)} دقیقه ·{" "}
                  {formatPrice(s.price)} تومان
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={ghostButtonClass} onClick={() => startEdit(s)}>
                  ویرایش
                </button>
                <button
                  type="button"
                  className={ghostButtonClass}
                  disabled={save.isPending}
                  onClick={() =>
                    save.mutate({
                      id: s.id,
                      slug: s.slug,
                      title: s.title,
                      description: s.description,
                      poster_key: s.poster_key,
                      director: s.director ?? "",
                      genre: s.genre ?? "",
                      duration_minutes: s.duration_minutes,
                      age_rating: s.age_rating ?? "",
                      price: s.price,
                      hall_id: s.hall_id,
                      sort_order: s.sort_order,
                      is_active: !s.is_active,
                    })
                  }
                >
                  {s.is_active ? "غیرفعال کن" : "فعال کن"}
                </button>
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => {
                    if (
                      confirm(
                        `نمایش «${s.title}» حذف شود؟ اگر سانس یا رزرو داشته باشد، حذف انجام نمی‌شود.`,
                      )
                    )
                      remove.mutate(s.id);
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
