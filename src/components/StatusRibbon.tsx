import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { useDb } from '../lib/DbContext';
import { Shield, Zap, Target, Star, Rocket, Trophy, Flame } from 'lucide-react';

// XP Ascension Levels (Same as MilestonesView)
export const LEVELS = [
  { level: 1,  xp: 0,    title: 'Initiate',    icon: Shield },
  { level: 2,  xp: 50,   title: 'Operator',    icon: Zap },
  { level: 3,  xp: 150,  title: 'Specialist',  icon: Target },
  { level: 4,  xp: 300,  title: 'Tactician',   icon: Star },
  { level: 5,  xp: 500,  title: 'Strategist',  icon: Rocket },
  { level: 6,  xp: 750,  title: 'Commander',   icon: Trophy },
  { level: 7,  xp: 1100, title: 'Apex',        icon: Flame },
];

export function xpToLevel(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp) current = l;
    else break;
  }
  const nextIdx = LEVELS.indexOf(current) + 1;
  const next = LEVELS[nextIdx];
  const pctToNext = next ? Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100) : 100;
  return { current, next, pctToNext };
}

export const StatusRibbon = () => {
  const { db, isTestMode } = useDb();

  const sprintMetrics = useLiveQuery(
    async () => {
      const sprints = await db.sprints.toArray();
      const now = Date.now();
      const activeSprint = sprints.find(s => s.status === 'active' && s.startDate <= now && s.endDate >= now)
        ?? sprints.find(s => s.status === 'active')
        ?? sprints.find(s => s.startDate <= now && s.endDate >= now)
        ?? sprints.find(s => s.status === 'planned')
        ?? sprints[0];

      if (!activeSprint) {
        return {
          xp: 0,
          efficiency: 0,
          daysRemaining: 0,
          name: 'No Active Sprint'
        };
      }

      const tasks = await db.tasks.where('sprintId').equals(activeSprint.id!).toArray();
      const doneTasks = tasks.filter(t => t.status === 'done');
      
      const xp = doneTasks.reduce((acc, t) => {
        const wt = t.priority === 'HIGH' ? 30 : t.priority === 'MED' ? 20 : 10;
        return acc + wt;
      }, 0);

      const efficiency = tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0;
      const daysRemaining = Math.max(0, Math.ceil((activeSprint.endDate - now) / 86400000));

      return {
        xp,
        efficiency,
        daysRemaining,
        name: activeSprint.name
      };
    },
    [isTestMode]
  );

  const xp = sprintMetrics?.xp ?? 0;
  const efficiency = sprintMetrics?.efficiency ?? 0;
  const daysRemaining = sprintMetrics?.daysRemaining ?? 0;

  const { current: lvl } = xpToLevel(xp);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-[#0f1115]/60 backdrop-blur-md rounded-[14px] p-3 border border-white/5 shadow-2xl">
      <div className="flex items-center gap-3 px-3 py-1.5 bg-black/40 rounded-xl border border-white/5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
          {React.createElement(lvl.icon, { size: 16, className: 'text-primary' })}
        </div>
        <div>
          <div className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-none">Level {lvl.level}</div>
          <div className="text-[10px] font-headline font-black text-on-surface uppercase tracking-tight">{lvl.title}</div>
        </div>
      </div>

      <div className="flex items-center gap-6 px-4 py-1.5 border-l border-white/5">
        <div className="text-right">
          <div className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-none mb-1">Efficiency</div>
          <div className="text-[10px] font-headline font-black text-primary uppercase tabular-nums">{efficiency}% Velocity</div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-none mb-1">Temporal</div>
          <div className="text-[10px] font-headline font-black text-secondary uppercase tabular-nums">T-{daysRemaining} Days</div>
        </div>
      </div>
    </div>
  );
};
