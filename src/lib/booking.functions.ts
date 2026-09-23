import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BookingDTO } from "@/lib/catalog-types";
import { sessionLabels } from "@/lib/session-time";

const bookingSelect =
  "id, total_price, status, created_at, expires_at, seat_count, shows(slug, title, poster_key, halls(name, theaters(name))), show_sessions(starts_at), booking_items(show_seats(seats(row_label, seat_number)))";

type BookingRow = {
  id: string;
  total_price: number;
  status: string;
  created_at: string;
  expires_at: string | null;
  seat_count: number;
  shows: {
    slug: string;
    title: string;
    poster_key: string;
    halls: { name: string; theaters: { name: string } | null } | null;
  } | null;
  show_sessions: { starts_at: string } | null;
  booking_items: {
    show_seats: { seats: { row_label: string; seat_number: number } | null } | null;
  }[];
};

function toBookingDTO(row: BookingRow): BookingDTO {
  const seats = row.booking_items
    .map((i) => i.show_seats?.seats)
    .filter((s): s is { row_label: string; seat_number: number } => Boolean(s))
    .map((s) => `${s.row_label}${s.seat_number}`)
    .sort();

  return {
    id: row.id,
    showSlug: row.shows?.slug ?? "",
    showTitle: row.shows?.title ?? "",
    posterKey: row.shows?.poster_key ?? "hamlet",
    venue: `${row.shows?.halls?.name ?? ""} — ${row.shows?.halls?.theaters?.name ?? ""}`,
    ...sessionLabels(row.show_sessions?.starts_at),
    seats,
    total: row.total_price,
    status: (row.status as BookingDTO["status"]) ?? "pending",
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        slug: z.string(),
        sessionId: z.string().uuid(),
        seatIds: z.array(z.string()).min(1).max(8),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ bookingId: string }> => {
    const { data: bookingId, error } = await context.supabase.rpc("create_booking", {
      p_slug: data.slug,
      p_session_id: data.sessionId,
      p_seat_labels: data.seatIds,
    });
    if (error) throw new Error(error.message);
    return { bookingId: bookingId as unknown as string };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BookingDTO[]> => {
    const { data, error } = await context.supabase
      .from("bookings")
      .select(bookingSelect)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as BookingRow[]).map(toBookingDTO);
  });

export const getMyBooking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<BookingDTO | null> => {
    const { data: row, error } = await context.supabase
      .from("bookings")
      .select(bookingSelect)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return toBookingDTO(row as unknown as BookingRow);
  });
