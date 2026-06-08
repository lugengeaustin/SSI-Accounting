import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.warn("Missing Supabase env vars — copy .env.example to .env and fill them in.");
}

export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
