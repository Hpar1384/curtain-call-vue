import type { SessionDTO, ShowDTO } from "@/lib/catalog-types";
import { posterFor } from "@/lib/booking-ui";

export { toPersianNumber, formatPrice } from "@/lib/format";

export type Session = SessionDTO;

export type Show = Omit<ShowDTO, "posterKey"> & { poster: string };

export function toShow(dto: ShowDTO): Show {
  const { posterKey, ...rest } = dto;
  return { ...rest, poster: posterFor(posterKey) };
}

export function getSession(show: Show, sessionId: string): Session | undefined {
  return show.sessions.find((s) => s.id === sessionId);
}

export const MIN_TICKETS = 1;
export const MAX_TICKETS = 10;
