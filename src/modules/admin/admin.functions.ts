import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  AdminBookingDTO,
  AdminHallDTO,
  AdminSessionDTO,
  AdminShowDTO,
  AdminStats,
  AdminTicketDTO,
} from "@/modules/admin/admin-types";

type AdminContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

async function assertAdmin(context: AdminContext) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("دسترسی مدیریتی ندارید");
}

export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean }> => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { isAdmin: data === true };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    const { data, error } = await context.supabase.rpc("admin_stats");
    if (error) throw new Error(error.message);
    return data as unknown as AdminStats;
  });

/* ---------------------------------- shows --------------------------------- */

export const adminListShows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminShowDTO[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("shows")
      .select(
        "id, slug, title, description, poster_key, director, genre, duration_minutes, age_rating, price, sort_order, hall_id, halls(name)",
      )
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as (AdminShowDTO & { halls: { name: string } | null })[]).map(
      (r) => ({ ...r, hallName: r.halls?.name ?? "" }),
    );
  });

const showInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  poster_key: z.string().min(1),
  director: z.string().nullable().default(null),
  genre: z.string().nullable().default(null),
  duration_minutes: z.number().int().min(1).max(600),
  age_rating: z.string().nullable().default(null),
  price: z.number().int().min(0),
  hall_id: z.string().uuid(),
  sort_order: z.number().int().default(0),
});

export const adminSaveShow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => showInput.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertAdmin(context);
    const { id, ...values } = data;
    if (id) {
      const { error } = await context.supabase.from("shows").update(values).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase
      .from("shows")
      .insert(values)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteShow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("shows").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------- halls --------------------------------- */

export const adminListHalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminHallDTO[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("halls")
      .select("id, name, rows_count, seats_per_row, theater_id, theaters(name)")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as (AdminHallDTO & { theaters: { name: string } | null })[]).map(
      (r) => ({ ...r, theaterName: r.theaters?.name ?? "" }),
    );
  });

export const adminListTheaters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ id: string; name: string }[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("theaters")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const hallInput = z.object({
  id: z.string().uuid().optional(),
  theater_id: z.string().uuid(),
  name: z.string().min(1),
  rows_count: z.number().int().min(1).max(20),
  seats_per_row: z.number().int().min(1).max(30),
});

export const adminSaveHall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => hallInput.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertAdmin(context);
    const { id, rows_count, seats_per_row, ...values } = data;
    let hallId = id;
    if (hallId) {
      const { error } = await context.supabase.from("halls").update(values).eq("id", hallId);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await context.supabase
        .from("halls")
        .insert({ ...values, rows_count, seats_per_row })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      hallId = row.id;
    }
    const { error: seatError } = await context.supabase.rpc("regenerate_hall_seats", {
      _hall_id: hallId,
      _rows: rows_count,
      _seats_per_row: seats_per_row,
    });
    if (seatError) throw new Error(seatError.message);
    return { id: hallId };
  });

export const adminDeleteHall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("halls").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- sessions -------------------------------- */

export const adminListSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminSessionDTO[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("show_sessions")
      .select(
        "id, show_id, date_label, weekday_label, time_label, sort_order, shows(title, halls(name))",
      )
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (
      (data ?? []) as unknown as (AdminSessionDTO & {
        shows: { title: string; halls: { name: string } | null } | null;
      })[]
    ).map((r) => ({
      ...r,
      showTitle: r.shows?.title ?? "",
      hallName: r.shows?.halls?.name ?? "",
    }));
  });

const sessionInput = z.object({
  id: z.string().uuid().optional(),
  show_id: z.string().uuid(),
  date_label: z.string().min(1),
  weekday_label: z.string().min(1),
  time_label: z.string().min(1),
  sort_order: z.number().int().default(0),
});

export const adminSaveSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => sessionInput.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    await assertAdmin(context);
    const { id, ...values } = data;
    if (id) {
      const { error } = await context.supabase.from("show_sessions").update(values).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase
      .from("show_sessions")
      .insert(values)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("show_sessions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- bookings -------------------------------- */

export const adminListBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminBookingDTO[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("bookings")
      .select(
        "id, user_id, status, total_price, seat_count, created_at, shows(title), show_sessions(date_label, weekday_label, time_label), booking_items(show_seats(seats(row_label, seat_number)))",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    type Row = {
      id: string;
      user_id: string;
      status: string;
      total_price: number;
      seat_count: number;
      created_at: string;
      shows: { title: string } | null;
      show_sessions: {
        date_label: string;
        weekday_label: string;
        time_label: string;
      } | null;
      booking_items: {
        show_seats: { seats: { row_label: string; seat_number: number } | null } | null;
      }[];
    };

    return ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      userId: r.user_id,
      status: r.status as AdminBookingDTO["status"],
      total: r.total_price,
      seatCount: r.seat_count,
      createdAt: r.created_at,
      showTitle: r.shows?.title ?? "",
      session: r.show_sessions
        ? `${r.show_sessions.weekday_label} ${r.show_sessions.date_label} · ${r.show_sessions.time_label}`
        : "",
      seats: r.booking_items
        .map((i) => i.show_seats?.seats)
        .filter((s): s is { row_label: string; seat_number: number } => Boolean(s))
        .map((s) => `${s.row_label}${s.seat_number}`)
        .sort(),
    }));
  });

export const adminUpdateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------- tickets -------------------------------- */

export const adminListTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminTicketDTO[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("tickets")
      .select(
        "id, user_id, ticket_code, seat_label, status, created_at, bookings(shows(title), show_sessions(date_label, weekday_label, time_label))",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    type Row = {
      id: string;
      user_id: string;
      ticket_code: string;
      seat_label: string;
      status: string;
      created_at: string;
      bookings: {
        shows: { title: string } | null;
        show_sessions: {
          date_label: string;
          weekday_label: string;
          time_label: string;
        } | null;
      } | null;
    };

    return ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      userId: r.user_id,
      code: r.ticket_code,
      seat: r.seat_label,
      status: r.status as AdminTicketDTO["status"],
      createdAt: r.created_at,
      showTitle: r.bookings?.shows?.title ?? "",
      session: r.bookings?.show_sessions
        ? `${r.bookings.show_sessions.weekday_label} ${r.bookings.show_sessions.date_label} · ${r.bookings.show_sessions.time_label}`
        : "",
    }));
  });
