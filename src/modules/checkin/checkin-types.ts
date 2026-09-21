export type StaffSessionDTO = {
  id: string;
  showTitle: string;
  hall: string;
  date: string;
  weekday: string;
  time: string;
};

export type CheckinFailureCode =
  | "unauthorized_operator"
  | "ticket_not_found"
  | "ticket_cancelled"
  | "ticket_already_used"
  | "booking_not_paid"
  | "session_invalid"
  | "invalid_ticket";

export type CheckinResult =
  | {
      ok: true;
      ticketCode: string;
      seat: string;
      showTitle: string;
      hall: string;
      date: string;
      weekday: string;
      time: string;
      checkedInAt: string;
      operatorEmail: string | null;
    }
  | { ok: false; code: CheckinFailureCode; checkedInAt?: string | null };

export type SessionStats = {
  total: number;
  checkedIn: number;
  remaining: number;
  recent: { seat: string; code: string; checkedInAt: string }[];
};

const failureLabels: Record<CheckinFailureCode, string> = {
  unauthorized_operator: "اجازهٔ ثبت ورود ندارید",
  ticket_not_found: "بلیت پیدا نشد",
  ticket_cancelled: "بلیت لغو شده است",
  ticket_already_used: "این بلیت قبلاً استفاده شده",
  booking_not_paid: "رزرو این بلیت پرداخت نشده",
  session_invalid: "بلیت مربوط به سانس دیگری است",
  invalid_ticket: "بلیت نامعتبر است",
};

export function checkinFailureLabel(code: CheckinFailureCode): string {
  return failureLabels[code] ?? "بلیت نامعتبر است";
}
