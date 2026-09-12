import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-gold";

export const buttonClass =
  "rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground active:scale-95 disabled:opacity-50";

export const ghostButtonClass =
  "rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-foreground active:scale-95";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-bold text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-card p-4">{children}</div>;
}

export function Loading() {
  return <p className="p-4 text-sm text-muted-foreground">در حال بارگذاری…</p>;
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p role="alert" className="p-4 text-sm text-destructive">
      {message}
    </p>
  );
}
