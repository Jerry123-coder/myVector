import { createClient } from '@supabase/supabase-js'

// These would normally be stored in .env files.
// For now we setup the structure. When you have your Supabase project,
// you can replace these strings with the actual env variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
