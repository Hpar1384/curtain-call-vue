export const SEAT_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
export const SEATS_PER_ROW = 10;
/** Visual aisle after this column index (1-based). */
export const AISLE_AFTER = 5;

export type SeatStatus = "free" | "reserved";

export type Seat = {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Deterministic seat map for a show/session pair.
 * Replace with a backend query when the database is connected.
 */
export function getSeatMap(showId: string, sessionId: string): Seat[] {
  const seed = hash(`${showId}:${sessionId}`);
  const seats: Seat[] = [];
  SEAT_ROWS.forEach((row, r) => {
    for (let n = 1; n <= SEATS_PER_ROW; n++) {
      const v = hash(`${seed}:${r}:${n}`) % 100;
      seats.push({
        id: `${row}${n}`,
        row,
        number: n,
        status: v < 28 ? "reserved" : "free",
      });
    }
  });
  return seats;
}

export const MAX_SEATS = 8;
