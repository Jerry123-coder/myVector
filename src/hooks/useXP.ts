import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr } from '../lib/db';

// ── Full 13-Tier XP Economy ──────────────────────────────────────────────────
export const ECONOMY_TIERS = [
  { xp: 50,   label: 'Premium Coffee or Specialty Juice',         id: 'tier-50'   },
  { xp: 130,  label: 'LED Desk Lamp',                             id: 'tier-130'  },
  { xp: 250,  label: 'Fine Dining Experience #1',                 id: 'tier-250'  },
  { xp: 500,  label: 'Niche Fragrance #1',                        id: 'tier-500'  },
  { xp: 750,  label: 'Pottery Class with a Friend',               id: 'tier-750'  },
  { xp: 1000, label: 'New Tech Accessory / Productivity Tool',    id: 'tier-1000' },
  { xp: 1250, label: 'A Spa Session',                             id: 'tier-1250' },
  { xp: 1500, label: 'Fine Dining Experience #2',                 id: 'tier-1500' },
  { xp: 2000, label: 'Weekend Day Trip',                          id: 'tier-2000' },
  { xp: 2500, label: 'Signature Custom Tailored Piece',           id: 'tier-2500' },
  { xp: 3000, label: "The 'Ace' Desk Peripheral Upgrade",         id: 'tier-3000' },
  { xp: 3500, label: 'Premium Leather Goods',                     id: 'tier-3500' },
  { xp: 4000, label: 'End-of-Year Wardrobe Signature Completion', id: 'tier-4000' },
];

// ── XP Weights ────────────────────────────────────────────────────────────────
export const XP_WEIGHTS = {
  'deep-work': 10,   // Triggered by completing a Focus Session in TimerView
  'skill':     5,
  'workout':   5,
  'admin':     2,
} as const;

/** Returns true if the given date string is a Sunday (Zero-XP rest day) */
export function isSunday(dateStr: string): boolean {
  return new Date(dateStr + 'T12:00:00').getDay() === 0;
}

/** Gets the ISO week key (YYYY-Www) for a date string */
function weekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function useXP() {
  const xpLogs = useLiveQuery(() => db.xpLogs.toArray()) || [];

  const today = todayStr();
  const todayIsRestDay = isSunday(today);

  // Total XP — xpLogs are the source of truth
  const totalXP = xpLogs.reduce((sum, log) => sum + log.amount, 0);

  // Today's XP (zero if Sunday)
  const xpToday = todayIsRestDay ? 0 : xpLogs
    .filter(log => log.date === today)
    .reduce((sum, log) => sum + log.amount, 0);

  // Relationship XP this week (max 10/week = 5 check-ins × 2 XP)
  const currentWeek = weekKey(today);
  const relationshipXpThisWeek = xpLogs
    .filter(log => log.category === 'relationship' && weekKey(log.date) === currentWeek)
    .reduce((sum, log) => sum + log.amount, 0);
  const relationshipCheckinsDone = Math.floor(relationshipXpThisWeek / 2);
  const canLogRelationship = relationshipXpThisWeek < 10;

  // Tier tracking
  let currentTier = null;
  let nextTier = ECONOMY_TIERS[0];
  for (let i = 0; i < ECONOMY_TIERS.length; i++) {
    if (totalXP >= ECONOMY_TIERS[i].xp) {
      currentTier = ECONOMY_TIERS[i];
      nextTier = ECONOMY_TIERS[i + 1] || ECONOMY_TIERS[i];
    } else {
      break;
    }
  }

  // ── Streak Calculation ───────────────────────────────────────────────────────
  const streaks = useLiveQuery(() => db.dailyStreaks.orderBy('date').reverse().limit(365).toArray()) || [];

  // Current consecutive streak (skips Sundays)
  let currentStreak = 0;
  let cursor = today;
  for (const r of streaks) {
    if (r.date !== cursor) break;
    // Sundays are rest days — don't break streak but don't count as a "done" day
    if (!isSunday(r.date) && !r.allDone) break;
    if (!isSunday(r.date)) currentStreak++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().split('T')[0];
  }

  // How many "all done" days in the last 7 rolling days (for Ace Streak tracking)
  const last7DaysDoneCount = streaks.slice(0, 7).filter(s => s.allDone && !isSunday(s.date)).length;

  // ── Ace Streak auto-award (+50 XP for 6/6 perfect week) ────────────────────
  useEffect(() => {
    if (last7DaysDoneCount < 6) return;
    const currentWeekKey = weekKey(today);
    const aceKey = `vector_ace_streak_awarded_${currentWeekKey}`;
    if (localStorage.getItem(aceKey)) return;

    // Award it
    db.xpLogs.add({
      date: today,
      amount: 50,
      reason: 'Ace Streak — Perfect 6/6 Week',
      category: 'bonus',
      createdAt: Date.now(),
    });
    localStorage.setItem(aceKey, '1');
  }, [last7DaysDoneCount, today]);

  // ── Tier notification on threshold crossing ──────────────────────────────────
  useEffect(() => {
    if (!currentTier) return;
    const lastNotified = localStorage.getItem('vector_last_tier_notified');
    if (lastNotified !== currentTier.id) {
      if (lastNotified !== null) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Reward Unlocked! 🎉', {
            body: `${currentTier.label} — ${currentTier.xp} XP reached`,
            icon: '/icon.svg'
          });
        }
      }
      localStorage.setItem('vector_last_tier_notified', currentTier.id);
    }
  }, [currentTier]);

  return {
    totalXP: Number(totalXP.toFixed(0)),
    xpToday: Number(xpToday.toFixed(0)),
    logs: xpLogs.sort((a, b) => b.createdAt - a.createdAt),
    currentTier,
    nextTier,
    currentStreak,
    last7DaysDoneCount,
    todayIsRestDay,
    canLogRelationship,
    relationshipCheckinsDone,
    relationshipXpThisWeek,
  };
}
