/**
 * `show_sessions.starts_at` is the single source of truth.
 * Persian labels are derived for display only (Asia/Tehran, Jalali calendar).
 */
const TZ = "Asia/Tehran";
const dateFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
});
const weekdayFmt = new Intl.DateTimeFormat("fa-IR", { timeZone: TZ, weekday: "long" });
const timeFmt = new Intl.DateTimeFormat("fa-IR", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export type SessionLabels = { date: string; weekday: string; time: string };

export function sessionLabels(startsAt: string | null | undefined): SessionLabels {
  if (!startsAt) return { date: "", weekday: "", time: "" };
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return { date: "", weekday: "", time: "" };
  return { date: dateFmt.format(d), weekday: weekdayFmt.format(d), time: timeFmt.format(d) };
}

export function sessionLabel(startsAt: string | null | undefined): string {
  const l = sessionLabels(startsAt);
  return l.date ? `${l.weekday} ${l.date} · ${l.time}` : "";
}

/** ISO → value for <input type="datetime-local"> in Tehran time (Iran has no DST). */
export function toTehranLocalInput(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 3.5 * 3600_000);
  return d.toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value (Tehran time) → ISO string. */
export function fromTehranLocalInput(value: string): string {
  return new Date(`${value}:00+03:30`).toISOString();
}
