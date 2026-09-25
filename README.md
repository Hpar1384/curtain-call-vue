# Curtain Call

Persian (RTL) theater ticketing app: browse shows → pick session → pick seats → pay (mock gateway) → digital ticket with QR → staff check-in PWA. Includes an admin panel.

## Stack
- TanStack Start v1 (React 19, SSR, server functions) + Vite 7, deployed to an edge Worker
- Tailwind CSS v4 (tokens in `src/styles.css`), Vazirmatn font
- TanStack Query for data
- Supabase (Postgres + Auth + Storage) via Lovable Cloud; business rules in RLS + SECURITY DEFINER RPCs

## Run
```bash
bun install
cp .env.example .env   # fill with project URL + publishable key
bun run dev            # http://localhost:8080
bun run build
bun run lint
bunx tsgo --noEmit     # type check
```

## Environment
Only public values live in `.env` (URL + publishable key). `.env` is git-ignored. No service-role key or secret is used in the client or stored in the repo; privileged work is done by database RPCs that check `auth.uid()` + roles.

## Migrations (source of truth)
- **`drizzle/migrations/` is the single source of truth for all new schema changes.** Each file is plain SQL applied in order; Drizzle Kit owns `meta/_journal.json`.
- `supabase/migrations/` is **frozen history** (initial schema, phases 1–6). It is already applied to the database and must not be edited, deleted or extended.
- Full schema = `supabase/migrations/*` (chronological) followed by `drizzle/migrations/*` (by number).
- Rules: additive changes only; never edit an applied migration; never apply ad-hoc SQL to production outside a migration.

See `ARCHITECTURE.md` for modules and flows.
