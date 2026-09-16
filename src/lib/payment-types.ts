export type PaymentOutcome = "success" | "failed" | "cancelled";

export type PaymentResultDTO = {
  paymentId: string;
  status: PaymentOutcome;
  reference: string;
};

export type TicketDTO = {
  id: string;
  bookingId: string;
  code: string;
  qrPayload: string;
  seat: string;
  status: "valid" | "used" | "cancelled";
  createdAt: string;
  showTitle: string;
  posterKey: string;
  venue: string;
  date: string;
  weekday: string;
  time: string;
};

export function ticketStatusLabel(status: TicketDTO["status"]): string {
  if (status === "valid") return "معتبر";
  if (status === "used") return "استفاده‌شده";
  return "لغوشده";
}

export function paymentStatusLabel(status: PaymentOutcome): string {
  if (status === "success") return "پرداخت موفق";
  if (status === "failed") return "پرداخت ناموفق";
  return "پرداخت لغو شد";
}
