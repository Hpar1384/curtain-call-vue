import type { ReactNode } from "react";

/** App-style screen shell: compact top bar + scrollable content. */
export function AppScreen({
  title,
  back,
  children,
}: {
  title: string;
  back?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl">
        {back}
        <h1 className="text-base font-bold text-foreground">{title}</h1>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

export function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export const backButtonClass =
  "flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground active:scale-95";
