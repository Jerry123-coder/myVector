import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task, type Category } from '../../lib/db';
import { getTMinus } from '../../lib/metrics';
import { Sparkline } from '../../components/layout/Sparkline';
import { StatusRibbon } from '../../components/StatusRibbon';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Zap, Circle,
  Rocket, Activity, ChevronRight, Settings2, Palette, Save, X
} from 'lucide-react';

export const CommandDashboard = () => {
  const [now] = useState(() => Date.now());
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Data Queries
  const annuals    = useLiveQuery(() => db.annualGoals.toArray(), []) ?? [];
  const quarterlies = useLiveQuery(() => db.quarterlyGoals.toArray(), []) ?? [];
  const milestones = useLiveQuery(() => db.milestones.where('status').notEqual('done').toArray(), []) ?? [];
  const sprints    = useLiveQuery(() => db.sprints.where('status').equals('active').toArray(), []) ?? [];
  const allTasks   = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const pillars = useMemo(() => {
    return categories.map(cat => {
      const goal = annuals.find(g => g.category === cat.id && g.status !== 'done');
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
      return { ...cat, goal, progress, delta, sparkData };
    });
  }, [annuals, quarterlies, allTasks, categories, now]);

  const roadmap = useMemo(() => {
    const items = [
      ...milestones.map(m => ({ id: `m-${m.id}`, label: m.title, date: m.targetDate, type: 'MILESTONE', color: 'text-primary' })),
      ...sprints.map(s => ({ id: `s-${s.id}`, label: `${s.name}`, date: s.endDate, type: 'SPRINT', color: 'text-secondary' })),
    ];
    return items.sort((a, b) => a.date - b.date).slice(0, 4);
  }, [milestones, sprints]);

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
    <div className="pb-24 max-w-7xl mx-auto px-4">
      <StatusRibbon />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
        {/* Left Column: Pillars & Telemetry */}
        <div className="lg:col-span-8 space-y-10">
           <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em] flex items-center gap-3">
                 <Activity size={14} className="text-primary" /> Sector Telemetry
              </h2>
              <button 
                onClick={() => setIsConfiguring(!isConfiguring)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isConfiguring ? 'bg-primary text-black' : 'bg-white/5 text-on-surface-variant/40 hover:text-primary hover:bg-primary/5'}`}
              >
                 {isConfiguring ? <X size={12} /> : <Settings2 size={12} />}
                 {isConfiguring ? 'Close Config' : 'Configure Pillars'}
              </button>
           </div>

           <AnimatePresence>
              {isConfiguring && (
                 <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-8 bg-[#0a0c10] border border-primary/20 rounded-[14px] shadow-2xl relative overflow-hidden mb-10"
                 >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                       <Palette size={120} className="text-primary" />
                    </div>
                    <div className="relative z-10 space-y-6">
                       <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em]">Pillar_Configuration_Suite</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {categories.map(cat => (
                             <div key={cat.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 focus-within:border-primary/40 transition-colors">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.bg} ${cat.color} border ${cat.border}`}>
                                   <Zap size={14} />
                                </div>
                                <input 
                                   defaultValue={cat.label}
                                   onBlur={(e) => updatePillar(cat, e.target.value)}
                                   className="flex-1 bg-transparent border-none outline-none text-[10px] font-headline font-black uppercase tracking-widest text-on-surface"
                                />
                                <Save size={12} className="text-on-surface-variant/20" />
                             </div>
                          ))}
                       </div>
                       <p className="text-[8px] font-bold text-on-surface-variant/40 uppercase tracking-widest italic leading-relaxed">
                          Visual signatures are persistent. Changes update all strategic roadmap cards instantly.
                       </p>
                    </div>
                 </motion.div>
              )}
           </AnimatePresence>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pillars.map(p => (
                 <motion.div 
                    key={p.id} 
                    whileHover={{ y: -4 }}
                    className={`p-6 rounded-[14px] bg-[#0f1115]/60 border transition-all duration-500 backdrop-blur-md relative overflow-hidden group ${p.border}`}
                 >
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity" style={{ color: p.glow }}>
                       <Activity size={80} />
                    </div>
                    <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg bg-black/40 border ${p.border} ${p.color}`}>
                             <Activity size={18} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{p.label}</span>
                       </div>
                       {p.goal && (
                          <div className="text-right">
                             <span className="text-2xl font-headline font-black text-white leading-none">{p.progress}%</span>
                          </div>
                       )}
                    </div>

                    {p.goal ? (
                       <div className="space-y-6">
                          <h3 className="text-lg font-headline font-black text-on-surface uppercase tracking-tight leading-tight line-clamp-1">
                             {p.goal.title}
                          </h3>
                          <div className="space-y-2">
                             <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                   initial={{ width: 0 }} 
                                   animate={{ width: `${p.progress}%` }} 
                                   className={`h-full ${p.color.replace('text-', 'bg-')} transition-all duration-1000`}
                                   style={{ boxShadow: `0 0 10px ${p.glow}` }}
                                />
                             </div>
                             <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                   <Sparkline data={p.sparkData} color={p.color} width={60} height={15} />
                                   <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/30">Momentum</span>
                                </div>
                                <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/30">{p.delta} Tasks/7D</span>
                             </div>
                          </div>
                       </div>
                    ) : (
                       <div className="py-8 text-center border border-dashed border-white/5 rounded-xl">
                          <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/20 italic">Awaiting Strategy</p>
                       </div>
                    )}
                 </motion.div>
              ))}
           </div>
        </div>

        {/* Right Column: Radar & Pipeline */}
        <div className="lg:col-span-4 space-y-10">
           <section className="space-y-6">
              <h2 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em] flex items-center gap-3">
                 <Rocket size={14} className="text-secondary" /> Horizon Radar
              </h2>
              <div className="space-y-3">
                 {roadmap.map(item => (
                    <div key={item.id} className="p-4 bg-[#0f1115]/60 border border-white/5 rounded-[14px] flex items-center justify-between group hover:border-white/10 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-black/40 border border-white/5 ${item.color}`}>
                             {item.type === 'MILESTONE' ? <Target size={14} /> : <Zap size={14} />}
                          </div>
                          <div>
                             <p className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-0.5">{getTMinus(item.date)}</p>
                             <p className="text-[11px] font-headline font-black text-on-surface uppercase tracking-tight">{item.label}</p>
                          </div>
                       </div>
                       <ChevronRight size={14} className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
                    </div>
                 ))}
              </div>
           </section>

           <section className="space-y-6">
              <h2 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em] flex items-center gap-3">
                 <Target size={14} className="text-primary" /> Active Pipeline
              </h2>
              <div className="space-y-4">
                 {activeFocus.map(q => (
                    <div key={q.id} className="p-5 bg-primary/5 border border-primary/10 rounded-[14px] space-y-4">
                       <div className="flex justify-between items-center">
                          <h4 className="text-[11px] font-headline font-black text-primary uppercase tracking-tight truncate max-w-[150px]">{q.title}</h4>
                          <span className="text-sm font-headline font-black text-primary/60">{q.progress}%</span>
                       </div>
                       <div className="space-y-2">
                          {q.tasks.map(t => (
                             <div key={t.id} onClick={() => toggleTask(t)} className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5 hover:border-primary/40 cursor-pointer group/task transition-colors">
                                <Circle size={10} className="text-on-surface-variant/20 group-hover/task:text-primary transition-colors" />
                                <span className="text-[9px] font-headline font-bold text-on-surface/60 uppercase tracking-widest truncate">{t.label}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 ))}
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};
