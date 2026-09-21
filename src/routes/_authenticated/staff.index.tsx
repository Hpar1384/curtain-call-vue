import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSessionStats, listStaffSessions } from "@/modules/checkin/checkin.functions";
import { useStaffSession } from "@/modules/checkin/use-staff-session";

export const Route = createFileRoute("/_authenticated/staff/")({
  component: StaffDashboard,
});

function StaffDashboard() {
  const { sessionId, select, hydrated } = useStaffSession();

  const sessions = useQuery({
    queryKey: ["staff-sessions"],
    queryFn: () => listStaffSessions(),
  });

  const stats = useQuery({
    queryKey: ["staff-stats", sessionId],
    queryFn: () => getSessionStats({ data: { sessionId: sessionId! } }),
    enabled: Boolean(sessionId),
    refetchInterval: 15000,
  });

  const active = sessions.data?.find((s) => s.id === sessionId) ?? null;

  return (
    <div className="space-y-4 p-4 pb-10">
      <section className="rounded-2xl bg-white/5 p-4">
        <h2 className="text-xs font-bold text-white/60">سانس فعال</h2>
        {!hydrated || sessions.isPending ? (
          <p className="mt-2 text-sm text-white/50">در حال بارگذاری…</p>
        ) : (
          <select
            value={sessionId ?? ""}
            onChange={(e) => select(e.target.value || null)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#15151d] px-3 py-2.5 text-sm text-white outline-none"
            aria-label="انتخاب سانس"
          >
            <option value="">— انتخاب سانس —</option>
            {sessions.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.showTitle} · {s.weekday} {s.date} · {s.time} · {s.hall}
              </option>
            ))}
          </select>
        )}
        {active ? (
          <p className="mt-2 text-xs text-white/60">
            {active.showTitle} — {active.hall}
          </p>
        ) : null}
      </section>

      {sessionId ? (
        <>
          <section className="grid grid-cols-3 gap-3">
            <Stat label="بلیت معتبر" value={stats.data?.total ?? 0} />
            <Stat label="ورود ثبت‌شده" value={stats.data?.checkedIn ?? 0} />
            <Stat label="باقی‌مانده" value={stats.data?.remaining ?? 0} />
          </section>

          <Link
            to="/staff/checkin"
            className="block rounded-2xl bg-gold py-4 text-center text-base font-extrabold text-black active:scale-95"
          >
            شروع اسکن
          </Link>

          <section className="rounded-2xl bg-white/5 p-4">
            <h2 className="text-xs font-bold text-white/60">آخرین ورودها</h2>
            <ul className="mt-3 space-y-2">
              {(stats.data?.recent ?? []).map((r) => (
                <li
                  key={r.code}
                  className="flex items-center justify-between text-sm text-white"
                >
                  <span>صندلی {r.seat}</span>
                  <span className="text-xs text-white/50" dir="ltr">
                    {new Date(r.checkedInAt).toLocaleTimeString("fa-IR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
              {(stats.data?.recent?.length ?? 0) === 0 ? (
                <li className="text-sm text-white/40">هنوز ورودی ثبت نشده است.</li>
              ) : null}
            </ul>
          </section>
        </>
      ) : (
        <p className="text-sm text-white/50">برای شروع، سانس امشب را انتخاب کنید.</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3 text-center">
      <p className="text-xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-white/50">{label}</p>
    </div>
  );
}
