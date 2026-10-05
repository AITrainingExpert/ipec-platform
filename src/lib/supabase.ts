import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These are read from Vite env vars at build time.
// If they are empty, the app runs in DEMO MODE (browser localStorage).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const HAS_SUPABASE = Boolean(url && anon);

export const supabase: SupabaseClient | null = HAS_SUPABASE
  ? createClient(url as string, anon as string)
  : null;

// Optional: Google Sheets sync webhook (Apps Script URL). Empty = skip.
export const SHEETS_WEBHOOK = (import.meta.env.VITE_SHEETS_WEBHOOK as string) || '';
