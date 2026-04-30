import { db } from './db';

/**
 * Calculates task completion velocity for the last 30 days vs the preceding 30 days.
 * Returns a percentage representing the change in productivity.
 */
export async function calculateVelocity() {
  try {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const startOfCurrent = now - thirtyDaysMs;
    const startOfPrevious = now - (thirtyDaysMs * 2);

    // Using .filter() for safety during schema migrations, 
    // though the index is now available in v7.
    const currentTasks = await db.tasks
      .where('completedAt')
      .between(startOfCurrent, now)
      .count();

    const previousTasks = await db.tasks
      .where('completedAt')
      .between(startOfPrevious, startOfCurrent)
      .count();

    if (previousTasks === 0) return currentTasks > 0 ? 100 : 0;
    
    const diff = currentTasks - previousTasks;
    return Math.round((diff / previousTasks) * 100);
  } catch (err) {
    console.error("Velocity calculation failed:", err);
    return 0;
  }
}

/**
 * Logic to determine the "Primary Mission" (Hero Objective).
 * Priority:
 * 1. Explicitly isPinned
 * 2. status === 'at-risk'
 * 3. Nearest targetDate
 */
export async function getPrimaryMission() {
  try {
    const annuals = await db.annualGoals.where('status').notEqual('done').toArray();
    const quarterlies = await db.quarterlyGoals.where('status').notEqual('done').toArray();
    
    const all = [
      ...annuals.map(a => ({ ...a, type: 'annual' as const })),
      ...quarterlies.map(q => ({ ...q, type: 'quarterly' as const }))
    ];

    if (all.length === 0) return null;

    // 1. Pinned
    const pinned = all.find(g => g.isPinned);
    if (pinned) return pinned;

    // 2. Sort by Urgency (At-risk first, then nearest date)
    return all.sort((a, b) => {
      // At-risk priority
      if (a.status === 'at-risk' && b.status !== 'at-risk') return -1;
      if (b.status === 'at-risk' && a.status !== 'at-risk') return 1;

      // Date proximity
      const aDate = a.targetDate || Infinity;
      const bDate = b.targetDate || Infinity;
      return aDate - bDate;
    })[0];
  } catch (err) {
    console.error("Primary mission retrieval failed:", err);
    return null;
  }
}

/**
 * Formats a timestamp into a T-Minus string (e.g., T-14 DAYS)
 */
export function getTMinus(targetDate: number | undefined) {
  if (!targetDate) return 'NO_DEADLINE';
  try {
    const now = Date.now();
    const diff = targetDate - now;
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));

    if (days < 0) return `OVERDUE ${Math.abs(days)}D`;
    if (days === 0) return 'T-0 DAYS';
    return `T-${days} DAYS`;
  } catch (err) {
    return 'ERR';
  }
}
