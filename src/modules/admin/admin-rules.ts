import type { AdminBookingDTO } from "./admin-types";

export type BookingFilter = "pending" | "paid" | "cancelled" | "expired";

/** Unpaid bookings older than this are treated as expired. */
export const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

export function bookingFilterOf(
  status: AdminBookingDTO["status"],
  createdAt: string,
  now: number,
): BookingFilter {
  if (status === "confirmed") return "paid";
  if (status === "cancelled") return "cancelled";
  return now - new Date(createdAt).getTime() > PAYMENT_WINDOW_MS ? "expired" : "pending";
}

export function checkinRate(total: number, used: number): number {
  return total === 0 ? 0 : Math.round((used / total) * 100);
}

const entityLabels: Record<string, string> = {
  shows: "نمایش",
  show_sessions: "سانس",
  halls: "سالن",
  bookings: "رزرو",
  tickets: "بلیت",
  check_ins: "ورود",
};
const actionLabels: Record<string, string> = {
  insert: "ایجاد",
  update: "تغییر",
  delete: "حذف",
};

export function auditLabel(entity: string, action: string): string {
  if (entity === "check_ins") return "ثبت ورود";
  return `${actionLabels[action] ?? action} ${entityLabels[entity] ?? entity}`;
}
