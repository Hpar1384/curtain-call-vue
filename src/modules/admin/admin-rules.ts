import type { AdminBookingDTO } from "./admin-types";

export type BookingFilter = "pending" | "paid" | "cancelled" | "expired";

/** Unpaid past expires_at → expired (the backend releases its seats automatically). */
export function bookingFilterOf(
  status: AdminBookingDTO["status"],
  expiresAt: string | null,
  now: number,
): BookingFilter {
  if (status === "confirmed") return "paid";
  if (status === "cancelled") return "cancelled";
  return expiresAt && new Date(expiresAt).getTime() < now ? "expired" : "pending";
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
  theaters: "تئاتر",
  user_roles: "نقش کاربر",
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
