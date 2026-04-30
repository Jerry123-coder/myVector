import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { type Milestone, type SideQuest } from '../../lib/db';
import { useDb } from '../../lib/DbContext';
import { nowMs } from '../../lib/time';
import {
  Shield, Star, Zap, Plus, Minus, Trash2, Lock,
  Trophy, Flame, CheckCircle2,
  Target, Rocket, Circle, Box, CalendarRange,
  Sword, Scroll, Book, Dumbbell, Activity
} from 'lucide-react';
import { useToast } from '../../components/ToastContext';

// XP Ascension Levels
const LEVELS = [
  { level: 1,  xp: 0,    title: 'Initiate',    icon: Shield,           color: '#4ade80' },
  { level: 2,  xp: 50,   title: 'Operator',    icon: Zap,              color: '#00dbe9' },
  { level: 3,  xp: 150,  title: 'Specialist',  icon: Target,           color: '#00dbe9' },
  { level: 4,  xp: 300,  title: 'Tactician',   icon: Star,             color: '#7df4ff' },
  { level: 5,  xp: 500,  title: 'Strategist',  icon: Rocket,           color: '#00e475' },
  { level: 6,  xp: 750,  title: 'Commander',   icon: Trophy,           color: '#ffba38' },
  { level: 7,  xp: 1100, title: 'Apex',        icon: Flame,            color: '#ff6bff' },
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

export const MilestonesView = () => {
  const { db, isTestMode } = useDb();
  const { showToast } = useToast();
  const [now] = useState(() => Date.now());

  // Data
  const milestones = useLiveQuery(() => db.milestones.orderBy('targetDate').toArray(), [isTestMode]) ?? [];
  const rewards = useLiveQuery(() => db.rewards.orderBy('requiredXp').toArray(), [isTestMode]) ?? [];
  const sideQuests = useLiveQuery(() => db.sideQuests.toArray(), [isTestMode]) ?? [];

  // Local State
  const [totalXp, setTotalXp] = useState(0);
  const [totalFocusSecs, setTotalFocusSecs] = useState(0);
  const [creatingMs, setCreatingMs] = useState(false);
  const [creatingSq, setCreatingSq] = useState(false);
  
  // MS Form
  const [msTitle, setMsTitle] = useState('');
  const [msDate, setMsDate] = useState('');

  // SQ Form
  const [sqTitle, setSqTitle] = useState('');
  const [sqTarget, setSqTarget] = useState(10);
  const [sqIcon, setSqIcon] = useState('Sword');

  useEffect(() => {
    void (async () => {
      const sessions = await db.sessions.where('type').equals('focus').toArray();
      setTotalFocusSecs(sessions.reduce((acc, s) => acc + s.actualSecs, 0));
      setTotalXp(await computeTotalXp(db));
    })();
  }, [isTestMode, db]);

  const { current: lvl, next: nextLvl, pctToNext } = xpToLevel(totalXp);
  const totalFocusHoursDisplay = Math.floor(totalFocusSecs / 3600);

  const createMilestone = async () => {
    if (!msTitle.trim() || !msDate) return;
    await db.milestones.add({
      title: msTitle.trim().toUpperCase(),
      targetDate: new Date(msDate).getTime(),
      status: 'upcoming',
      createdAt: nowMs(),
      updatedAt: Date.now(),
    });
    setMsTitle(''); setMsDate(''); setCreatingMs(false);
    showToast('Milestone Added', 'success');
  };

  const createSideQuest = async () => {
    if (!sqTitle.trim() || sqTarget <= 0) return;
    await db.sideQuests.add({
      title: sqTitle.trim().toUpperCase(),
      targetCount: sqTarget,
      currentCount: 0,
      icon: sqIcon,
      createdAt: nowMs(),
      updatedAt: Date.now(),
    });
    setSqTitle(''); setSqTarget(10); setCreatingSq(false);
    showToast('Side Quest Started', 'success');
  };

  const updateSqCount = async (sq: SideQuest, delta: number) => {
    if (!sq.id) return;
    const newCount = Math.max(0, Math.min(sq.targetCount, sq.currentCount + delta));
    const isNowDone = newCount >= sq.targetCount && sq.currentCount < sq.targetCount;
    
    await db.sideQuests.update(sq.id, { 
      currentCount: newCount, 
      updatedAt: Date.now(),
      completedAt: isNowDone ? Date.now() : sq.completedAt
    });

    if (isNowDone) {
      showToast('Quest Complete!', 'success');
    }
  };

  const toggleMsDone = async (m: Milestone) => {
    if (!m.id) return;
    const newStatus = m.status === 'done' ? 'upcoming' : 'done';
    await db.milestones.update(m.id, { status: newStatus, updatedAt: Date.now() });
    if (newStatus === 'done') showToast('Milestone Achieved', 'success');
  };

  const redeemReward = async (id: number) => {
    await db.rewards.update(id, { isUnlocked: true, updatedAt: Date.now() });
    showToast('Reward Claimed!', 'success');
  };

  const deleteMilestone = async (id?: number) => { if (id && confirm('Delete this milestone?')) await db.milestones.delete(id); };
  const deleteSideQuest = async (id?: number) => { if (id && confirm('Abandon this quest?')) await db.sideQuests.delete(id); };

  const getIcon = (name?: string) => {
    switch(name) {
      case 'Sword': return <Sword size={16} />;
      case 'Book': return <Book size={16} />;
      case 'Dumbbell': return <Dumbbell size={16} />;
      case 'Scroll': return <Scroll size={16} />;
      default: return <Activity size={16} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-32">
      
      {/* ── COMPACT STATUS RIBBON ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 mb-12 bg-[#0f1115]/60 backdrop-blur-md rounded-[14px] p-4 border border-white/5 shadow-2xl">
         <div className="flex items-center gap-3 px-4 py-2 bg-black/40 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
               {React.createElement(lvl.icon, { size: 16, className: 'text-primary' })}
            </div>
            <div>
               <div className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">Level {lvl.level}</div>
               <div className="text-xs font-headline font-black text-on-surface uppercase tracking-tight">{lvl.title}</div>
            </div>
         </div>

         <div className="flex-1 flex flex-col gap-1 px-4">
            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
               <span>Level Progress</span>
               <span>{totalXp} / {nextLvl?.xp ?? 'MAX'} XP</span>
            </div>
            <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden">
               <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${pctToNext}%` }}
                  className="h-full bg-primary shadow-[0_0_10px_rgba(0,219,233,0.3)]"
               />
            </div>
         </div>

         <div className="flex items-center gap-6 px-6 py-2 border-l border-white/5">
            <div className="text-right">
               <div className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">Focus Time</div>
               <div className="text-xs font-headline font-black text-secondary uppercase tabular-nums">{totalFocusHoursDisplay}h Accumulated</div>
            </div>
            <div className="text-right">
               <div className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">Rewards</div>
               <div className="text-xs font-headline font-black text-[#ffba38] uppercase tabular-nums">{rewards.filter(r => r.isUnlocked).length} Secured</div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         {/* ── LEFT COLUMN: ROADMAP & SIDE QUESTS ───────────────────── */}
         <div className="lg:col-span-8 space-y-16">
            
            {/* ROADMAP SECTION */}
            <section>
               <div className="flex items-center justify-between mb-8">
                  <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight flex items-center gap-3">
                     <CalendarRange size={20} className="text-primary" /> Roadmap
                  </h3>
                  <button onClick={() => setCreatingMs(true)} 
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-headline font-black text-[9px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg">
                     <Plus size={14} /> Add Milestone
                  </button>
               </div>

               <AnimatePresence>
                  {creatingMs && (
                     <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-8 p-6 bg-[#0f1115] rounded-[14px] border border-primary/20 shadow-xl"
                     >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           <input value={msTitle} onChange={e => setMsTitle(e.target.value)} placeholder="Milestone Name" 
                                  className="bg-black/40 rounded-lg px-4 py-2.5 font-headline font-black text-[10px] text-primary uppercase border border-white/5 outline-none focus:border-primary/40" />
                           <input type="date" value={msDate} onChange={e => setMsDate(e.target.value)} 
                                  className="bg-black/40 rounded-lg px-4 py-2.5 font-headline font-bold text-[10px] text-on-surface border border-white/5 outline-none focus:border-primary/40" />
                           <div className="flex gap-2">
                              <button onClick={createMilestone} className="flex-1 py-2.5 bg-primary text-black rounded-lg font-headline font-black text-[9px] uppercase">Add</button>
                              <button onClick={() => setCreatingMs(false)} className="px-4 py-2.5 bg-white/5 text-on-surface-variant/40 rounded-lg font-headline font-black text-[9px] uppercase">Cancel</button>
                           </div>
                        </div>
                     </motion.div>
                  )}
               </AnimatePresence>

               <div className="relative pl-8 space-y-6">
                  <div className="absolute left-[13px] top-4 bottom-4 w-px bg-white/5" />
                  {milestones.map((m) => {
                     const isDone = m.status === 'done';
                     const daysLeft = Math.ceil((m.targetDate - now) / 86400000);
                     return (
                        <div key={m.id} className="relative group">
                           <div className={`absolute -left-8 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-[#0a0c10] flex items-center justify-center z-10 transition-colors ${
                              isDone ? 'bg-secondary border-secondary/20 shadow-[0_0_10px_rgba(0,228,117,0.3)]' : 'bg-[#1a1c22] border-white/5'
                           }`}>
                              {isDone ? <CheckCircle2 size={12} className="text-black" /> : <Circle size={8} className="text-on-surface-variant/20" />}
                           </div>
                           <div className={`bg-[#0f1115]/60 rounded-[14px] p-5 border transition-all flex items-center justify-between ${isDone ? 'border-secondary/20' : 'border-white/5 hover:border-white/10'}`}>
                              <div className="min-w-0">
                                 <div className="flex items-center gap-3 mb-1">
                                    <span className={`text-[7px] font-black uppercase tracking-widest ${isDone ? 'text-secondary' : 'text-on-surface-variant/40'}`}>
                                       {isDone ? 'COMPLETED' : `${daysLeft}D REMAINING`}
                                    </span>
                                    <span className="text-[7px] font-black text-on-surface-variant/10 uppercase tracking-widest">—</span>
                                    <span className="text-[7px] font-black text-on-surface-variant/40 uppercase tracking-widest">{new Date(m.targetDate).toLocaleDateString()}</span>
                                 </div>
                                 <h4 className="font-headline font-black text-sm text-on-surface uppercase tracking-tight truncate">{m.title}</h4>
                              </div>
                              <div className="flex items-center gap-4">
                                 <button onClick={() => toggleMsDone(m)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDone ? 'bg-secondary text-black' : 'bg-white/5 text-on-surface-variant/20 hover:text-primary'}`}><Zap size={16} /></button>
                                 <button onClick={() => deleteMilestone(m.id)} className="w-8 h-8 rounded-lg bg-white/5 text-on-surface-variant/10 hover:text-error flex items-center justify-center transition-all"><Trash2 size={14} /></button>
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </section>

            {/* SIDE QUESTS SECTION */}
            <section>
               <div className="flex items-center justify-between mb-8">
                  <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight flex items-center gap-3">
                     <Sword size={20} className="text-secondary" /> Side Quests
                  </h3>
                  <button onClick={() => setCreatingSq(true)} 
                          className="flex items-center gap-2 px-4 py-2 bg-secondary text-black rounded-lg font-headline font-black text-[9px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg">
                     <Plus size={14} /> New Quest
                  </button>
               </div>

               <AnimatePresence>
                  {creatingSq && (
                     <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-8 p-6 bg-[#0f1115] rounded-[14px] border border-secondary/20 shadow-xl"
                     >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                           <div className="flex flex-col gap-2">
                              <span className="text-[7px] font-black text-secondary/60 uppercase ml-1">Objective</span>
                              <input value={sqTitle} onChange={e => setSqTitle(e.target.value)} placeholder="Read 50 Books" 
                                     className="bg-black/40 rounded-lg px-4 py-2 font-headline font-black text-[10px] text-secondary uppercase border border-white/5 outline-none focus:border-secondary/40" />
                           </div>
                           <div className="flex flex-col gap-2">
                              <span className="text-[7px] font-black text-on-surface-variant/40 uppercase ml-1">Target Count</span>
                              <input type="number" value={sqTarget} onChange={e => setSqTarget(Number(e.target.value))} 
                                     className="bg-black/40 rounded-lg px-4 py-2 font-headline font-bold text-[10px] text-on-surface border border-white/5 outline-none focus:border-secondary/40" />
                           </div>
                           <div className="flex flex-col gap-2">
                              <span className="text-[7px] font-black text-on-surface-variant/40 uppercase ml-1">Icon</span>
                              <select value={sqIcon} onChange={e => setSqIcon(e.target.value)} 
                                      className="bg-black/40 rounded-lg px-4 py-2 font-headline font-black text-[10px] text-on-surface border border-white/5 outline-none">
                                 <option value="Sword">Sword</option>
                                 <option value="Book">Book</option>
                                 <option value="Dumbbell">Dumbbell</option>
                                 <option value="Scroll">Scroll</option>
                              </select>
                           </div>
                           <div className="flex items-end gap-2">
                              <button onClick={createSideQuest} className="flex-1 py-2.5 bg-secondary text-black rounded-lg font-headline font-black text-[9px] uppercase">Begin</button>
                              <button onClick={() => setCreatingSq(false)} className="px-4 py-2.5 bg-white/5 text-on-surface-variant/40 rounded-lg font-headline font-black text-[9px] uppercase">Abort</button>
                           </div>
                        </div>
                     </motion.div>
                  )}
               </AnimatePresence>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sideQuests.map(sq => {
                     const progressPct = Math.round((sq.currentCount / sq.targetCount) * 100);
                     const isDone = sq.currentCount >= sq.targetCount;
                     return (
                        <div key={sq.id} className={`bg-[#0f1115]/60 rounded-[14px] p-5 border transition-all ${isDone ? 'border-secondary/20 shadow-[0_0_15px_rgba(0,228,117,0.1)]' : 'border-white/5 hover:border-white/10'}`}>
                           <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isDone ? 'bg-secondary/10 border-secondary/20 text-secondary' : 'bg-black/40 border-white/5 text-on-surface-variant/40'}`}>
                                    {getIcon(sq.icon)}
                                 </div>
                                 <div>
                                    <h4 className="font-headline font-black text-xs text-on-surface uppercase tracking-tight leading-tight">{sq.title}</h4>
                                    <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">{sq.currentCount} / {sq.targetCount} Completed</span>
                                 </div>
                              </div>
                              <button onClick={() => deleteSideQuest(sq.id)} className="text-on-surface-variant/10 hover:text-error transition-colors"><Trash2 size={12} /></button>
                           </div>
                           
                           <div className="space-y-4">
                              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                 <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} className={`h-full ${isDone ? 'bg-secondary' : 'bg-primary'}`} />
                              </div>
                              <div className="flex items-center justify-between">
                                 <div className="flex gap-2">
                                    <button onClick={() => updateSqCount(sq, -1)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"><Minus size={14} /></button>
                                    <button onClick={() => updateSqCount(sq, 1)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-secondary hover:text-black flex items-center justify-center transition-all active:scale-90"><Plus size={14} /></button>
                                 </div>
                                 <span className={`text-[9px] font-black uppercase tracking-widest ${isDone ? 'text-secondary' : 'text-on-surface-variant/40'}`}>
                                    {isDone ? 'QUEST_COMPLETE' : `${progressPct}% SYNC`}
                                 </span>
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </section>
         </div>

         {/* ── RIGHT COLUMN: REWARDS ─────────────────────────────── */}
         <div className="lg:col-span-4">
            <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight flex items-center gap-3 mb-8">
               <Box size={20} className="text-[#ffba38]" /> Rewards
            </h3>
            <div className="space-y-4">
               {rewards.map(r => {
                  const isAvailable = (r.requiredXp ?? 0) <= totalXp;
                  const isClaimed = r.isUnlocked;
                  return (
                     <div key={r.id} className={`p-4 rounded-[14px] border transition-all ${isClaimed ? 'bg-secondary/5 border-secondary/20' : isAvailable ? 'bg-[#ffba38]/10 border-[#ffba38]/40 shadow-lg' : 'bg-black/40 border-white/5 opacity-50'}`}>
                        <div className="flex items-center gap-4">
                           <div className="text-2xl">{isClaimed ? r.icon : isAvailable ? '🎁' : <Lock size={16} className="text-on-surface-variant/20" />}</div>
                           <div className="flex-1 min-w-0">
                              <h4 className={`text-[10px] font-black uppercase tracking-tight truncate ${isClaimed ? 'text-secondary' : 'text-on-surface'}`}>{r.title}</h4>
                              <div className="flex justify-between items-center mt-1">
                                 <span className="text-[7px] font-black text-on-surface-variant/40 uppercase tracking-widest">{isClaimed ? 'Claimed' : `${r.requiredXp} XP Required`}</span>
                              </div>
                           </div>
                           {isAvailable && !isClaimed && (
                              <button onClick={() => redeemReward(r.id!)} className="px-3 py-1.5 bg-[#ffba38] text-black rounded-lg font-headline font-black text-[8px] uppercase tracking-widest hover:scale-105 transition-all">Redeem</button>
                           )}
                        </div>
                        {!isClaimed && !isAvailable && (
                           <div className="mt-3 h-1 w-full bg-black/40 rounded-full overflow-hidden">
                              <div className="h-full bg-[#ffba38]/30" style={{ width: `${Math.min(100, (totalXp / (r.requiredXp || 1)) * 100)}%` }} />
                           </div>
                        )}
                     </div>
                  );
               })}
            </div>
         </div>
      </div>
    </div>
  );
};
