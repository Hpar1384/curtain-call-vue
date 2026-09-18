import posterHamlet from "@/assets/poster-hamlet.jpg";
import posterSeller from "@/assets/poster-seller.jpg";
import posterRhinoceros from "@/assets/poster-rhinoceros.jpg";
import posterVeil from "@/assets/poster-veil.jpg";
import type { BookingDTO } from "@/lib/catalog-types";

const posters: Record<string, string> = {
  hamlet: posterHamlet,
  seller: posterSeller,
  rhinoceros: posterRhinoceros,
  veil: posterVeil,
};

export function posterFor(key: string): string {
  return posters[key] ?? posterHamlet;
}

export function statusLabel(status: BookingDTO["status"]): string {
  if (status === "confirmed") return "پرداخت‌شده";
  if (status === "cancelled") return "لغوشده";
  if (status === "awaiting_payment") return "در انتظار پرداخت";
  return "در انتظار";
}
