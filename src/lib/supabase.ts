import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key);

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    "[SSI Accounting] Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). " +
      "Run `npm run dev` inside the web/ folder (where .env lives), then restart the dev server."
  );
}

// Use safe placeholders if env is missing so the app still renders a login screen
// (with the console error above) instead of a blank white page.
export const supabase = createClient<Database>(
  url || "https://placeholder.supabase.co",
  key || "placeholder-anon-key",
  { auth: { persistSession: true, autoRefreshToken: true } }
);
