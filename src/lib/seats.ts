import type { SeatDTO } from "@/lib/catalog-types";

/** Visual aisle after this column index (1-based). */
export const AISLE_AFTER = 5;

export const MAX_SEATS = 8;

export type SeatStatus = SeatDTO["status"];
export type Seat = SeatDTO;
