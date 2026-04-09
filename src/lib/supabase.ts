import { createClient } from '@supabase/supabase-js'

// These would normally be stored in .env files.
// For now we setup the structure. When you have your Supabase project,
// you can replace these strings with the actual env variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
