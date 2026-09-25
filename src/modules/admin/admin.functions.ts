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
  AdminAuditDTO,
  AdminTheaterDTO,
  AdminUserDTO,
  AppRole,
} from "@/modules/admin/admin-types";
import { sessionLabel } from "@/lib/session-time";

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

/** Resolve user ids → email/name. Caller MUST have passed assertAdmin. */
async function userEmails(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  const users = await listAllAuthUsers();
  for (const u of users) out.set(u.id, u.email);
  return out;
}

async function listAllAuthUsers(): Promise<
  { id: string; email: string; name: string; createdAt: string; lastSignInAt: string | null }[]
> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const all: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    lastSignInAt: string | null;
  }[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    for (const u of data.users) {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      all.push({
        id: u.id,
        email: u.email ?? "",
        name: String(meta["full_name"] ?? meta["name"] ?? ""),
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
      });
    }
    if (data.users.length < 1000) break;
  }
  return all;
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
        "id, slug, title, description, poster_key, is_active, director, genre, duration_minutes, age_rating, price, sort_order, hall_id, halls(name)",
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
  is_active: z.boolean().default(true),
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
    const { data: ov, error: ovErr } = await context.supabase.rpc("admin_hall_overview");
    if (ovErr) throw new Error(ovErr.message);
    const byId = new Map(
      (
        (ov ?? []) as unknown as {
          id: string;
          capacity: number;
          showCount: number;
          layoutLocked: boolean;
        }[]
      ).map((o) => [o.id, o]),
    );
    return (
      (data ?? []) as unknown as (AdminHallDTO & { theaters: { name: string } | null })[]
    ).map((r) => ({
      ...r,
      theaterName: r.theaters?.name ?? "",
      capacity: byId.get(r.id)?.capacity ?? 0,
      showCount: byId.get(r.id)?.showCount ?? 0,
      layoutLocked: byId.get(r.id)?.layoutLocked ?? false,
    }));
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
      .select("id, show_id, starts_at, sort_order, shows(title, halls(name))")
      .order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: ov, error: ovErr } = await context.supabase.rpc("admin_session_overview");
    if (ovErr) throw new Error(ovErr.message);
    type Ov = {
      id: string;
      capacity: number;
      activeBookings: number;
      ticketsTotal: number;
      checkedIn: number;
    };
    const byId = new Map(((ov ?? []) as unknown as Ov[]).map((o) => [o.id, o]));
    return (
      (data ?? []) as unknown as (AdminSessionDTO & {
        shows: { title: string; halls: { name: string } | null } | null;
      })[]
    ).map((r) => {
      const o = byId.get(r.id);
      return {
        ...r,
        label: sessionLabel(r.starts_at),
        showTitle: r.shows?.title ?? "",
        hallName: r.shows?.halls?.name ?? "",
        capacity: o?.capacity ?? 0,
        activeBookings: o?.activeBookings ?? 0,
        ticketsTotal: o?.ticketsTotal ?? 0,
        checkedIn: o?.checkedIn ?? 0,
      };
    });
  });

const sessionInput = z.object({
  id: z.string().uuid().optional(),
  show_id: z.string().uuid(),
  starts_at: z.string().datetime({ offset: true }),
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
    const { error } = await context.supabase.from("show_sessions").delete().eq("id", data.id);
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
        "id, user_id, status, total_price, seat_count, created_at, expires_at, shows(title), show_sessions(starts_at), booking_items(show_seats(seats(row_label, seat_number)))",
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
      expires_at: string | null;
      shows: { title: string } | null;
      show_sessions: { starts_at: string } | null;
      booking_items: {
        show_seats: { seats: { row_label: string; seat_number: number } | null } | null;
      }[];
    };

    const rows = (data ?? []) as unknown as Row[];
    const emails = await userEmails(rows.map((r) => r.user_id));
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: emails.get(r.user_id) ?? r.user_id.slice(0, 8),
      expiresAt: r.expires_at,
      status: r.status as AdminBookingDTO["status"],
      total: r.total_price,
      seatCount: r.seat_count,
      createdAt: r.created_at,
      showTitle: r.shows?.title ?? "",
      session: sessionLabel(r.show_sessions?.starts_at),
      seats: r.booking_items
        .map((i) => i.show_seats?.seats)
        .filter((s): s is { row_label: string; seat_number: number } => Boolean(s))
        .map((s) => `${s.row_label}${s.seat_number}`)
        .sort(),
    }));
  });

export const adminCancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("admin_cancel_booking", { p_booking_id: data.id });
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
        "id, user_id, ticket_code, seat_label, status, created_at, used_at, bookings(shows(title), show_sessions(starts_at))",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    type Row = {
      id: string;
      user_id: string;
      ticket_code: string;
      seat_label: string;
      status: string;
      created_at: string;
      used_at: string | null;
      bookings: {
        shows: { title: string } | null;
        show_sessions: { starts_at: string } | null;
      } | null;
    };

    const rows = (data ?? []) as unknown as Row[];
    const emails = await userEmails(rows.map((r) => r.user_id));
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: emails.get(r.user_id) ?? r.user_id.slice(0, 8),
      usedAt: r.used_at,
      code: r.ticket_code,
      seat: r.seat_label,
      status: r.status as AdminTicketDTO["status"],
      createdAt: r.created_at,
      showTitle: r.bookings?.shows?.title ?? "",
      session: sessionLabel(r.bookings?.show_sessions?.starts_at),
    }));
  });

export const adminCancelTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("cancel_ticket", { p_ticket_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Manual check-in by an admin — same atomic backend validation as the staff scanner. */
export const adminManualCheckin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: boolean; code?: string }> => {
    await assertAdmin(context);
    const { data: res, error } = await context.supabase.rpc("checkin_ticket", {
      p_code: data.code,
      p_session_id: null as unknown as string,
    });
    if (error) throw new Error(error.message);
    return res as unknown as { ok: boolean; code?: string };
  });

/* ---------------------------------- seats --------------------------------- */

export const adminHallSeats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ hallId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ row: string; number: number }[]> => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("seats")
      .select("row_label, seat_number")
      .eq("hall_id", data.hallId)
      .order("row_label")
      .order("seat_number");
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ row: r.row_label, number: r.seat_number }));
  });

/* -------------------------------- audit log -------------------------------- */

export const adminListAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminAuditDTO[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("audit_logs")
      .select("id, actor_email, action, entity, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      actor: r.actor_email ?? "—",
      action: r.action,
      entity: r.entity,
      details: (r.details ?? {}) as Record<string, string | number | boolean | null>,
      createdAt: r.created_at,
    }));
  });

/* -------------------------------- theaters -------------------------------- */

export const adminListTheatersFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminTheaterDTO[]> => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("theaters")
      .select("id, name, city, halls(id)")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (
      (data ?? []) as unknown as {
        id: string;
        name: string;
        city: string;
        halls: { id: string }[];
      }[]
    ).map((t) => ({ id: t.id, name: t.name, city: t.city, hallCount: t.halls.length }));
  });

export const adminSaveTheater = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(120),
        city: z.string().trim().min(1).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { id, ...values } = data;
    const { error } = id
      ? await context.supabase.from("theaters").update(values).eq("id", id)
      : await context.supabase.from("theaters").insert(values);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTheater = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("theaters").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------- users --------------------------------- */

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUserDTO[]> => {
    await assertAdmin(context);
    const users = await listAllAuthUsers();
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("user_id, role");
    if (error) throw new Error(error.message);
    const byUser = new Map<string, AppRole[]>();
    for (const r of roles ?? []) {
      byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role as AppRole]);
    }
    return users
      .map((u) => ({ ...u, roles: byUser.get(u.id) ?? [], isSelf: u.id === context.userId }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "checkin_operator"]),
        enabled: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    if (data.userId === context.userId && data.role === "admin" && !data.enabled) {
      throw new Error("نمی‌توانید نقش مدیریت را از حساب خودتان بردارید");
    }
    if (data.enabled) {
      const { error } = await context.supabase
        .from("user_roles")
        .upsert(
          { user_id: data.userId, role: data.role },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
