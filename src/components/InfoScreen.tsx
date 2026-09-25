import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AppScreen, BackIcon, backButtonClass } from "@/components/AppScreen";

/** Shared shell for static app pages (about/contact/support). */
export function InfoScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AppScreen
      title={title}
      back={
        <Link to="/profile" aria-label="بازگشت" className={backButtonClass}>
          <BackIcon />
        </Link>
      }
    >
      <div className="space-y-4 px-5 pb-12 pt-5">{children}</div>
    </AppScreen>
  );
}

export function InfoCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-4">
      {title && <h2 className="mb-2 text-sm font-bold text-foreground">{title}</h2>}
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function ActionRow({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value?: string;
  icon: string;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="flex min-h-14 items-center gap-3 rounded-2xl bg-card px-4 py-3 active:scale-[0.98]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-lg">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-foreground">{label}</span>
        {value && (
          <span className="block truncate text-xs text-muted-foreground" dir="auto">
            {value}
          </span>
        )}
      </span>
      <span className="text-muted-foreground">‹</span>
    </a>
  );
}

export const VENUE = {
  name: "تئاتر شهر",
  address: "تهران، خیابان انقلاب، چهارراه ولیعصر، پارک دانشجو",
  phone: "021-66460592",
  email: "info@curtaincall.app",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=35.7009,51.4072",
  hours: [
    ["شنبه تا چهارشنبه", "۱۶:۰۰ تا ۲۲:۰۰"],
    ["پنجشنبه و جمعه", "۱۴:۰۰ تا ۲۳:۰۰"],
  ] as const,
};
