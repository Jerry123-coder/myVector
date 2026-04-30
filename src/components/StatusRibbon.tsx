import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { useDb } from '../lib/DbContext';
import { Shield, Zap, Target, Star, Rocket, Trophy, Flame } from 'lucide-react';

// XP Ascension Levels (Same as MilestonesView)
const LEVELS = [
  { level: 1,  xp: 0,    title: 'Initiate',    icon: Shield },
  { level: 2,  xp: 50,   title: 'Operator',    icon: Zap },
  { level: 3,  xp: 150,  title: 'Specialist',  icon: Target },
  { level: 4,  xp: 300,  title: 'Tactician',   icon: Star },
  { level: 5,  xp: 500,  title: 'Strategist',  icon: Rocket },
  { level: 6,  xp: 750,  title: 'Commander',   icon: Trophy },
  { level: 7,  xp: 1100, title: 'Apex',        icon: Flame },
];

function xpToLevel(xp: number) {
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

async function computeTotalXp(db: any): Promise<number> {
  const [tasks, sessions] = await Promise.all([
    db.dailyTasks.toArray(),
    db.sessions.where('type').equals('focus').toArray()
  ]);
  const taskXp = (tasks as any[]).filter(t => t.done).reduce((s, t) => s + (t.category === 'deep-work' ? 20 : 5), 0);
  const focusXp = sessions.reduce((acc: number, s: any) => acc + Math.floor(s.actualSecs / 60), 0);
  return taskXp + focusXp;
}

export const StatusRibbon = () => {
  const { db, isTestMode } = useDb();
  const [totalXp, setTotalXp] = useState(0);
  const [totalFocusSecs, setTotalFocusSecs] = useState(0);
  const rewards = useLiveQuery(() => db.rewards.toArray(), [isTestMode]) ?? [];

  useEffect(() => {
    void (async () => {
      const sessions = await db.sessions.where('type').equals('focus').toArray();
      setTotalFocusSecs(sessions.reduce((acc, s) => acc + s.actualSecs, 0));
      setTotalXp(await computeTotalXp(db));
    })();
  }, [isTestMode, db]);

  const { current: lvl, next: nextLvl, pctToNext } = xpToLevel(totalXp);
  const totalFocusHoursDisplay = Math.floor(totalFocusSecs / 3600);

  return (
    <div className="flex flex-wrap items-center gap-4 mb-8 bg-[#0f1115]/60 backdrop-blur-md rounded-[14px] p-3 border border-white/5 shadow-2xl">
      <div className="flex items-center gap-3 px-3 py-1.5 bg-black/40 rounded-xl border border-white/5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
          {React.createElement(lvl.icon, { size: 16, className: 'text-primary' })}
        </div>
        <div>
          <div className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-none">Level {lvl.level}</div>
          <div className="text-[10px] font-headline font-black text-on-surface uppercase tracking-tight">{lvl.title}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1 px-2">
        <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
          <span>Level Progress</span>
          <span>{totalXp} / {nextLvl?.xp ?? 'MAX'} XP</span>
        </div>
        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pctToNext}%` }}
            className="h-full bg-primary shadow-[0_0_10px_rgba(0,219,233,0.3)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 px-4 py-1.5 border-l border-white/5">
        <div className="text-right">
          <div className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-none mb-1">Focus Time</div>
          <div className="text-[10px] font-headline font-black text-secondary uppercase tabular-nums">{totalFocusHoursDisplay}h Total</div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-none mb-1">Rewards</div>
          <div className="text-[10px] font-headline font-black text-[#ffba38] uppercase tabular-nums">{rewards.filter(r => r.isUnlocked).length} Secured</div>
        </div>
      </div>
    </div>
  );
};
