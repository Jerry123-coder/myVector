import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// These would normally be stored in .env files.
// For now we setup the structure. When you have your Supabase project,
// you can replace these strings with the actual env variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: {}, error: new Error('Supabase not configured') }),
        signUp: async () => ({ data: {}, error: new Error('Supabase not configured') }),
      },
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null })
        }),
        upsert: async () => ({ error: null })
      })
    } as any as SupabaseClient);
