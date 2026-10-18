import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloudConfigured = !!(url && key);
let client;
export function getSupabase() {
  if (!cloudConfigured)
    throw new Error(
      "Supabase is not configured. Add the public URL and anon key to .env.local, then restart Vite.",
    );
  if (!client) client = createClient(url, key);
  return client;
}
// A deliberately explicit boundary: no private key, call simulation, or fake connection.
export const vapiIntegration = {
  available: false,
  description:
    "Vapi phone calling is not connected. Browser speech and text are available without an account.",
};
