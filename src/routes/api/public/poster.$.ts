import { createFileRoute } from "@tanstack/react-router";

/** Serves uploaded posters from the private "posters" bucket (public-read policy). */
export const Route = createFileRoute("/api/public/poster/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";
        if (!/^upload\/[a-zA-Z0-9._-]+$/.test(path)) {
          return new Response("Not found", { status: 404 });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
              h.set("apikey", key);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const { data, error } = await supabase.storage.from("posters").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: {
            "Content-Type": data.type || "image/jpeg",
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      },
    },
  },
});
