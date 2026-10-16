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

/**
 * Pay for a booking. Flow:
 *   start_payment (as the user, RLS-checked ownership) → gateway.request → gateway.verify
 *   → finalize_payment (service role only). The browser can never declare a payment successful.
 * In test mode the chosen `simulate` outcome is passed only to the TEST gateway's verify step.
 */
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
    const gateway = getPaymentGateway();

    const { data: started, error: startErr } = await context.supabase.rpc("start_payment", {
      p_booking_id: data.bookingId,
      p_provider: gateway.id,
      p_mode: gateway.mode,
    });
    if (startErr) throw new Error(startErr.message);
    const { paymentId, amount } = started as unknown as { paymentId: string; amount: number };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const req = await gateway.request({ paymentId, amount, callbackUrl: "" });
    const { error: authErr } = await supabaseAdmin.rpc("attach_payment_authority", {
      p_payment_id: paymentId,
      p_authority: req.authority,
    });
    if (authErr) throw new Error("ثبت تراکنش ناموفق بود");

    if (req.redirectUrl) {
      // Live gateways: the customer is redirected and verification happens in the callback route.
      throw new Error("درگاه واقعی هنوز پیکربندی نشده است");
    }

    let verified;
    try {
      verified = await gateway.verify({
        authority: req.authority,
        amount,
        testOutcome: gateway.mode === "test" ? data.simulate : undefined,
      });
    } catch (e) {
      console.error("payment verify failed", e);
      verified = { outcome: "failed" as const, gatewayRef: "" };
    }

    const { data: fin, error } = await supabaseAdmin.rpc("finalize_payment", {
      p_payment_id: paymentId,
      p_outcome: verified.outcome,
      p_gateway_ref: verified.gatewayRef,
    });
    if (error) throw new Error("ثبت نتیجهٔ پرداخت ناموفق بود");
    return fin as unknown as PaymentResultDTO;
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
