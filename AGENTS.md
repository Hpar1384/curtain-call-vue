<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rules
- New schema changes go only in `drizzle/migrations/`; `supabase/migrations/` is frozen history — single source of truth avoids drift.
- Booking/ticket status changes only via SECURITY DEFINER RPCs; shared seat release lives in `_release_bookings` — avoids duplicated cancel logic.
- Financial rows (bookings, items, tickets, payments, check_ins) use ON DELETE RESTRICT — paid data must never cascade-delete.
