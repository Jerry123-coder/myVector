import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../../lib/DbContext';
import { GoalDetailOverlay } from '../../components/layout/GoalDetailOverlay';
import {
  Plus, Globe,
  Minus, ArrowRight, Edit3, Shield, Flame
} from 'lucide-react';
import { useToast } from '../../components/ToastContext';
import { nowMs } from '../../lib/time';
import type { SideQuest } from '../../lib/db';
import { StatusRibbon } from '../../components/StatusRibbon';
import { motion, AnimatePresence } from 'framer-motion';

export const StrategyView = () => {
  const { db, isTestMode } = useDb();
  const { showToast } = useToast();

  const annualGoals    = useLiveQuery(() => db.annualGoals.where('status').equals('active').toArray(), [isTestMode]) ?? [];
  const allTasks       = useLiveQuery(() => db.tasks.toArray(), [isTestMode]) ?? [];
  const quarterlyGoals = useLiveQuery(() => db.quarterlyGoals.toArray(), [isTestMode]) ?? [];
  const allQuests      = useLiveQuery(() => db.sideQuests.toArray(), [isTestMode]) ?? [];
  const categories     = useLiveQuery(() => db.categories.toArray(), [isTestMode]) ?? [];

  const [rapidInput, setRapidInput] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<{ id: number; type: 'annual' | 'quarterly' } | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);

  const addRapidAnchor = async () => {
    if (!rapidInput.trim()) return;
    await db.annualGoals.add({
      title: rapidInput.trim().toUpperCase(),
      category: 'CRAFT',
      year: new Date().getFullYear(),
      status: 'active',
      createdAt: nowMs(),
      updatedAt: Date.now()
    });
    setRapidInput('');
    showToast('Goal Added', 'success');
  };

  const incrementQuest = async (quest: SideQuest) => {
    if (quest.currentCount < quest.targetCount) {
      await db.sideQuests.update(quest.id!, { currentCount: quest.currentCount + 1, updatedAt: Date.now() });
    }
  };

  const getPillarTheme = (catId?: string) => {
    const fallback = { bg: 'bg-white/5', text: 'text-on-surface-variant', border: 'border-white/5', glow: 'rgba(255,255,255,0.05)' };
    const found = categories.find(c => c.id === catId);
    if (!found) return fallback;
    return {
      bg: found.bg,
      text: found.color,
      border: found.border,
      glow: found.glow
    };
  };

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4">
      <StatusRibbon />

      {/* RAPID INGRESS BAR */}
      <div className="mb-12 relative group">
        <div className="absolute inset-0 bg-primary/5 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex items-center bg-[#0f1115]/80 backdrop-blur-xl border border-white/5 p-2 rounded-[18px] shadow-2xl focus-within:border-primary/40 transition-all">
           <div className="w-12 h-12 flex items-center justify-center text-primary/40 group-focus-within:text-primary transition-colors">
              <Shield size={20} />
           </div>
           <input 
              value={rapidInput}
              onChange={e => setRapidInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRapidAnchor()}
              placeholder="Add a new Yearly Goal..."
              className="flex-1 bg-transparent border-none outline-none font-headline font-black text-sm uppercase tracking-widest text-on-surface placeholder:text-on-surface-variant/20 px-2"
           />
           <button onClick={addRapidAnchor} className="px-6 py-3 bg-primary text-black rounded-[14px] font-headline font-black text-[9px] uppercase tracking-widest hover:brightness-110 transition-all">
              Add Goal
           </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em] flex items-center gap-3">
           <Globe size={14} className="text-primary" /> Yearly Goals
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {annualGoals.map(g => {
          const theme = getPillarTheme(g.category);
          const isExpanded = expandedGoalId === g.id;
          const gTasks = allTasks.filter(t => t.annualGoalId === g.id);
          const gQuests = allQuests.filter(sq => sq.annualGoalId === g.id);
          const doneTasks = gTasks.filter(t => t.status === 'done').length;
          
          const taskPct = gTasks.length ? (doneTasks / gTasks.length) * 100 : 0;
          const questPct = gQuests.length ? gQuests.reduce((acc, q) => acc + (q.currentCount / q.targetCount), 0) / gQuests.length * 100 : 0;
          const overallPct = Math.round((taskPct + (gQuests.length ? questPct : taskPct)) / (gQuests.length ? 2 : 1));

          return (
            <motion.div 
              key={g.id} 
              layout
              className={`bg-[#0f1115]/40 backdrop-blur-md rounded-[14px] border transition-all duration-500 overflow-hidden relative group/card ${isExpanded ? 'border-primary/40 col-span-full shadow-2xl' : 'border-white/5 hover:border-white/10'}`}
            >
               {/* Pillar Glow Background */}
               <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] opacity-[0.03] group-hover/card:opacity-[0.08] transition-opacity pointer-events-none" 
                    style={{ backgroundColor: theme.glow }} />

               <div className="p-8">
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                           <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${theme.bg} ${theme.text} border ${theme.border}`}>
                             {categories.find(c => c.id === g.category)?.label ?? g.category ?? 'Other'}
                           </span>
                        </div>
                        <h3 className={`font-headline font-black text-2xl uppercase tracking-tight leading-tight mb-4 transition-colors ${isExpanded ? 'text-primary' : 'text-on-surface'}`}>
                          {g.title}
                        </h3>

                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/20 mb-6">
                           <Flame size={10} className="text-secondary/60" />
                           <span>Live Synergy: {overallPct}% Sync</span>
                        </div>

                        {/* Integrated Quest Trackers */}
                        {gQuests.length > 0 && (
                           <div className="flex flex-wrap gap-3 mb-6">
                              {gQuests.map(sq => (
                                 <div key={sq.id} className="flex items-center gap-4 bg-black/60 border border-white/5 rounded-xl px-5 py-3">
                                    <div className="flex flex-col">
                                       <span className="text-[7px] font-black text-on-surface-variant/40 uppercase tracking-widest">{sq.title}</span>
                                       <span className="text-[12px] font-headline font-black text-primary tabular-nums">{sq.currentCount} / {sq.targetCount}</span>
                                    </div>
                                    <button onClick={() => incrementQuest(sq)} className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-black flex items-center justify-center transition-all">
                                       <Plus size={14} />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     <div className="flex flex-col items-end gap-6">
                        <div className="flex gap-2">
                           <button onClick={() => setExpandedGoalId(isExpanded ? null : g.id!)}
                                   className={`w-10 h-10 flex items-center justify-center rounded-[14px] border transition-all ${isExpanded ? 'bg-primary text-black border-primary' : 'bg-white/5 border-white/5 text-on-surface-variant/40 hover:text-primary'}`}>
                              {isExpanded ? <Minus size={18} /> : <ArrowRight size={18} />}
                           </button>
                           <button onClick={() => setSelectedGoal({ id: g.id!, type: 'annual' })}
                                   className="w-10 h-10 flex items-center justify-center rounded-[14px] bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-black transition-all">
                              <Edit3 size={16} />
                           </button>
                        </div>
                        <div className="text-right">
                           <div className="text-4xl font-headline font-black text-primary tabular-nums tracking-tighter leading-none">{overallPct}%</div>
                           <div className="text-[8px] font-black uppercase tracking-widest text-primary/40 mt-1">Yearly Sync</div>
                        </div>
                     </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-8 pt-8 border-t border-white/5 overflow-hidden"
                      >
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="space-y-4">
                               <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60">Tactical Windows</h4>
                               <div className="space-y-2">
                                  {quarterlyGoals.filter(q => q.annualGoalId === g.id).map(q => (
                                     <div key={q.id} className="flex items-center justify-between p-3 rounded-[14px] bg-black/40 border border-white/5">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface/80">{q.title}</span>
                                     </div>
                                  ))}
                               </div>
                            </div>
                            <div className="space-y-4">
                               <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary/60">Synergy Stats</h4>
                               <div className="bg-black/40 rounded-[14px] p-6 border border-white/5">
                                  <div className="flex justify-between items-center mb-4">
                                     <span className="text-[8px] font-black text-on-surface-variant/30 uppercase tracking-widest">Global Tasks</span>
                                     <span className="text-xl font-headline font-black text-secondary">{doneTasks}/{gTasks.length}</span>
                                  </div>
                                  <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden">
                                     <div className="h-full bg-secondary" style={{ width: `${taskPct}%` }} />
                                  </div>
                               </div>
                            </div>
                            <div className="space-y-4">
                               <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ffba38]/60">Action Operations</h4>
                               <div className="space-y-2">
                                  {gTasks.filter(t => t.status !== 'done').slice(0, 3).map(t => (
                                     <div key={t.id} className="p-3 bg-black/40 rounded-[14px] border border-white/5 text-[9px] font-black uppercase tracking-widest text-on-surface/60">
                                        {t.label}
                                     </div>
                                  ))}
                                  <button onClick={() => setSelectedGoal({ id: g.id!, type: 'annual' })}
                                          className="w-full mt-2 py-3 rounded-[14px] bg-primary text-black font-headline font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
                                     Deep Dive
                                  </button>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </motion.div>
          );
        })}
      </div>

      <GoalDetailOverlay goalId={selectedGoal?.id ?? null} type={selectedGoal?.type ?? null} onClose={() => setSelectedGoal(null)} />
    </div>
  );
};
