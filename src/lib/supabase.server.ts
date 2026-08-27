import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://cwjkoftxbcyghiqepqcb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3amtvZnR4YmN5Z2hpcWVwcWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NDM2OTMsImV4cCI6MjEwMzQxOTY5M30._TLNqsWMKWh_uwsIoiqgxlitza2bfP344AX9dKqejFQ";

export function getServerSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}