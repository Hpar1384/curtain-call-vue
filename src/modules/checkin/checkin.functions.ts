import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  CheckinResult,
  SessionStats,
  StaffSessionDTO,
} from "@/modules/checkin/checkin-types";
import { sessionLabels } from "@/lib/session-time";

export const checkStaffAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ canCheckin: boolean }> => {
    const { data, error } = await context.supabase.rpc("can_checkin", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { canCheckin: data === true };
  });

type SessionRow = {
  id: string;
  starts_at: string;
  shows: { title: string; halls: { name: string } | null } | null;
};

export const listStaffSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffSessionDTO[]> => {
    const { data: allowed, error: roleError } = await context.supabase.rpc(
      "can_checkin",
      { _user_id: context.userId },
    );
    if (roleError) throw new Error(roleError.message);
    if (allowed !== true) throw new Error("اجازهٔ دسترسی ندارید");

    const { data, error } = await context.supabase
      .from("show_sessions")
      .select("id, starts_at, shows(title, halls(name))")
      .order("starts_at", { ascending: true });
    if (error) throw new Error(error.message);

    return ((data ?? []) as unknown as SessionRow[]).map((row) => ({
      id: row.id,
      showTitle: row.shows?.title ?? "",
      hall: row.shows?.halls?.name ?? "",
      ...sessionLabels(row.starts_at),
    }));
  });

export const checkinTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ code: z.string().min(1).max(200), sessionId: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CheckinResult> => {
    const { data: result, error } = await context.supabase.rpc("checkin_ticket", {
      p_code: data.code,
      p_session_id: data.sessionId,
    });
    if (error) throw new Error(error.message);
    const r = result as unknown as CheckinResult & { startsAt?: string };
    if (r.ok) return { ...r, ...sessionLabels(r.startsAt) };
    return r;
  });

export const getSessionStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<SessionStats> => {
    const { data: stats, error } = await context.supabase.rpc("staff_session_stats", {
      p_session_id: data.sessionId,
    });
    if (error) throw new Error(error.message);
    return stats as unknown as SessionStats;
  });
