import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  active: boolean;
  onResult: (value: string) => void;
  onError: (message: string) => void;
};

/** Camera preview + QR decoding loop (browser only). */
export function QrScanner({ active, onResult, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const firedRef = useRef(false);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }
    firedRef.current = false;
    let cancelled = false;

    const run = async () => {
      try {
        const [{ default: jsQR }, stream] = await Promise.all([
          import("jsqr"),
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          }),
        ]);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

        const tick = () => {
          if (cancelled || firedRef.current) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const w = (canvas.width = video.videoWidth);
            const h = (canvas.height = video.videoHeight);
            if (w && h) {
              ctx.drawImage(video, 0, 0, w, h);
              const image = ctx.getImageData(0, 0, w, h);
              const found = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" });
              if (found?.data) {
                firedRef.current = true;
                onResult(found.data.trim());
                return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) onError("دسترسی به دوربین ممکن نشد");
      }
    };

    void run();
    return () => {
      cancelled = true;
      stop();
    };
  }, [active, onError, onResult, stop]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
        aria-label="پیش‌نمایش دوربین"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-3/5 w-3/5 rounded-2xl border-4 border-gold/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
      </div>
      {!ready ? (
        <p className="absolute inset-x-0 bottom-4 text-center text-xs text-white/80">
          در حال آماده‌سازی دوربین…
        </p>
      ) : null}
    </div>
  );
}
