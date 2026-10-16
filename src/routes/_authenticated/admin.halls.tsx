import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminDeleteHall,
  adminHallSeats,
  adminListHalls,
  adminListTheaters,
  adminSaveHall,
  adminSetHallCurved,
  adminUpdateSeatLayout,
  type AdminSeatDTO,
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
  const [mapFor, setMapFor] = useState<string | null>(null);

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
              const current = form.id ? halls.data.find((x) => x.id === form.id) : undefined;
              const dimsChanged =
                current &&
                (current.rows_count !== form.rows_count ||
                  current.seats_per_row !== form.seats_per_row);
              if (dimsChanged && current.layoutLocked) {
                toast.error("این سالن رزرو ثبت‌شده دارد؛ تغییر چیدمان مجاز نیست");
                return;
              }
              if (dimsChanged && !confirm("چیدمان صندلی‌ها دوباره ساخته می‌شود. ادامه می‌دهید؟"))
                return;
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
                onChange={(e) => setForm({ ...form, seats_per_row: Number(e.target.value) })}
              />
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              تغییر تعداد ردیف/صندلی فقط برای سالن بدون رزرو ممکن است.
            </p>
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
        {halls.data.map((h) => (
          <Card key={h.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold text-foreground">
                  {h.theaterName} — {h.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {toPersianNumber(h.rows_count)} ردیف × {toPersianNumber(h.seats_per_row)} صندلی ·
                  ظرفیت {toPersianNumber(h.capacity)} · {toPersianNumber(h.showCount)} نمایش
                  {h.layoutLocked && " · چیدمان قفل (دارای رزرو)"}
                </p>
                {mapFor === h.id && <SeatGrid hallId={h.id} />}
              </div>
              <div className="flex gap-2">
                <button type="button" className={ghostButtonClass} onClick={() => startEdit(h)}>
                  ویرایش
                </button>
                <button
                  type="button"
                  className={ghostButtonClass}
                  onClick={() => setMapFor(mapFor === h.id ? null : h.id)}
                >
                  نقشه صندلی
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

const zoneClass: Record<AdminSeatDTO["zone"], string> = {
  standard: "bg-secondary",
  vip: "bg-gold/70",
  economy: "bg-muted-foreground/40",
};

function SeatGrid({ hallId }: { hallId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-hall-seats", hallId],
    queryFn: () => adminHallSeats({ data: { hallId } }),
  });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const update = useMutation({
    mutationFn: (patch: { zone?: AdminSeatDTO["zone"]; section?: AdminSeatDTO["section"]; aisleAfter?: boolean }) =>
      adminUpdateSeatLayout({ data: { hallId, seatIds: [...picked], ...patch } }),
    onSuccess: () => {
      toast.success("چیدمان ذخیره شد");
      setPicked(new Set());
      void qc.invalidateQueries({ queryKey: ["admin-hall-seats", hallId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const curved = useMutation({
    mutationFn: (v: boolean) => adminSetHallCurved({ data: { hallId, curved: v } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-hall-seats", hallId] }),
    onError: (e: Error) => toast.error(e.message),
  });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorNote message={q.error.message} />;
  const seats = q.data.seats;
  const rows = new Map<string, AdminSeatDTO[]>();
  for (const s of seats) rows.set(s.row, [...(rows.get(s.row) ?? []), s]);
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const pickRow = (row: string) =>
    setPicked((p) => {
      const n = new Set(p);
      for (const s of rows.get(row) ?? []) n.add(s.id);
      return n;
    });
  const has = picked.size > 0;
  const btn = ghostButtonClass + " disabled:opacity-40";

  return (
    <div className="mt-3 space-y-3">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={q.data.curved}
          onChange={(e) => curved.mutate(e.target.checked)}
        />
        چیدمان منحنی (ردیف‌ها به شکل قوس نمایش داده شوند)
      </label>
      <p className="text-[11px] text-muted-foreground">
        صندلی‌ها را انتخاب کن (یا روی حرف ردیف بزن تا کل ردیف انتخاب شود)، سپس بخش/ناحیه را تعیین کن. این کار صندلی
        حذف یا اضافه نمی‌کند و رزروها دست‌نخورده می‌مانند؛ قیمت فقط برای صندلی‌های آزاد سانس‌های آینده به‌روز می‌شود.
      </p>
      <div className="flex flex-col gap-1 overflow-x-auto pb-1">
        {[...rows.entries()].map(([row, list]) => (
          <div key={row} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => pickRow(row)}
              className="w-5 text-[10px] font-bold text-muted-foreground"
            >
              {row}
            </button>
            {list.map((s) => (
              <button
                key={s.id}
                type="button"
                title={`${row}${s.number}`}
                onClick={() => toggle(s.id)}
                style={s.aisleAfter ? { marginInlineEnd: "0.6rem" } : undefined}
                className={
                  "h-5 w-5 shrink-0 rounded-sm text-[8px] " +
                  zoneClass[s.zone] +
                  (s.section === "balcony" ? " rounded-full" : "") +
                  (picked.has(s.id) ? " ring-2 ring-primary" : "")
                }
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-secondary" />عادی</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-gold/70" />VIP</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-muted-foreground/40" />اقتصادی</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-secondary" />بالکن</span>
        <span>· {toPersianNumber(picked.size)} انتخاب</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!has} className={btn} onClick={() => update.mutate({ zone: "vip" })}>VIP</button>
        <button type="button" disabled={!has} className={btn} onClick={() => update.mutate({ zone: "standard" })}>عادی</button>
        <button type="button" disabled={!has} className={btn} onClick={() => update.mutate({ zone: "economy" })}>اقتصادی</button>
        <button type="button" disabled={!has} className={btn} onClick={() => update.mutate({ section: "balcony" })}>بالکن</button>
        <button type="button" disabled={!has} className={btn} onClick={() => update.mutate({ section: "main" })}>سالن اصلی</button>
        <button type="button" disabled={!has} className={btn} onClick={() => update.mutate({ aisleAfter: true })}>راهرو بعد از صندلی</button>
        <button type="button" disabled={!has} className={btn} onClick={() => update.mutate({ aisleAfter: false })}>حذف راهرو</button>
        <button type="button" disabled={!has} className={btn} onClick={() => setPicked(new Set())}>لغو انتخاب</button>
      </div>
    </div>
  );
}
