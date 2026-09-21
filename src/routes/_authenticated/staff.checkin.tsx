import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { QrScanner } from "@/modules/checkin/QrScanner";
import { checkinTicket } from "@/modules/checkin/checkin.functions";
import {
  checkinFailureLabel,
  type CheckinResult,
} from "@/modules/checkin/checkin-types";
import { useStaffSession } from "@/modules/checkin/use-staff-session";

export const Route = createFileRoute("/_authenticated/staff/checkin")({
  component: CheckinScreen,
});

function CheckinScreen() {
  const { sessionId, hydrated } = useStaffSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !sessionId) void navigate({ to: "/staff" });
  }, [hydrated, sessionId, navigate]);

  const handleResult = useCallback(
    async (value: string) => {
      if (!sessionId || busy) return;
      setScanning(false);
      setBusy(true);
      try {
        const res = await checkinTicket({ data: { code: value, sessionId } });
        setResult(res);
        await queryClient.invalidateQueries({ queryKey: ["staff-stats", sessionId] });
      } catch {
        setResult({ ok: false, code: "invalid_ticket" });
      }
      setBusy(false);
    },
    [busy, queryClient, sessionId],
  );

  const handleError = useCallback((message: string) => {
    setScanning(false);
    setCameraError(message);
  }, []);

  return (
    <div className="space-y-4 p-4 pb-10">
      {result ? (
        <ResultCard
          result={result}
          onNext={() => {
            setResult(null);
            setScanning(true);
          }}
        />
      ) : scanning ? (
        <>
          <QrScanner active onResult={handleResult} onError={handleError} />
          <p className="text-center text-xs text-white/50">
            کد QR بلیت را در کادر قرار دهید
          </p>
          <button
            onClick={() => setScanning(false)}
            className="w-full rounded-2xl bg-white/10 py-3 text-sm font-bold text-white active:scale-95"
          >
            خروج از اسکنر
          </button>
        </>
      ) : (
        <div className="space-y-3 pt-6">
          {cameraError ? (
            <p role="alert" className="text-center text-sm text-destructive">
              {cameraError}
            </p>
          ) : null}
          <button
            onClick={() => {
              setCameraError(null);
              setScanning(true);
            }}
            disabled={busy}
            className="w-full rounded-2xl bg-gold py-4 text-base font-extrabold text-black active:scale-95 disabled:opacity-50"
          >
            {busy ? "در حال بررسی…" : "شروع اسکنر"}
          </button>
          <Link
            to="/staff"
            className="block rounded-2xl bg-white/10 py-3 text-center text-sm font-bold text-white"
          >
            بازگشت
          </Link>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  result,
  onNext,
}: {
  result: CheckinResult;
  onNext: () => void;
}) {
  if (!result.ok) {
    return (
      <div className="space-y-4 pt-4">
        <div className="rounded-3xl bg-destructive/15 p-6 text-center">
          <p className="text-5xl">✕</p>
          <p className="mt-3 text-lg font-extrabold text-destructive">ورود مجاز نیست</p>
          <p className="mt-2 text-sm text-white/70">{checkinFailureLabel(result.code)}</p>
        </div>
        <button
          onClick={onNext}
          className="w-full rounded-2xl bg-gold py-4 text-base font-extrabold text-black active:scale-95"
        >
          اسکن بلیت بعدی
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-3xl bg-emerald-500/15 p-6 text-center">
        <p className="text-5xl">✓</p>
        <p className="mt-3 text-lg font-extrabold text-emerald-400">ورود مجاز</p>
      </div>
      <div className="space-y-2 rounded-2xl bg-white/5 p-4 text-sm text-white">
        <Row label="نمایش" value={result.showTitle} />
        <Row label="تاریخ" value={`${result.weekday} ${result.date}`} />
        <Row label="ساعت" value={result.time} />
        <Row label="سالن" value={result.hall} />
        <Row label="صندلی" value={result.seat} />
        <Row
          label="زمان ورود"
          value={new Date(result.checkedInAt).toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        <Row label="اپراتور" value={result.operatorEmail ?? "—"} />
      </div>
      <button
        onClick={onNext}
        className="w-full rounded-2xl bg-gold py-4 text-base font-extrabold text-black active:scale-95"
      >
        اسکن بلیت بعدی
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/50">{label}</span>
      <span className="truncate font-bold">{value}</span>
    </div>
  );
}
