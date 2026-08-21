import type { ReactNode } from "react";

/** Fixed bottom action bar used by flow screens. */
export function StickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-border bg-background/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="h-12 w-full rounded-xl bg-primary text-sm font-extrabold text-primary-foreground transition-transform active:scale-[0.98] disabled:bg-muted disabled:text-muted-foreground"
    >
      {children}
    </button>
  );
}
