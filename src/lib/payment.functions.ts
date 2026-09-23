import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PaymentResultDTO, TicketDTO } from "@/lib/payment-types";
import { sessionLabels } from "@/lib/session-time";

const ticketSelect =
  "id, booking_id, ticket_code, qr_payload, seat_label, status, created_at, bookings(shows(title, poster_key, halls(name, theaters(name))), show_sessions(starts_at))";

type TicketRow = {
  id: string;
  booking_id: string;
  ticket_code: string;
  qr_payload: string;
  seat_label: string;
  status: string;
  created_at: string;
  bookings: {
    shows: {
      title: string;
      poster_key: string;
      halls: { name: string; theaters: { name: string } | null } | null;
    } | null;
    show_sessions: { starts_at: string } | null;
  } | null;
};

function toTicketDTO(row: TicketRow): TicketDTO {
  const show = row.bookings?.shows;
  return {
    id: row.id,
    bookingId: row.booking_id,
    code: row.ticket_code,
    qrPayload: row.qr_payload,
    seat: row.seat_label,
    status: (row.status as TicketDTO["status"]) ?? "valid",
    createdAt: row.created_at,
    showTitle: show?.title ?? "",
    posterKey: show?.poster_key ?? "hamlet",
    venue: `${show?.halls?.name ?? ""} — ${show?.halls?.theaters?.name ?? ""}`,
    ...sessionLabels(row.bookings?.show_sessions?.starts_at),
  };
}

export const payBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        bookingId: z.string().uuid(),
        simulate: z.enum(["success", "failed", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PaymentResultDTO> => {
    const { getPaymentGateway } = await import("@/lib/payment-gateway.server");

    const { data: booking, error: bookingError } = await context.supabase
      .from("bookings")
      .select("id, total_price, status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (bookingError) throw new Error(bookingError.message);
    if (!booking) throw new Error("رزرو یافت نشد");

    const gateway = getPaymentGateway();
    const result = await gateway.charge({
      bookingId: data.bookingId,
      amount: booking.total_price,
      simulate: data.simulate,
    });

    const { data: rpc, error } = await context.supabase.rpc("process_payment", {
      p_booking_id: data.bookingId,
      p_outcome: result.outcome,
    });
    if (error) throw new Error(error.message);
    return rpc as unknown as PaymentResultDTO;
  });

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TicketDTO[]> => {
    const { data, error } = await context.supabase
      .from("tickets")
      .select(ticketSelect)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as TicketRow[]).map(toTicketDTO);
  });

export const getMyTicket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<TicketDTO | null> => {
    const { data: row, error } = await context.supabase
      .from("tickets")
      .select(ticketSelect)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return toTicketDTO(row as unknown as TicketRow);
  });

export const getBookingTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ bookingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<TicketDTO[]> => {
    const { data: rows, error } = await context.supabase
      .from("tickets")
      .select(ticketSelect)
      .eq("booking_id", data.bookingId);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as unknown as TicketRow[]).map(toTicketDTO);
  });

export const cancelMyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.rpc("cancel_ticket", {
      p_ticket_id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
