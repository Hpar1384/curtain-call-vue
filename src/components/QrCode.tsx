import { useEffect, useState } from "react";

/** Renders a QR image for the given payload (generated in the browser). */
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let active = true;
    void import("qrcode").then(async (mod) => {
      const url = await mod.default.toDataURL(value, {
        width: size * 2,
        margin: 1,
        color: { dark: "#101015", light: "#ffffff" },
      });
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-white p-3"
      style={{ width: size + 24, height: size + 24 }}
    >
      {src ? (
        <img src={src} alt="کد QR بلیت" width={size} height={size} />
      ) : (
        <span className="text-[11px] text-neutral-500">…</span>
      )}
    </div>
  );
}
