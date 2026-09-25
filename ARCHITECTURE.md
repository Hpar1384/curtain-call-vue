# Architecture

Modular monolith: one app, one database, one auth. No separate backend or microservices.

## Layout
```text
src/routes/                 pages (thin; no business logic)
  _authenticated/           gated by login (beforeLoad → /auth?redirect=)
    admin.*                 admin panel (role checked server-side)
    staff.*                 staff check-in PWA (/staff, manifest public/staff.webmanifest)
src/lib/                    customer domain: catalog, booking, payment (*.functions.ts = server fns)
  payment-gateway.server.ts payment abstraction (mock provider today)
src/modules/admin/          admin server fns, DTOs, rules
src/modules/checkin/        scanner, staff session, check-in server fns
src/integrations/supabase/  generated clients + auth middleware (do not edit)
```
Server functions use `requireSupabaseAuth`, so RLS applies as the caller. Sensitive state changes happen only inside Postgres RPCs.

## Roles
`user_roles` table + `has_role()` (security definer). Roles: `admin`, `checkin_operator`, default customer. `can_checkin()` = admin or checkin_operator.

## Flows
**Booking** — `create_booking(slug, session, seat_labels)` locks seats atomically (unique active `booking_items.show_seat_id`), creates booking `awaiting_payment` with `expires_at`.

**Payment** — `process_payment(booking, outcome)`: only `success` marks booking `confirmed` (paid) and issues one ticket per seat; `failed`/`cancelled` release seats. Gateway is mocked and must be replaced before launch.

**Expiry** — `expire_stale_bookings()` cancels unpaid bookings past `expires_at`.

**Cancellation** — `cancel_ticket(ticket)` (owner/admin, not used tickets) and `admin_cancel_booking(booking)`. Admin cancel and expiry share `_release_bookings(ids[])` (tickets→cancelled, seats→available, items inactive, booking→cancelled).

**Ticket** — QR contains only an opaque ticket code; all validity comes from the database.

**Check-in** — `checkin_ticket(code, session)`: operator auth, row lock, checks not found / cancelled / unpaid / wrong session / already used, inserts `check_ins` (unique ticket_id) atomically. `staff_session_stats(session)` feeds the staff dashboard.

**Admin** — `admin_stats`, `admin_session_overview`, `admin_hall_overview`, `regenerate_hall_seats` (refuses if seats have bookings). Triggers: `guard_delete` (no deleting shows/sessions/halls in use), `audit_row` (audit_logs), `guard_inactive_show_booking`.

## Data integrity
Bookings, booking_items, tickets, payments and check_ins use `ON DELETE RESTRICT`; bookings are never hard-deleted (no DELETE grant). Direct UPDATE of bookings/tickets is revoked; only RPCs change status.
