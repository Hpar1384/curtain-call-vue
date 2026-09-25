# Curtain Call — Project Context

> Living engineering brief for the current state of the project.
> This file records current status, verified decisions, risks, and roadmap.
> It is intentionally separate from ARCHITECTURE.md and AGENTS.md.

## 1. Project

**Name:** Curtain Call

**Product:** Persian (RTL) theatre ticketing PWA with an admin panel.

**Core user flow:**

Browse shows → select session → select seats → mock payment → receive QR ticket → staff check-in

**Primary engineering partner:** Claude
**Current development environment:** Claude Chat + GitHub repository
**Future environment:** Claude Code may become the primary implementation environment.

---

## 2. Current Development Phase

The project has moved beyond the initial MVP into a hardening and engineering-foundation phase.

Lovable was used for rapid MVP/product development.

Claude is now intended to become the primary engineering partner for:

* architecture-aware implementation
* bug fixing
* database changes
* testing
* hardening
* ongoing maintenance

Lovable may still be used for UI-focused iteration when appropriate.

---

## 3. Current Architecture

**Architecture:** Modular Monolith

**Frontend / application:** TanStack Start

**Backend:** Supabase + PostgreSQL

**Core principle:** The database is authoritative for critical business state transitions.

Server functions are intentionally thin where appropriate:

* validate input
* call authoritative RPC/database logic
* shape the response

Critical state transitions are implemented in PostgreSQL functions and protected by database constraints, row locking, triggers, and RLS where appropriate.

Do not introduce microservices unless there is a strong, explicitly justified reason.

Prefer incremental changes over large architectural rewrites.

---

## 4. Important Domain Model

Current core relationship:

shows
→ show_sessions
→ show_seats
← seats

`show_seats` represents per-session seat instances.

The booking/payment/check-in flow is implemented primarily through database functions and constraints.

---

## 5. Verified Business Invariants

These were directly re-verified against the current SQL in both:

* `supabase/migrations/`
* `drizzle/migrations/`

### Seat exclusivity

A seat cannot belong to two active bookings.

Protection includes:

* `FOR UPDATE` locking in `create_booking`
* partial unique index on `booking_items(show_seat_id)` where `active`

### Cancelled booking / ticket consistency

A cancelled booking cannot retain a valid ticket.

Protection includes:

* `booking_cancel_cascade_tickets`
* `guard_valid_ticket_booking`

This is enforced in both directions at the database level.

### Seat release consistency

Cancellation and expiry paths use the shared `_release_bookings()` logic.

Current relevant paths include:

* `cancel_ticket`
* `admin_cancel_booking`
* `expire_stale_bookings`

### Booking expiry

`expire_stale_bookings()` only targets:

* `pending`
* `awaiting_payment`

Paid bookings are not targeted.

The expiry process uses safe locking and is:

* invoked inline from booking creation
* scheduled hourly through `pg_cron`

### Financial record retention

Financial/domain records are protected from destructive deletion.

Relevant relationships use `RESTRICT` rather than cascading deletion, and direct deletion of bookings is restricted.

### Mock payment limitation

The payment outcome (`success`, `failed`, `cancelled`) is currently client-supplied because the payment gateway is mocked.

This is an intentional temporary exception.

All other important payment/booking conditions are revalidated server-side, including:

* booking ownership
* expiry
* seat state
* pricing/state required by the transaction

Do not treat the current mock-payment model as equivalent to a production payment gateway.

---

## 6. Current Engineering Gaps

The following are currently known and verified:

### No automated tests

There is currently no test runner/test suite covering the critical business invariants.

This is the largest current engineering gap.

### No CI

There is currently no CI pipeline enforcing:

* typecheck
* lint
* tests

### No staging environment

The project currently does not have a separate staging Supabase environment.

### `.env` hygiene

`.env` is currently committed to the repository and is not properly ignored despite documentation stating otherwise.

The current `.env` contains the public Supabase URL/anon key and does not contain a service-role secret, but this discrepancy must still be fixed.

---

## 7. Resolved Historical Issues

The following issues were previously identified but have now been verified as resolved in the current SQL:

* dual migration risk
* destructive `regenerate_hall_seats` behavior
* missing important indexes
* `admin_cancel_booking` failing to release seats
* divergent cancellation/expiry seat-release logic

Do not reintroduce these problems during future changes.

---

## 8. Current Technical Debt

### Module conventions

Two current conventions coexist:

* `src/lib/*.functions.ts`
* `src/modules/<domain>/...`

This is currently intentional and not considered urgent technical debt.

Prefer `modules/<domain>/` for new domain-specific modules where it is a natural fit.

Do not perform a broad rewrite merely to unify these conventions.

### Type escapes

There are approximately 24 `as unknown as` occurrences in the Supabase query-mapping layer.

This should be investigated when relevant, especially to confirm whether generated database types are synchronized correctly.

Do not refactor these blindly.

### Admin reporting

Current reporting focuses on check-in rates.

Revenue/financial reporting is not yet implemented.

---

## 9. Current Priority Order

Before adding another major product feature, establish the engineering safety net.

Current recommended order:

1. Fix `.env` / `.gitignore`
2. Establish a separate staging Supabase project
3. Add a minimal RPC/business-invariant test harness
4. Add CI for typecheck + lint, then tests
5. Only then proceed with the next high-impact product feature

---

## 10. Initial Test Priorities

Tests should focus on database and business invariants rather than UI snapshots.

Initial high-value tests:

1. Two concurrent booking attempts for the same seat:

   * exactly one should succeed
   * the other should fail safely

2. Cancelled booking cannot retain a valid ticket.

3. Cancellation releases seats correctly.

4. Expiry releases eligible bookings correctly.

5. Expiry does not affect paid bookings.

6. Check-in cannot successfully reuse an already checked-in ticket.

Tests should be designed around actual RPC/database behavior.

---

## 11. Features Intentionally Deferred

### Refunds / wallet

Deferred until:

* a real payment gateway exists
* core RPC tests exist
* the financial model is explicitly reviewed

### Mobile OTP authentication

Deferred because authentication changes affect:

* `auth.uid()`
* RLS
* identity assumptions across the schema

OTP should be treated as a dedicated reviewed project rather than a side task.

### Advanced seat-map engine

Zones/balconies and other advanced layouts are deferred until the current model is proven insufficient.

Avoid premature database/layout rewrites.

---

## 12. Pending Product / Architecture Decisions

These decisions are not yet finalized:

### Payment gateway

Provider and timing remain undecided.

### Authentication

Current authentication is email/password.

OTP is not implemented.

### User profile model

There is currently no established schema for:

* first name
* last name
* mobile/phone

`profile.tsx` exists but does not yet have a corresponding complete profile schema.

### Migration history

`supabase/migrations/` is treated as frozen historical migration history.

Existing migration files should not be edited retrospectively.

Future schema changes should use new migrations.

---

## 13. Development Workflow

Use:

Issue
→ analysis
→ implementation plan
→ branch
→ implementation + migration when required
→ tests
→ review
→ staging validation
→ production

Human review is mandatory for high-risk changes involving:

* payments
* refunds
* wallet/financial state
* bookings/concurrency
* authentication
* roles/permissions
* RLS
* SECURITY DEFINER
* destructive migrations
* major database changes
* major architecture changes

Never bypass production safety checks for convenience.

---

## 14. Source-of-Truth Rules

When documentation and implementation disagree:

1. Inspect the actual implementation.
2. Inspect the relevant SQL/migrations/RLS/RPCs.
3. Determine which state is actually current.
4. Update documentation/context after the discrepancy is resolved.

Do not claim that something exists merely because documentation says it exists.

Never fabricate repository state.

---

## 15. Current State Summary

As of 2026-09-26:

* Core booking architecture is implemented.
* Core payment flow is implemented as a mock gateway.
* Ticket generation is implemented.
* QR check-in flow is implemented.
* Admin cancellation is implemented.
* Booking expiry is implemented.
* Database invariants have been significantly hardened.
* Historical booking/cancellation integrity issues identified earlier have been resolved.
* Automated tests are missing.
* CI is missing.
* Dedicated staging is missing.
* `.env` hygiene requires correction.

The immediate engineering objective is therefore:

**Build the safety net around the existing architecture before expanding high-blast-radius product functionality.**

---

## 16. Maintenance Rule

This file is a living document.

Update it when a significant architectural, product, security, deployment, testing, authentication, payment, or database decision changes.

Do not rewrite it unnecessarily.

Keep it factual, current, and concise.
