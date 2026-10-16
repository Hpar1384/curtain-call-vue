import type React from "react";
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { listMyBookings } from "@/lib/booking.functions";
import { toPersianNumber } from "@/lib/shows";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BottomNav } from "@/components/BottomNav";
import { getMyProfile, updateMyProfile, type ProfileInput } from "@/modules/profile/profile.functions";

const bookingsQueryOptions = queryOptions({
  queryKey: ["my-bookings"],
  queryFn: () => listMyBookings(),
});

const profileQueryOptions = queryOptions({
  queryKey: ["my-profile"],
  queryFn: () => getMyProfile(),
});

export const Route = createFileRoute("/_authenticated/profile")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(bookingsQueryOptions),
      context.queryClient.ensureQueryData(profileQueryOptions),
    ]),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-sm text-muted-foreground">
      خطا در دریافت پروفایل: {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">چیزی یافت نشد.</div>
  ),
  head: () => ({
    meta: [
      { title: "پروفایل | TheaterReserve" },
      {
        name: "description",
        content: "حساب کاربری و خلاصهٔ فعالیت رزرو بلیت تئاتر شما.",
      },
      { property: "og:title", content: "پروفایل | TheaterReserve" },
      { property: "og:description", content: "حساب کاربری در TheaterReserve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfileScreen,
});

function ProfileScreen() {
  const { data: bookings } = useSuspenseQuery(bookingsQueryOptions);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const tickets = bookings.reduce((n, b) => n + b.seats.length, 0);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: "" }, replace: true });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="flex items-center px-5 pb-2 pt-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          پروفایل
        </h1>
      </header>

      <div className="space-y-4 px-5 pb-28 pt-3">
        <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-2xl">
            🎭
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-foreground" dir="ltr">
              {user?.email ?? "کاربر"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">حساب کاربری فعال</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="رزروها" value={toPersianNumber(bookings.length)} />
          <Stat label="بلیت‌ها" value={toPersianNumber(tickets)} />
        </div>

        <ProfileForm />

        <Section title="حساب">
          <Field label="ایمیل" value={user?.email ?? "—"} ltr />
        </Section>

        <Section title="Curtain Call">
          <NavRow to="/about" icon="🏛️" label="درباره ما" />
          <NavRow to="/contact" icon="📞" label="تماس با ما" />
          <NavRow to="/support" icon="💛" label="حمایت از ما" />
        </Section>

        <button
          onClick={signOut}
          className="h-14 w-full rounded-2xl bg-card text-sm font-extrabold text-destructive active:scale-[0.98]"
        >
          خروج از حساب
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-bold text-muted-foreground">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card">{children}</div>
    </section>
  );
}

function Field({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 px-4">
      <span className="text-sm text-foreground">{label}</span>
      <span className="truncate text-xs text-muted-foreground" dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </div>
  );
}

function NavRow({ to, icon, label }: { to: "/about" | "/contact" | "/support"; icon: string; label: string }) {
  return (
    <Link to={to} className="flex min-h-14 items-center gap-3 px-4 active:bg-secondary">
      <span className="text-lg">{icon}</span>
      <span className="flex-1 text-sm font-bold text-foreground">{label}</span>
      <span className="text-muted-foreground">‹</span>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card px-4 py-4 text-center">
      <p className="text-xl font-extrabold text-gold">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl bg-secondary px-3 py-3 text-sm text-foreground outline-none ring-gold/40 focus:ring-2";

function ProfileForm() {
  const { data } = useSuspenseQuery(profileQueryOptions);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileInput>(data);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(data), [data]);

  const set = (k: keyof ProfileInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await updateMyProfile({ data: form });
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("پروفایل ذخیره شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const row = (id: keyof ProfileInput, label: string, opts: { ltr?: boolean; placeholder?: string; inputMode?: "numeric" | "tel" } = {}) => (
    <label htmlFor={id} className="block px-4 py-3">
      <span className="mb-1.5 block text-xs font-bold text-muted-foreground">{label}</span>
      <input
        id={id}
        value={form[id]}
        onChange={set(id)}
        dir={opts.ltr ? "ltr" : undefined}
        inputMode={opts.inputMode}
        placeholder={opts.placeholder}
        className={inputClass}
      />
    </label>
  );

  return (
    <form onSubmit={save} className="space-y-4">
      <Section title="اطلاعات شخصی">
        {row("firstName", "نام")}
        {row("lastName", "نام خانوادگی")}
        {row("phone", "شماره موبایل", { ltr: true, inputMode: "tel", placeholder: "09xxxxxxxxx" })}
      </Section>
      <Section title="اطلاعات حساب برای بازگشت وجه">
        {row("refundHolder", "نام صاحب حساب")}
        {row("refundIban", "شماره شبا", { ltr: true, placeholder: "IR000000000000000000000000" })}
        {row("refundCard", "شماره کارت", { ltr: true, inputMode: "numeric", placeholder: "16 رقم" })}
      </Section>
      <button
        type="submit"
        disabled={saving}
        className="h-14 w-full rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-50 active:scale-[0.98]"
      >
        {saving ? "در حال ذخیره…" : "ذخیرهٔ تغییرات"}
      </button>
    </form>
  );
}
