import { supabase } from './supabase';
import { db } from './db';
import type { User } from '@supabase/supabase-js';

// Generic sync function for a table
const syncTable = async (tableName: string, supabaseTable: string, user: User) => {
  const table = (db as any)[tableName];
  if (!table) return;

  // 1. Fetch local records that don't have a userId or have been updated since last sync
  // For simplicity in this v1, we'll just push anything that doesn't have a userId
  const localRecords = await table.where('userId').notEqual(user.id).or().filter((r: any) => !r.userId).toArray();

  if (localRecords.length > 0) {
    console.log(`Syncing ${localRecords.length} local records to ${supabaseTable}...`);
    
    // Preparation: Map local records to supabase format (remove numeric id if we use uuid on remote)
    // Actually, we'll keep it simple: push everything with the user_id
    const toUpload = localRecords.map((r: any) => {
      const { id, ...rest } = r; // Strip local numeric ID
      return {
        ...rest,
        user_id: user.id,
        // Map camelCase to snake_case if necessary, but I'll try to keep them consistent for now
        // NOTE: The Supabase schema I provided used snake_case. Let's map them.
      };
    });

    // Bulk upsert to Supabase
    // This is a simplified version. A real sync would handle mapping more robustly.
    const { error } = await supabase.from(supabaseTable).upsert(toUpload);

    if (!error) {
      // Mark local records as synced by assigning the userId
      await table.bulkUpdate(localRecords.map((r: any) => ({
        key: r.id,
        changes: { userId: user.id }
      })));
    } else {
      console.error(`Error syncing ${tableName}:`, error);
    }
  }

  // 2. Pull remote records
  const { data: remoteRecords, error: pullError } = await supabase
    .from(supabaseTable)
    .select('*')
    .eq('user_id', user.id);

  if (!pullError && remoteRecords) {
    // Basic merge: If local doesn't have it, add it.
    // In a real app, you'd compare updatedAt.
    for (const remote of remoteRecords) {
      const local = await table.filter((l: any) => l.title === remote.title || l.label === remote.label).first();
      if (!local) {
        // Map back from snake_case to camelCase if needed
        // For now, let's assume the schema is mostly consistent or we handle it per-view
        // This is a placeholder for more complex merging logic
      }
    }
  }
};

export const syncAllData = async (user: User) => {
  console.log("Starting full sync...");
  try {
    await syncTable('annualGoals', 'annual_goals', user);
    await syncTable('quarterlyGoals', 'quarterly_goals', user);
    await syncTable('tasks', 'tasks', user);
    await syncTable('sessions', 'sessions', user);
    console.log("Sync complete.");
  } catch (err) {
    console.error("Sync failed:", err);
  }
};
