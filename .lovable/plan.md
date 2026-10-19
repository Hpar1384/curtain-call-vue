# Stage 4 — Test-only cancellations and refunds

## Verified starting point
- Secure bookings, server-verified test payments, tickets and cancellation already exist.
- Late successful payments are flagged with `needs_refund`; no refund request system exists.
- You chose time-based tiers previously, but exact windows and percentages were never approved. Existing documentation still describes several already-implemented features as deferred.

## Policy setup
- Add admin-editable cancellation/refund rules with recorded change history.
- Initialize only the rate you explicitly supplied: **late-payment refunds = 0%**.
- Leave ordinary refund tiers and the precise cancellation cutoff **unconfigured**, rather than inventing amounts or deadlines. Customer policy-based requests remain unavailable until an admin supplies a complete policy.
- Do not allow customer cancellation for a zero-refund case or after the configured cancellation cutoff.
- Snapshot the policy and eligible amount when a request is submitted; later policy edits do not silently alter existing requests.

## Customer experience
- Show eligibility, refund amount and request status alongside existing tickets, retaining the current design.
- Support eligible cancellation of one unused ticket without cancelling the other tickets in that booking.
- Submit cancellation and its refund request together atomically, releasing only the affected seat through shared database logic.
- Prevent an alternate customer cancellation path from bypassing the configured policy.

## Admin operations
- Add refund request management, approval/rejection and policy settings to the existing panel.
- Keep payment records unchanged. Refund approval is not a money transfer; use explicit test-only statuses, never real-refund completion.
- Provide idempotent creation/review of late-payment refund cases, including zero-amount cases.
- Retain no-show records and their audit trail. Make no-show handling an explicit admin action in this stage, not an invented automatic deadline.
- Provide audited admin recovery review. Ticket restoration must verify seat availability, session eligibility and booking/ticket invariants; do not blindly restore cancelled bookings or seats. Refund recovery remains test-only and cannot claim money was returned.

## Technical approach and safety
- Add an incremental migration using the existing migration tool; preserve historical migrations.
- Keep payment, cancellation and refund records separate, immutable in their financial meaning and linked for audit.
- Use role-checked database RPCs, RLS, explicit grants, row locking and uniqueness constraints for all critical state changes and duplicate prevention.
- Reuse shared cancellation/seat-release logic and existing cancelled-booking ticket guards; preserve expiry protection for paid bookings.
- Put new refund server functions and client-safe types in a dedicated domain module; no wallet, new authentication model or gateway integration.
- Update architecture guidance and the living project context for this change only.

## Validation
- Add and run business-rule tests for the approved 0% late-payment rate, missing-policy blocking, policy boundaries once configured, individual cancellation, duplicate requests, approvals, no-show/recovery safety and authorization.
- Verify customer submission and admin review through the UI using clearly identified test records; report any unavailable verification.
- Check preview build/typecheck results and run lint and available tests. Do not manually launch a separate build/typecheck; the project harness runs them.

## Review and remaining decisions
This changes financial state and permissions in the shared backend, so approval is required before implementation. Exact refund tiers and cancellation cutoff will be set in the admin panel before customer policy-based cancellation is enabled. No real transfers or real-refund completion will be implemented.