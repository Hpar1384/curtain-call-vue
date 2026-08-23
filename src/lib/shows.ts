import posterHamlet from "@/assets/poster-hamlet.jpg";
import posterSeller from "@/assets/poster-seller.jpg";
import posterRhinoceros from "@/assets/poster-rhinoceros.jpg";
import posterVeil from "@/assets/poster-veil.jpg";
import type { SessionDTO, ShowDTO } from "@/lib/catalog-types";

export { toPersianNumber, formatPrice } from "@/lib/format";

export type Session = SessionDTO;

export type Show = Omit<ShowDTO, "posterKey"> & { poster: string };

const posters: Record<string, string> = {
  hamlet: posterHamlet,
  seller: posterSeller,
  rhinoceros: posterRhinoceros,
  veil: posterVeil,
};

export function toShow(dto: ShowDTO): Show {
  const { posterKey, ...rest } = dto;
  return { ...rest, poster: posters[posterKey] ?? posterHamlet };
}

export function getSession(show: Show, sessionId: string): Session | undefined {
  return show.sessions.find((s) => s.id === sessionId);
}

export const MIN_TICKETS = 1;
export const MAX_TICKETS = 10;
