import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { toPersianNumber } from "@/lib/format";
import { sessionLabels } from "@/lib/session-time";
import type { SeatDTO, ShowDTO } from "@/lib/catalog-types";

function publicClient(): SupabaseClient<Database> {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const showSelect =
  "id, slug, title, description, poster_key, director, genre, duration_minutes, age_rating, price, sort_order, halls(name, theaters(name)), show_sessions(id, starts_at, sort_order)";

type ShowRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  poster_key: string;
  director: string | null;
  genre: string | null;
  duration_minutes: number;
  age_rating: string | null;
  price: number;
  halls: { name: string; theaters: { name: string } | null } | null;
  show_sessions: {
    id: string;
    starts_at: string;
    sort_order: number;
  }[];
};

async function toShowDTO(supabase: SupabaseClient<Database>, row: ShowRow): Promise<ShowDTO> {
  const sessions = [...row.show_sessions]
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.sort_order - b.sort_order)
    .map((s) => ({ id: s.id, startsAt: s.starts_at, ...sessionLabels(s.starts_at) }));

  let availableSeats = 0;
  const first = sessions[0];
  if (first) {
    const { count } = await supabase
      .from("show_seats")
      .select("id", { count: "exact", head: true })
      .eq("session_id", first.id)
      .eq("status", "available");
    availableSeats = count ?? 0;
  }

  return {
    id: row.slug,
    title: row.title,
    description: row.description,
    posterKey: row.poster_key,
    date: first?.date ?? "",
    time: first?.time ?? "",
    venue: `${row.halls?.name ?? ""} — ${row.halls?.theaters?.name ?? ""}`,
    duration: `${toPersianNumber(row.duration_minutes)} دقیقه`,
    ageRating: row.age_rating ?? "",
    price: row.price,
    availableSeats,
    director: row.director ?? "",
    genre: row.genre ?? "",
    sessions,
  };
}

export const listShows = createServerFn({ method: "GET" }).handler(async (): Promise<ShowDTO[]> => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("shows")
    .select(showSelect)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return Promise.all(((data ?? []) as unknown as ShowRow[]).map((row) => toShowDTO(supabase, row)));
});

export const getShow = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data }): Promise<ShowDTO | null> => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("shows")
      .select(showSelect)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return toShowDTO(supabase, row as unknown as ShowRow);
  });

export const getSeatMap = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<SeatDTO[]> => {
    const supabase = publicClient();
    await supabase.rpc("expire_stale_bookings");
    const { data: rows, error } = await supabase
      .from("show_seats")
      .select("id, status, price, seats(row_label, seat_number)")
      .eq("session_id", data.sessionId);
    if (error) throw new Error(error.message);

    return (
      (rows ?? []) as unknown as {
        id: string;
        status: string;
        price: number | null;
        seats: { row_label: string; seat_number: number } | null;
      }[]
    )
      .filter((r) => r.seats)
      .map((r) => ({
        id: `${r.seats!.row_label}${r.seats!.seat_number}`,
        showSeatId: r.id,
        row: r.seats!.row_label,
        number: r.seats!.seat_number,
        price: r.price,
        status: r.status === "available" ? ("free" as const) : ("reserved" as const),
      }))
      .sort((a, b) => (a.row === b.row ? a.number - b.number : a.row.localeCompare(b.row)));
  });
