import { supabase } from './supabase';
import { db } from './db';
import type { User } from '@supabase/supabase-js';

// Mapping utilities
const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCase = (str: string) => str.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));

const mapToSupabase = (obj: any) => {
  const mapped: any = {};
  for (const key in obj) {
    // Keep internal local IDs out of Supabase if they are numbers
    if (key === 'id' && typeof obj[key] === 'number') continue;
    mapped[toSnakeCase(key)] = obj[key];
  }
  return mapped;
};

const mapFromSupabase = (obj: any) => {
  const mapped: any = {};
  for (const key in obj) {
    mapped[toCamelCase(key)] = obj[key];
  }
  return mapped;
};

// Generic sync function for a table
const syncTable = async (tableName: string, supabaseTable: string, user: User) => {
  const table = (db as any)[tableName];
  if (!table) return;

  // 1. Fetch local records that don't have a userId or belong to another user
  const localRecords = await table.filter((r: any) => !r.userId || r.userId !== user.id).toArray();

  if (localRecords.length > 0) {
    console.log(`Syncing ${localRecords.length} local records to ${supabaseTable}...`);
    
    const toUpload = localRecords.map((r: any) => {
      const mapped = mapToSupabase(r);
      return {
        ...mapped,
        user_id: user.id,
      };
    });

    const { error } = await supabase.from(supabaseTable).upsert(toUpload);

    if (!error) {
      for (const r of localRecords as { id?: number }[]) {
        if (r.id != null) await table.update(r.id, { userId: user.id });
      }
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
    for (const remote of remoteRecords) {
      const mappedRemote = mapFromSupabase(remote);
      
      // Check if we already have this record locally
      const local = await table.filter((l: any) => 
        (l.title && l.title === mappedRemote.title) || 
        (l.label && l.label === mappedRemote.label) ||
        (l.startTime && l.startTime === mappedRemote.startTime) ||
        (l.date && l.date === mappedRemote.date && l.label === mappedRemote.label)
      ).first();

      if (!local) {
        const { id: _remoteId, ...dataToSave } = mappedRemote as Record<string, unknown> & { id?: unknown };
        await table.add(dataToSave);
      }
    }
  }
};

export const syncAllData = async (user: User) => {
  console.log("Starting full sync...");
  try {
    // Strategic Hierarchy
    await syncTable('multiYearGoals', 'multi_year_goals', user);
    await syncTable('annualGoals', 'annual_goals', user);
    await syncTable('quarterlyGoals', 'quarterly_goals', user);
    
    // Tactics & Execution
    await syncTable('sprints', 'sprints', user);
    await syncTable('tasks', 'tasks', user);
    await syncTable('milestones', 'milestones', user);
    await syncTable('dailyTasks', 'daily_tasks', user);
    
    // Metrics & Gamification
    await syncTable('sessions', 'sessions', user);
    await syncTable('rewards', 'rewards', user);
    await syncTable('dailyStreaks', 'daily_streaks', user);
    
    console.log("Sync complete.");
  } catch (err) {
    console.error("Sync failed:", err);
  }
};
