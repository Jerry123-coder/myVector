import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { type RewardItem, type Milestone, type Task, type QuarterlyGoal } from '../../lib/db';
import { useDb } from '../../lib/DbContext';
import { nowMs } from '../../lib/time';
import {
  Shield, Star, Zap, Gift, Plus, Trash2, Lock,
  Trophy, Flame, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Target, Rocket, Circle,
} from 'lucide-react';
import { useToast } from '../../components/ToastContext';

// XP Ascension Levels
const LEVELS = [
  { level: 1,  xp: 0,    title: 'Initiate',    icon: Shield,           color: '#4ade80' }, // Lucide Icons here
  { level: 2,  xp: 50,   title: 'Operator',    icon: Zap,              color: '#00dbe9' },
  { level: 3,  xp: 150,  title: 'Specialist',  icon: Target,           color: '#00dbe9' },
  { level: 4,  xp: 300,  title: 'Tactician',   icon: Star,             color: '#7df4ff' },
  { level: 5,  xp: 500,  title: 'Strategist',  icon: Rocket,           color: '#00e475' },
  { level: 6,  xp: 750,  title: 'Commander',   icon: Trophy,           color: '#ffba38' },
  { level: 7,  xp: 1100, title: 'Apex',        icon: Flame,            color: '#ff6bff' },
];

// Focus Volume Levels
const FOCUS_HOURS_LEVELS = [
  { hours: 10,  title: 'Novice', icon: Shield, color: '#cd7f32' },
  { hours: 50,  title: 'Master', icon: Zap,    color: '#c0c0c0' },
  { hours: 100, title: 'King',   icon: Trophy, color: '#ffd700' },
  { hours: 250, title: 'Apex',   icon: Flame,  color: '#00dbe9' },
];

function xpToLevel(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp) current = l;
    else break;
  }
  const nextIdx = LEVELS.indexOf(current) + 1;
  const next = LEVELS[nextIdx];
  const pctToNext = next
    ? Math.round(((xp - current.xp) / (next.xp - current.xp)) * 100)
    : 100;
  return { current, next, pctToNext };
}

// ── Preset rewards bank ────────────────────────────────
const PRESET_REWARDS: Pick<RewardItem, 'title' | 'description' | 'icon' | 'isUserDefined' | 'isUnlocked' | 'requiredXp'>[] = [
  { title: 'New Fragrance Purchase',  icon: '🧴', description: 'Treat yourself to a new scent.',         isUserDefined: false, isUnlocked: false, requiredXp: 150  },
  { title: 'Gear Upgrade',           icon: '🖥️', description: 'Upgrade a piece of tech or gear.',       isUserDefined: false, isUnlocked: false, requiredXp: 500  },
  { title: 'Fine Dining Experience', icon: '🍽️', description: 'Premium restaurant experience.',          isUserDefined: false, isUnlocked: false, requiredXp: 300  },
  { title: 'Wardrobe Piece',         icon: '👔', description: 'Pick a clothing item you have been eyeing.', isUserDefined: false, isUnlocked: false, requiredXp: 200 },
  { title: 'Day Off — Zero Guilt',   icon: '🌅', description: 'A complete detox day, fully earned.',     isUserDefined: false, isUnlocked: false, requiredXp: 750  },
  { title: 'Weekend Trip',           icon: '✈️', description: 'A short getaway — you earned it.',        isUserDefined: false, isUnlocked: false, requiredXp: 1100 },
];

const XP_TASK = { 'deep-work': 20, admin: 5 };

// ── Totals ─────────────────────────────────────────────
async function computeTotalXp(db: import('../../lib/DbContext').DbInstance): Promise<number> {
  const [tasks, sessions] = await Promise.all([
    db.dailyTasks.toArray(),
    db.sessions.where('type').equals('focus').toArray()
  ]);

  const taskXp = tasks
    .filter(t => t.done)
    .reduce((s, t) => s + (XP_TASK[t.category as keyof typeof XP_TASK] ?? 5), 0);

  const focusXp = sessions.reduce((acc, s) => acc + Math.floor(s.actualSecs / 60), 0);

  return taskXp + focusXp;
}

export const MilestonesView = () => {
  const [now]      = useState(() => Date.now());
  const { db, isTestMode } = useDb();
  // State
  const [showRewardBank, setShowRewardBank] = useState(false);
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardDesc,  setNewRewardDesc]  = useState('');
  const [newRewardXP,    setNewRewardXP]    = useState(100);
  const [newRewardIcon,  setNewRewardIcon]  = useState('🎁');
  const [addingReward,   setAddingReward]   = useState(false);

  // Milestone state
  const [creatingMs, setCreatingMs] = useState(false);
  const [editingMsId, setEditingMsId] = useState<number | null>(null);
  const [msTitle,    setMsTitle]    = useState('');
  const [msDate,     setMsDate]     = useState('');
  const [msGoalId,   setMsGoalId]   = useState<number | undefined>();
  const [msQGoalId,  setMsQGoalId]  = useState<number | undefined>();
  const [showDone,   setShowDone]   = useState(false);

  const milestones  = useLiveQuery(() => db.milestones.orderBy('targetDate').toArray(), [isTestMode]) ?? [];
  const annualGoals = useLiveQuery(() => db.annualGoals.toArray(), [isTestMode]) ?? [];
  const quarterlyGoals = useLiveQuery(() => db.quarterlyGoals.toArray(), [isTestMode]) ?? [];
  const rewards     = useLiveQuery(() => db.rewards.orderBy('requiredXp').toArray(), [isTestMode]) ?? [];

  const [totalXp, setTotalXp] = useState(0);
  const [totalFocusSecs, setTotalFocusSecs] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sessions = await db.sessions.where('type').equals('focus').toArray();
      if (cancelled) return;
      setTotalFocusSecs(sessions.reduce((acc, s) => acc + s.actualSecs, 0));
      setTotalXp(await computeTotalXp(db));
    })();
    return () => { cancelled = true; };
  }, [isTestMode, db]);

  const { current: lvl, next: nextLvl, pctToNext } = xpToLevel(totalXp);
  const totalFocusHours = Math.floor(totalFocusSecs / 3600);

  // Seed preset rewards on first load
  useEffect(() => {
    db.rewards.count().then(c => {
      if (c === 0) {
        db.rewards.bulkAdd(
          PRESET_REWARDS.map(r => ({ ...r, createdAt: nowMs(), updatedAt: Date.now() }))
        );
      }
    });
  }, []);

  // ── Milestone CRUD ──────────────────────────────────────
  const createMilestone = async () => {
    if (!msTitle.trim() || !msDate) return;
    await db.milestones.add({
      title:       msTitle.trim().toUpperCase(),
      targetDate:  new Date(msDate).getTime(),
      annualGoalId: msGoalId,
      quarterlyGoalId: msQGoalId,
      status:      'upcoming',
      createdAt:   nowMs(),
      updatedAt:   Date.now(),
    });
    setMsTitle(''); setMsDate(''); setMsGoalId(undefined); setMsQGoalId(undefined); setCreatingMs(false);
    showToast('Marker Deployed to Roadmap', 'success');
  };

  const updateMilestone = async (id: number, data: Partial<Milestone>) => {
    await db.milestones.update(id, { ...data, updatedAt: Date.now() });
    setEditingMsId(null);
    showToast('Marker Synchronized', 'success');
  };

  const toggleMsDone = async (m: Milestone) => {
    if (!m.id) return;
    const newStatus = m.status === 'done' ? 'upcoming' : 'done';
    await db.milestones.update(m.id, { status: newStatus, updatedAt: Date.now() });
    // Unlock any rewards gated to this milestone
    if (newStatus === 'done') {
      showToast('Milestone Achieved', 'success');
      const linked = rewards.filter(r => r.milestoneId === m.id && !r.isUnlocked);
      for (const r of linked) {
        if (r.id) await db.rewards.update(r.id, { isUnlocked: true, unlockedAt: Date.now(), updatedAt: Date.now() });
      }
    }
  };

  const deleteMilestone = async (id?: number) => { if (id) await db.milestones.delete(id); };

  // ── Reward CRUD ────────────────────────────────────────
  const addCustomReward = async () => {
    if (!newRewardTitle.trim()) return;
    await db.rewards.add({
      title:        newRewardTitle.trim(),
      description:  newRewardDesc,
      icon:         newRewardIcon,
      isUserDefined: true,
      isUnlocked:   false,
      requiredXp:   newRewardXP,
      createdAt:    nowMs(),
      updatedAt:    Date.now(),
    });
    setNewRewardTitle(''); setNewRewardDesc(''); setNewRewardXP(100); setAddingReward(false);
    showToast('Reward Asset Registered', 'success');
  };

  const unlockReward = async (r: RewardItem) => {
    if (!r.id || r.isUnlocked) return;
    if (r.requiredXp && totalXp < r.requiredXp) return;
    await db.rewards.update(r.id, { isUnlocked: true, unlockedAt: Date.now(), updatedAt: Date.now() });
    showToast(`Claimed Reward: ${r.title}`, 'success');
  };

  const deleteReward = async (id?: number) => { if (id) await db.rewards.delete(id); };

  const upcoming = milestones.filter(m => m.status !== 'done' && m.targetDate > now);
  const overdue  = milestones.filter(m => m.status !== 'done' && m.targetDate <= now);
  const done     = milestones.filter(m => m.status === 'done');

  // Milestones that can unlock rewards
  const unlockedRewards = rewards.filter(r => r.isUnlocked);
  const lockedRewards   = rewards.filter(r => !r.isUnlocked);

  // ── Milestone Card ────────────────────────────────────
  const MilestoneCard = ({ m }: { m: Milestone }) => {
    const isEditing = editingMsId === m.id;
    const isOverdue = m.targetDate <= now && m.status !== 'done';
    const qGoal = useLiveQuery<QuarterlyGoal | undefined>(
      () => (m.quarterlyGoalId ? db.quarterlyGoals.get(m.quarterlyGoalId) : undefined),
      [m.quarterlyGoalId]
    );

    // Progress calculation for linked goal
    const linkedGoalId = m.quarterlyGoalId || m.annualGoalId;
    const linkedType = m.quarterlyGoalId ? 'quarterly' : 'annual';
    const linkedTasks = useLiveQuery<Task[]>(() => {
      if (!linkedGoalId) return Promise.resolve([] as Task[]);
      if (linkedType === 'quarterly') return db.tasks.where('quarterlyGoalId').equals(linkedGoalId).toArray();
      return db.tasks.where('annualGoalId').equals(linkedGoalId).toArray();
    }, [linkedGoalId, linkedType]);

    const linked = linkedTasks ?? [];
    const progress = linked.length ? Math.round((linked.filter(t => t.status === 'done').length / linked.length) * 100) : 0;
    const daysLeft = Math.ceil((m.targetDate - now) / 86400000);

    const [editT, setEditT] = useState(m.title);
    const [editD, setEditD] = useState(new Date(m.targetDate).toISOString().split('T')[0]);

    if (isEditing) {
      return (
        <div className="bg-[#1a1c22] rounded-2xl p-6 border border-primary/20 shadow-xl animate-in fade-in duration-300">
           <div className="space-y-4">
              <input value={editT} onChange={e => setEditT(e.target.value)} className="w-full bg-black/20 rounded-xl px-4 py-3 font-headline font-black text-sm text-primary uppercase border border-white/5 outline-none" />
              <input type="date" value={editD} onChange={e => setEditD(e.target.value)} className="w-full bg-black/20 rounded-xl px-4 py-3 font-headline font-bold text-xs text-on-surface border border-white/5 outline-none" />
              <div className="flex gap-2">
                 <button onClick={() => updateMilestone(m.id!, { title: editT.toUpperCase(), targetDate: new Date(editD).getTime() })} className="flex-1 py-2.5 bg-primary text-black font-headline font-black text-[10px] uppercase rounded-xl">Save</button>
                 <button onClick={() => setEditingMsId(null)} className="flex-1 py-2.5 bg-white/5 text-on-surface-variant font-headline font-bold text-[10px] uppercase rounded-xl">Cancel</button>
              </div>
           </div>
        </div>
      );
    }

    return (
      <div className={`group relative bg-[#1a1c22] rounded-2xl p-7 flex flex-col transition-all duration-300 hover:translate-y-[-4px] border border-white/5 shadow-xl ${m.status === 'done' ? 'opacity-60' : ''}`}>
        
        <div className="flex justify-between items-start mb-6">
           <div className="relative w-14 h-14 shrink-0 bg-black/20 rounded-xl flex items-center justify-center border border-white/5 overflow-hidden group-hover:border-primary/20 transition-colors">
              {/* Progress Ring around Icon */}
              <svg className="absolute inset-0 -rotate-90 w-14 h-14 p-1">
                 <circle cx="28" cy="28" r="25" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="2" />
                 <circle cx="28" cy="28" r="25" fill="none" stroke={m.status === 'done' ? '#00e475' : '#00dbe9'} strokeWidth="2"
                    strokeDasharray={157} strokeDashoffset={157 - (157 * progress) / 100}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }} strokeLinecap="round" />
              </svg>
              {m.status === 'done' ? <Trophy size={18} className="text-secondary relative z-10" /> : <Shield size={18} className="text-primary relative z-10" />}
           </div>
           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditingMsId(m.id!)} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-on-surface-variant/30 hover:text-primary transition-colors">
                 <Plus size={14} className="rotate-45" />
              </button>
              <button onClick={() => deleteMilestone(m.id)} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-on-surface-variant/30 hover:text-error transition-colors">
                 <Trash2 size={14} />
              </button>
           </div>
        </div>

        <div className="space-y-1 mb-6">
           <h3 className={`font-headline font-black text-lg uppercase tracking-tight leading-tight line-clamp-1 ${m.status === 'done' ? 'text-secondary/70' : 'text-on-surface'}`}>
             {m.title}
           </h3>
           <div className="flex flex-wrap gap-2 pt-2">
              <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${m.status === 'done' ? 'bg-secondary text-black shadow-md' : isOverdue ? 'bg-error text-black shadow-md' : 'bg-primary text-black shadow-md'}`}>
                 {m.status === 'done' ? 'OBJECTIVE_MET' : isOverdue ? 'OVERDUE' : `${daysLeft}D_REMAIN`}
              </span>
              {qGoal && <span className="bg-white/5 text-secondary/40 px-2.5 py-1 rounded-lg text-[8px] font-headline font-black uppercase tracking-widest border border-white/5">{qGoal.title?.slice(0, 10)}</span>}
           </div>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
           <div className="space-y-0.5">
              <div className="text-[9px] font-headline font-black text-on-surface-variant/20 uppercase tracking-widest leading-none">Sync_Efficiency</div>
              <div className="text-[14px] font-headline font-black text-on-surface/60 uppercase tabular-nums tracking-tighter leading-none">{progress}%</div>
           </div>
           <button
              onClick={() => toggleMsDone(m)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 ${m.status === 'done' ? 'bg-secondary text-black shadow-lg shadow-secondary/10' : 'bg-black/20 text-on-surface-variant/40 border border-white/5 hover:border-primary/40 hover:text-primary group-hover:bg-primary/5'}`}
           >
              {m.status === 'done' ? <CheckCircle2 size={18} /> : <Zap size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />}
           </button>
        </div>
      </div>
    );
  };

  // ── Reward Card ────────────────────────────────────────
  const RewardCard = ({ r }: { r: RewardItem }) => {
    const canUnlock = (r.requiredXp ?? 0) <= totalXp;
    return (
      <div className={`relative flex flex-col items-center p-5 rounded-xl border text-center transition-all ${
        r.isUnlocked
          ? 'bg-secondary/5 border-secondary/20 shadow-lg'
          : canUnlock
          ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
          : 'border-white/5 bg-white/[0.02] opacity-40'
      }`}>
        <div className={`text-3xl mb-3 ${r.isUnlocked ? '' : canUnlock ? 'animate-pulse' : 'grayscale'}`}>
          {r.isUnlocked ? r.icon ?? '🎁' : canUnlock ? r.icon ?? '🎁' : <Lock size={20} className="mx-auto text-on-surface-variant/20" />}
        </div>
        <p className={`font-headline font-black text-[10px] uppercase tracking-tight leading-tight mb-1 ${r.isUnlocked ? 'text-secondary' : 'text-on-surface'}`}>
          {r.title}
        </p>
        {!r.isUnlocked && (
          <div className="w-full mt-2">
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-primary" style={{ width: `${Math.min(100, (totalXp / (r.requiredXp || 1)) * 100)}%` }} />
            </div>
            <p className="text-[8px] font-headline font-black text-on-surface-variant/30 mt-1 uppercase">{r.requiredXp} XP</p>
          </div>
        )}
        {canUnlock && !r.isUnlocked && (
           <button onClick={() => unlockReward(r)} className="mt-3 w-full py-2 rounded-lg bg-secondary text-black font-headline font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all">Claim</button>
        )}
        {r.isUserDefined && (
          <button onClick={() => deleteReward(r.id)} className="absolute top-2 left-2 text-on-surface-variant/20 hover:text-error transition-colors">
            <Trash2 size={10} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto w-full pb-24 px-4 sm:px-6">
      
      {/* ── XP & Leveling Band (Redesigned) ───────────────── */}
      <div className="bg-[#1a1c22] rounded-2xl p-8 mb-12 border border-white/5 shadow-xl relative overflow-hidden group">
         <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 opacity-50" />
         
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-6">
               <div className="relative group/lvl">
                  <div className="w-20 h-20 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-4xl shadow-inner group-hover/lvl:border-primary/40 transition-colors">
                    {React.createElement(lvl.icon, { size: 36, className: 'text-primary' })}
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-black font-headline font-black border-4 border-[#121212] shadow-xl">
                    {lvl.level}
                  </div>
               </div>
               <div>
                  <h2 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tight leading-none mb-1">
                    {lvl.title}_Protocol
                  </h2>
                  <p className="font-headline font-black text-[10px] text-on-surface-variant/40 uppercase tracking-[0.4em]">
                    Vector_Ascension_Ladder
                  </p>
               </div>
            </div>

            <div className="flex items-end gap-6 h-fit pt-2">
               <div className="text-right">
                  <div className="font-headline font-black text-[10px] uppercase tracking-[0.3em] text-on-surface-variant/30 mb-1">Current_Energy</div>
                  <div className="font-headline font-black text-3xl text-primary tabular-nums tracking-tighter">{totalXp}<span className="text-primary/20 ml-1 font-headline font-black text-sm">XP</span></div>
               </div>
               <div className="w-px h-12 bg-white/5" />
               <div className="text-left">
                  <div className="font-headline font-black text-[10px] uppercase tracking-[0.3em] text-on-surface-variant/30 mb-1">Target_Node</div>
                  <div className="font-headline font-black text-3xl text-white/20 tabular-nums tracking-tighter">{nextLvl?.xp ?? 'MAX'}<span className="ml-1 opacity-50 font-headline font-black text-sm">XP</span></div>
               </div>
            </div>
         </div>

         {/* ── Focus Ascension View ───────────────────────── */}
         <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center justify-between w-full max-w-4xl gap-8 mb-4">
               {/* Previous Level Slot */}
               <div className="flex flex-col items-center gap-2 opacity-30">
                  <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
                     {(() => {
                       const prevIdx = LEVELS.indexOf(lvl) - 1;
                       return prevIdx >= 0
                         ? React.createElement(LEVELS[prevIdx].icon, { size: 18 })
                         : <Circle size={18} />;
                     })()}
                  </div>
                  <span className="font-headline font-black text-[8px] uppercase tracking-widest leading-none">LVL_{lvl.level - 1}</span>
               </div>

               {/* Current Progress Bar */}
               <div className="flex-1 relative pt-8">
                  <div className="absolute top-0 left-0 right-0 flex justify-between items-end mb-2 px-1">
                     <span className="font-headline font-black text-[10px] text-primary uppercase tracking-widest">{lvl.title}</span>
                     <span className="font-headline font-black text-[10px] text-on-surface-variant/40 uppercase tracking-widest">{pctToNext}% to {nextLvl?.title}</span>
                  </div>
                  <div className="h-4 w-full bg-black/60 rounded-full p-1 border border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] relative group/bar overflow-hidden">
                     <div className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-1000 shadow-[0_0_30px_rgba(0,219,233,0.4)] relative" 
                          style={{ width: `${pctToNext}%` }}>
                        <div className="absolute inset-0 bg-[#ffffff10] opacity-10" />
                        <div className="absolute top-0 right-0 w-2 h-full bg-white/40 blur-[2px] animate-pulse" />
                     </div>
                  </div>
                  {/* Floating Marker pointer */}
                  <div className="absolute top-[32px] transition-all duration-1000" style={{ left: `${pctToNext}%`, transform: 'translateX(-50%)' }}>
                     <div className="w-0.5 h-6 bg-primary shadow-[0_0_10px_rgba(0,219,233,0.8)]" />
                  </div>
               </div>

               {/* Next Level Slot */}
               <div className="flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-all ${totalXp >= (nextLvl?.xp ?? Infinity) ? 'bg-primary/20 border-primary shadow-lg' : 'bg-black/40 border-white/5'}`}>
                     {nextLvl?.icon ? React.createElement(nextLvl.icon, { size: 22, className: totalXp >= (nextLvl?.xp ?? Infinity) ? 'text-primary' : 'text-on-surface-variant/30' }) : <Lock size={20} className="text-on-surface-variant/20" />}
                  </div>
                  <span className={`font-headline font-black text-[8px] uppercase tracking-widest leading-none ${totalXp >= (nextLvl?.xp ?? Infinity) ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                     {nextLvl ? `LVL_${nextLvl.level}` : 'PEAK'}
                  </span>
               </div>
            </div>

            {/* All Levels Strip Below */}
            <div className="w-full max-w-5xl flex justify-between gap-1 mt-12 px-4 relative">
               <div className="absolute top-0 left-0 right-0 h-px bg-white/5 -translate-y-4" />
               {LEVELS.map((l, idx) => {
                  const reached = totalXp >= l.xp;
                  return (
                     <div key={idx} className="flex-1 group/l flex flex-col items-center">
                        {/* Indicator Tab */}
                        <div className={`w-8 h-1 rounded-full mb-4 transition-all duration-500 ${reached ? 'bg-primary shadow-[0_0_5px_rgba(0,219,233,1)]' : 'bg-white/5'}`} />
                        <div className={`flex flex-col items-center transition-all duration-300 ${reached ? 'opacity-100' : 'opacity-20 group-hover/l:opacity-50'}`}>
                           {React.createElement(l.icon, { size: 14, className: reached ? 'text-primary' : 'text-on-surface-variant' })}
                           <span className="font-headline font-black text-[6px] uppercase tracking-widest mt-2 text-on-surface-variant/40">{l.title}</span>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>
      </div>

      {/* ══════════ MILESTONES ═══════════════════════════════ */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight flex items-center gap-2">
            <Trophy size={20} className="text-[#ffba38]" /> Operational_Milestones
          </h3>
          <button
            onClick={() => setCreatingMs(!creatingMs)}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-black rounded-xl font-headline font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
          >
            <Plus size={14} /> New_Marker
          </button>
        </div>

        {/* Create form */}
        {creatingMs && (
          <div className="mb-12 bg-[#1a1c22] rounded-2xl p-8 shadow-xl border border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 rounded-xl bg-[#ffba38]/20 flex items-center justify-center">
                  <Trophy size={20} className="text-[#ffba38]" />
               </div>
               <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight">Establish Milestone</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col gap-2">
                <span className="font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Directive_ID</span>
                <input value={msTitle} onChange={e => setMsTitle(e.target.value)} placeholder="MILESTONE_ALPHA" className="bg-black/20 rounded-xl px-6 py-4 font-headline font-black text-sm text-[#ffba38] uppercase border border-white/5 outline-none focus:border-[#ffba38]/40" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Target_Temporal_Lock</span>
                <input type="date" value={msDate} onChange={e => setMsDate(e.target.value)} className="bg-black/20 rounded-xl px-6 py-4 font-headline font-bold text-sm text-on-surface border border-white/5 outline-none focus:border-[#ffba38]/40 h-[60px]" />
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Annual_Nexus</span>
                <select value={msGoalId ?? ''} onChange={e => setMsGoalId(Number(e.target.value) || undefined)} className="bg-black/20 rounded-xl px-6 py-4 font-headline font-black text-sm text-[#ffba38] uppercase border border-white/5 outline-none">
                  <option value="">— NO_LINK —</option>
                  {annualGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Quarterly_Nexus</span>
                <select value={msQGoalId ?? ''} onChange={e => setMsQGoalId(Number(e.target.value) || undefined)} className="bg-black/20 rounded-xl px-6 py-4 font-headline font-black text-sm text-secondary uppercase border border-white/5 outline-none">
                  <option value="">— NO_LINK —</option>
                  {quarterlyGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={createMilestone} className="px-10 py-4 rounded-xl font-headline font-black text-xs uppercase tracking-[0.2em] text-black active:scale-95 shadow-xl" style={{ background: '#ffba38' }}>
                Deploy_Milestone
              </button>
              <button onClick={() => setCreatingMs(false)} className="px-10 py-4 rounded-xl glass font-headline font-black text-xs uppercase tracking-[0.2em] text-on-surface-variant/40 hover:text-on-surface transition-colors">
                Abort
              </button>
            </div>
          </div>
        )}

        {overdue.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle size={16} className="text-error" />
              <span className="font-headline font-black text-[11px] uppercase tracking-[0.3em] text-error">Critical_Delays_Detected</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{overdue.map(m => <MilestoneCard key={m.id} m={m} />)}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcoming.map(m => <MilestoneCard key={m.id} m={m} />)}
        </div>

        {upcoming.length === 0 && overdue.length === 0 && !creatingMs && (
          <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-2xl">
            <Trophy size={40} className="mx-auto text-on-surface-variant/10 mb-4" />
            <p className="font-headline font-black text-[10px] text-on-surface-variant/20 uppercase tracking-[0.4em]">No active milestones detected</p>
          </div>
        )}

        {/* Done (collapsible) */}
        {done.length > 0 && (
          <div className="mt-12 pt-12 border-t border-white/5">
            <button onClick={() => setShowDone(!showDone)} className="flex items-center gap-3 text-secondary/40 hover:text-secondary transition-all">
              <CheckCircle2 size={14} />
              <span className="font-headline font-black text-[10px] uppercase tracking-[0.2em]">{done.length} SYNCED_UNITS</span>
              {showDone ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showDone && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 opacity-60">
                {done.map(m => <MilestoneCard key={m.id} m={m} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════ REWARDS BANK ═════════════════════════════ */}
      <div className="bg-[#1a1c22] rounded-2xl p-8 border border-white/5 shadow-xl">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Gift size={20} className="text-primary" />
             </div>
             <h3 className="font-headline font-black text-xl uppercase tracking-tight">Reward_Interface</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-headline font-black text-[10px] text-secondary uppercase tracking-widest bg-secondary/10 px-3 py-1 rounded-lg border border-secondary/20">
               {unlockedRewards.length}/{rewards.length} UNLOCKED
            </span>
            <button
              onClick={() => setShowRewardBank(!showRewardBank)}
              className="px-4 py-2 bg-white/5 text-on-surface-variant/60 rounded-lg font-headline font-black text-[10px] uppercase tracking-widest"
            >
              {showRewardBank ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {showRewardBank ? (
          <>
            <div className="flex items-center justify-between mb-8">
               <p className="font-headline font-black text-[10px] text-on-surface-variant/40 uppercase tracking-[0.3em]">Asset_Manifest</p>
               <button
                 onClick={() => setAddingReward(!addingReward)}
                 className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg font-headline font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
               >
                 <Plus size={14} /> Add_Custom
               </button>
            </div>

            {addingReward && (
              <div className="mb-10 bg-black/20 rounded-xl p-8 border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex flex-col gap-2">
                  <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Asset_Title</span>
                  <input value={newRewardTitle} onChange={e => setNewRewardTitle(e.target.value)} placeholder="Tactical Gear..." className="bg-black/20 rounded-xl font-headline font-black text-sm text-on-surface outline-none px-6 py-4 border border-white/5" />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Visual_ID (Emoji)</span>
                  <input value={newRewardIcon} onChange={e => setNewRewardIcon(e.target.value)} placeholder="🎁" className="bg-black/20 rounded-xl font-headline font-black text-2xl text-on-surface outline-none px-6 py-4 border border-white/5" />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-2">
                  <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Required_XP: {newRewardXP}</span>
                  <input type="range" min={50} max={1200} step={50} value={newRewardXP} onChange={e => setNewRewardXP(Number(e.target.value))} className="w-full accent-primary mt-2" />
                </div>
                <div className="sm:col-span-2 flex gap-4 pt-4">
                  <button onClick={addCustomReward} className="px-10 py-4 rounded-xl font-headline font-black text-xs uppercase tracking-[0.2em] text-black active:scale-95 shadow-xl" style={{ background: '#00dbe9' }}>
                    Confirm_Asset
                  </button>
                  <button onClick={() => setAddingReward(false)} className="px-10 py-4 rounded-xl glass font-headline font-black text-xs uppercase text-on-surface-variant/40">
                    Abort
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
               {unlockedRewards.map(r => <RewardCard key={r.id} r={r} />)}
               {lockedRewards.map(r => <RewardCard key={r.id} r={r} />)}
            </div>
          </>
        ) : (
          <button onClick={() => setShowRewardBank(true)} className="w-full py-16 rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 text-on-surface-variant/20 hover:text-primary hover:border-primary/20 hover:bg-primary/[0.02] transition-all group">
             <div className="w-12 h-12 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center group-hover:border-primary group-hover:bg-primary/10 transition-all">
                <Gift size={24} />
             </div>
             <span className="font-headline font-black text-[10px] uppercase tracking-[0.3em]">Access_Supply_Drop_Nexus</span>
          </button>
        )}
      </div>

      {/* ══════════ FOCUS VOLUME ═══════════════════════════ */}
      <div className="mb-24">
         <div className="flex items-center justify-between mb-8">
           <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight flex items-center gap-2">
             <Flame size={20} className="text-secondary" /> Focus_Volume_Metrics
           </h3>
           <div className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">
              Total_Execution: <span className="text-secondary">{totalFocusHours}H</span>
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FOCUS_HOURS_LEVELS.map((f, i) => {
               const reached = totalFocusHours >= f.hours;
               const progressPct = reached ? 100 : i === 0 ? Math.min(100, (totalFocusHours / f.hours) * 100) : totalFocusHours > FOCUS_HOURS_LEVELS[i-1].hours ? Math.min(100, ((totalFocusHours - FOCUS_HOURS_LEVELS[i-1].hours) / (f.hours - FOCUS_HOURS_LEVELS[i-1].hours)) * 100) : 0;

               return (
                  <div key={f.hours} className={`relative p-8 rounded-[2rem] border transition-all duration-500 overflow-hidden ${reached ? 'bg-secondary/5 border-secondary/20 shadow-lg' : 'bg-[#1a1c22] border-white/5 opacity-50'}`}>
                     <div className="relative z-10 flex flex-col items-center text-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner border border-white/5 ${reached ? 'bg-secondary/20' : 'bg-black/40'}`}>
                           {React.createElement(f.icon, { size: 28, className: reached ? 'text-secondary' : 'text-on-surface-variant/20' })}
                        </div>
                        <h4 className={`font-headline font-black text-lg uppercase tracking-tight mb-1 ${reached ? 'text-secondary' : 'text-on-surface'}`}>{f.title}</h4>
                        <p className="font-headline font-black text-[9px] uppercase tracking-[0.3em] text-on-surface-variant/40 mb-6">{f.hours} Focus_Hours</p>
                        
                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-2">
                           <div className={`h-full transition-all duration-1000 ${reached ? 'bg-secondary shadow-[0_0_10px_rgba(0,228,117,0.5)]' : 'bg-white/10'}`} style={{ width: `${progressPct}%` }} />
                        </div>
                        <div className="font-headline font-black text-[8px] uppercase tracking-widest text-on-surface-variant/20">{reached ? 'RANK_ESTABLISHED' : 'ACQUIRING_DATA'}</div>
                     </div>
                     {reached && (
                        <div className="absolute -top-4 -right-4 w-12 h-12 bg-secondary/20 blur-xl rounded-full" />
                     )}
                  </div>
               );
            })}
         </div>
      </div>
    </div>
  );
};
