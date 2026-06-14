import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task, type Category } from '../../lib/db';
import { getTMinus } from '../../lib/metrics';
import { Sparkline } from '../../components/layout/Sparkline';
import { StatusRibbon } from '../../components/StatusRibbon';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Zap, Circle,
  Rocket, Activity, ChevronRight, Settings2, Palette, Save, X, Globe, Sparkles
} from 'lucide-react';
import { useToast } from '../../components/ToastContext';

export const CommandDashboard = ({ setTab }: { setTab?: (tab: 'sprints' | 'goals' | 'milestones') => void }) => {
  const [now] = useState(() => Date.now());
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { showToast } = useToast();

  // Data Queries
  const multiYears  = useLiveQuery(() => db.multiYearGoals.toArray(), []) ?? [];
  const annuals     = useLiveQuery(() => db.annualGoals.toArray(), []) ?? [];
  const quarterlies = useLiveQuery(() => db.quarterlyGoals.toArray(), []) ?? [];
  const milestones  = useLiveQuery(() => db.milestones.where('status').notEqual('done').toArray(), []) ?? [];
  const sprints     = useLiveQuery(() => db.sprints.where('status').equals('active').toArray(), []) ?? [];
  const allTasks    = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const categories  = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const pillars = useMemo(() => {
    return categories.map(cat => {
      const vision = multiYears.find(v => v.category === cat.id && v.status !== 'done');
      const goal = annuals.find(g => g.category === cat.id && g.status !== 'done');
      const catQuarterlies = quarterlies.filter(q => q.annualGoalId === goal?.id);
      const catMilestones = milestones.filter(m => 
         m.annualGoalId === goal?.id || 
         catQuarterlies.some(q => q.id === m.quarterlyGoalId)
      ).slice(0, 3);
      let progress = 0;
      let delta = 0;
      let sparkData: number[] = [0, 0, 0, 0, 0, 0, 0];

      if (goal) {
        const relatedTasks = allTasks.filter(t => t.annualGoalId === goal.id || (t.quarterlyGoalId && quarterlies.filter(q => q.annualGoalId === goal.id).map(q => q.id).includes(t.quarterlyGoalId)));
        const doneCount = relatedTasks.filter(t => t.status === 'done').length;
        progress = relatedTasks.length ? Math.round((doneCount / relatedTasks.length) * 100) : 0;
        for (let i = 0; i < 7; i++) {
          const dayStart = new Date(now - (6 - i) * 86400000).setHours(0,0,0,0);
          sparkData[i] = relatedTasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= dayStart && t.completedAt < dayStart + 86400000).length;
        }
        delta = sparkData.reduce((a, b) => a + b, 0);
      }
      return { ...cat, vision, goal, progress, delta, sparkData, catMilestones };
    });
  }, [multiYears, annuals, quarterlies, allTasks, categories, now]);


  const activeFocus = useMemo(() => {
    return quarterlies.filter(q => q.status === 'active').map(q => {
      const tasks = allTasks.filter(t => t.quarterlyGoalId === q.id && t.status !== 'done').slice(0, 3);
      const total = allTasks.filter(t => t.quarterlyGoalId === q.id).length;
      const done = allTasks.filter(t => t.quarterlyGoalId === q.id && t.status === 'done').length;
      return { ...q, tasks, progress: total ? Math.round((done / total) * 100) : 0 };
    }).slice(0, 2);
  }, [quarterlies, allTasks]);

  const toggleTask = async (t: Task) => {
    if (!t.id) return;
    await db.tasks.update(t.id, {
      status: t.status === 'done' ? 'pending' : 'done',
      completedAt: t.status === 'done' ? undefined : Date.now(),
      updatedAt: Date.now()
    });
  };

  const updatePillar = async (cat: Category, newLabel: string) => {
    await db.categories.update(cat.id, { label: newLabel, updatedAt: Date.now() });
  };

  return (
    <div className="pb-24 max-w-[1600px] mx-auto px-6">
      <StatusRibbon />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Sector Telemetry */}
        <div className="lg:col-span-8 space-y-12">
           <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black text-on-surface-variant/30 uppercase tracking-[0.5em] flex items-center gap-3">
                 <Activity size={16} /> Categories
              </h2>
              <button 
                onClick={() => setIsConfiguring(!isConfiguring)}
                className="p-3 bg-white/5 rounded-2xl text-on-surface-variant/40 hover:text-primary transition-all"
              >
                 {isConfiguring ? <X size={16} /> : <Settings2 size={16} />}
              </button>
           </div>

           <AnimatePresence>
              {isConfiguring && (
                 <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-10 bg-[#0a0c10]/80 backdrop-blur-3xl border border-primary/20 rounded-[32px] shadow-2xl relative overflow-hidden mb-12"
                 >
                    <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                       <Palette size={160} className="text-primary" />
                    </div>
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                       {categories.map(cat => (
                          <div key={cat.id} className="flex items-center gap-5 p-5 bg-black/40 rounded-2xl border border-white/5 focus-within:border-primary/40 transition-colors">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.bg} ${cat.color} border ${cat.border}`}>
                                <Zap size={18} />
                             </div>
                             <input 
                                defaultValue={cat.label}
                                onBlur={(e) => updatePillar(cat, e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-[11px] font-headline font-black uppercase tracking-widest text-on-surface"
                             />
                             <Save size={14} className="text-on-surface-variant/20" />
                          </div>
                       ))}
                    </div>
                 </motion.div>
              )}
           </AnimatePresence>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {pillars.map(p => (
                 <motion.div 
                    key={p.id} 
                    whileHover={{ y: -6 }}
                    className={`p-8 rounded-[32px] bg-black/40 border border-white/5 hover:border-white/10 transition-all duration-700 backdrop-blur-xl relative overflow-hidden group`}
                 >
                    <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity" style={{ color: p.glow }}>
                       <Activity size={100} />
                    </div>
                    
                    <div className="flex items-center justify-between mb-10">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl bg-black/60 border ${p.border} ${p.color} flex items-center justify-center shadow-xl`}>
                             <Activity size={22} />
                          </div>
                           <div className="flex flex-col">
                              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">{p.label}</span>
                              {p.vision && (
                                 <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mt-1 flex items-center gap-1">
                                    <Globe size={10} /> {p.vision.targetYear} GOAL
                                 </span>
                              )}
                          </div>
                       </div>
                       {p.goal && (
                          <div className="flex flex-col items-end">
                             <span className="text-3xl font-headline font-black text-on-surface leading-none tracking-tighter">{p.progress}%</span>
                             <span className="text-[8px] font-black text-on-surface-variant/20 uppercase tracking-[0.2em] mt-1">CAPACITY</span>
                          </div>
                       )}
                    </div>

                    {p.goal ? (
                       <div className="space-y-8">
                          <h3 className="text-xl font-headline font-black text-on-surface uppercase tracking-tight leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                             {p.goal.title}
                          </h3>
                          <div className="space-y-3">
                             <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                   initial={{ width: 0 }} 
                                   animate={{ width: `${p.progress}%` }} 
                                   className={`h-full ${p.color.replace('text-', 'bg-')} transition-all duration-1000`}
                                   style={{ boxShadow: `0 0 15px ${p.glow}` }}
                                />
                             </div>
                             <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                   <Sparkline data={p.sparkData} color={p.color} width={80} height={20} />
                                   <span className="text-[8px] font-black uppercase tracking-[0.3em] text-on-surface-variant/20">TREND</span>
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-on-surface-variant/20">YEARLY GOAL</span>
                             </div>
                          </div>

                          {p.catMilestones && p.catMilestones.length > 0 && (
                             <div className="pt-4 border-t border-white/5 space-y-2">
                               {p.catMilestones.map(m => (
                                 <div key={m.id} className="flex justify-between items-center bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                                    <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface/80 truncate pr-4">{m.title}</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-primary shrink-0">{getTMinus(m.targetDate)}</span>
                                 </div>
                               ))}
                             </div>
                          )}
                       </div>
                    ) : (
                       <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl opacity-20 group-hover:opacity-40 transition-opacity">
                          <p className="text-[9px] font-black uppercase tracking-widest italic">No Goal Set</p>
                       </div>
                    )}
                 </motion.div>
              ))}
           </div>
        </div>

        {/* Right Column: Active Pipeline */}
        <div className="lg:col-span-4 space-y-12">
           <section className="space-y-8">
              <h2 className="text-[11px] font-black text-on-surface-variant/30 uppercase tracking-[0.5em] flex items-center gap-3 px-2">
                 <Target size={16} className="text-primary" /> Current Focus
              </h2>
              <div className="space-y-6">
                 {activeFocus.map(q => {
                    const epicsSprints = sprints.filter(s => s.quarterlyGoalId === q.id);
                    const completedSprints = epicsSprints.filter(s => s.status === 'done').length;
                    const totalSprints = Math.max(epicsSprints.length, 6);
                    return (
                    <div key={q.id} 
                         onClick={() => {
                            localStorage.setItem('focusEpicId', String(q.id));
                            if (setTab) setTab('sprints');
                         }}
                         className="p-8 bg-primary/5 border border-primary/10 rounded-[32px] space-y-6 shadow-2xl relative overflow-hidden group/pipe cursor-pointer hover:bg-primary/10 hover:border-primary/30 transition-all">
                       <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover/pipe:opacity-[0.05] transition-opacity">
                          <Target size={80} className="text-primary" />
                       </div>
                       <div className="flex justify-between items-start relative z-10">
                          <div className="flex flex-col">
                             <h4 className="text-base font-headline font-black text-primary uppercase tracking-tight truncate max-w-[180px]">{q.title}</h4>
                             <span className="text-[9px] font-black text-primary/40 uppercase tracking-[0.3em] mt-1">QUARTERLY GOAL</span>
                          </div>
                          <span className="text-xl font-headline font-black text-primary/60">{q.progress}%</span>
                       </div>

                       {/* Sprint Fraction Progress */}
                       <div className="space-y-1 relative z-10">
                          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-primary/60">
                             <span>Progress</span>
                             <span>{completedSprints} of {totalSprints} Sprints</span>
                          </div>
                          <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-primary/20">
                             <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${Math.max(5, (completedSprints / totalSprints) * 100)}%` }} />
                          </div>
                       </div>

                       <div className="space-y-2 relative z-10">
                          {q.tasks.map(t => (
                             <div key={t.id} onClick={(e) => { e.stopPropagation(); toggleTask(t); }} className="flex items-center gap-4 p-4 bg-black/60 rounded-2xl border border-white/5 hover:border-primary/40 cursor-pointer group/task transition-all shadow-lg">
                                <Circle size={12} className="text-on-surface-variant/20 group-hover/task:text-primary transition-colors" />
                                <span className="text-[10px] font-headline font-bold text-on-surface/80 uppercase tracking-widest truncate">{t.label}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 )})}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};
