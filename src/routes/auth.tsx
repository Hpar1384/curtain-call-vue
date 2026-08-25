import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AppScreen, BackIcon, backButtonClass } from "@/components/AppScreen";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : "",
  }),
  head: () => ({
    meta: [
      { title: "ورود و ثبت‌نام | TheaterReserve" },
      {
        name: "description",
        content:
          "برای رزرو بلیت تئاتر وارد حساب کاربری خود شوید یا حساب جدید بسازید.",
      },
      { property: "og:title", content: "ورود و ثبت‌نام | TheaterReserve" },
      {
        property: "og:description",
        content: "ورود به حساب کاربری TheaterReserve برای رزرو بلیت تئاتر.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const target = redirect || "/tickets";

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate({ to: target, replace: true });
    }
  }, [loading, isAuthenticated, navigate, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        toast.success("حساب ساخته شد. خوش آمدی!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("خوش آمدی!");
      }
      navigate({ to: target, replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "عملیات ناموفق بود",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen
      title={mode === "signin" ? "ورود" : "ثبت‌نام"}
      back={
        <Link to="/" aria-label="بازگشت" className={backButtonClass}>
          <BackIcon />
        </Link>
      }
    >
      <div className="px-5 pb-16 pt-6">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gold-soft text-3xl">
            🎭
          </span>
          <h2 className="mt-3 text-lg font-extrabold text-foreground">
            TheaterReserve
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            برای رزرو بلیت وارد حساب کاربری خود شوید.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-card p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                "rounded-xl py-2.5 text-sm font-bold transition-colors " +
                (mode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground")
              }
            >
              {m === "signin" ? "ورود" : "ثبت‌نام"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-bold text-muted-foreground"
            >
              ایمیل
            </label>
            <input
              id="email"
              type="email"
              required
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl bg-card px-4 py-3.5 text-sm text-foreground outline-none ring-gold/40 focus:ring-2"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-bold text-muted-foreground"
            >
              رمز عبور
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              dir="ltr"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl bg-card px-4 py-3.5 text-sm text-foreground outline-none ring-gold/40 focus:ring-2"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground disabled:opacity-50"
          >
            {busy
              ? "لطفاً صبر کنید…"
              : mode === "signin"
                ? "ورود به حساب"
                : "ساخت حساب"}
          </button>
        </form>
      </div>
    </AppScreen>
  );
}
