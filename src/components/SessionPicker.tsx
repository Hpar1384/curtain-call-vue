import type { Session } from "@/lib/shows";

export function SessionPicker({
  sessions,
  value,
  onChange,
}: {
  sessions: Session[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {sessions.map((s) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={
              "shrink-0 rounded-xl px-4 py-2.5 text-center transition-colors " +
              (active
                ? "bg-gold text-primary-foreground"
                : "bg-card text-foreground")
            }
          >
            <span className="block text-[11px] opacity-70">{s.weekday}</span>
            <span className="mt-0.5 block text-sm font-bold">{s.date}</span>
            <span className="mt-0.5 block text-xs font-bold">{s.time}</span>
          </button>
        );
      })}
    </div>
  );
}
