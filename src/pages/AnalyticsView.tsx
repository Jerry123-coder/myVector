import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../lib/DbContext';
import { Activity, Target, Zap, Shield, Heart, DollarSign, Cpu, Users, Timer } from 'lucide-react';
import { MetricsView } from './MetricsView';
import type { Route } from '../App';

const CATEGORIES = [
  { id: 'CRAFT', label: 'Craft & Skills', icon: Cpu, color: 'text-primary', bg: 'bg-primary' },
  { id: 'FINANCE', label: 'Financial Freedom', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400' },
  { id: 'HEALTH', label: 'Vitality & Health', icon: Heart, color: 'text-error', bg: 'bg-error' },
  { id: 'SOCIAL', label: 'Social & Family', icon: Users, color: 'text-[#00e475]', bg: 'bg-[#00e475]' },
  { id: 'CHARACTER', label: 'Character & Brand', icon: Shield, color: 'text-[#FFBA38]', bg: 'bg-[#FFBA38]' },
] as const;

interface AnalyticsViewProps {
  setRoute: (r: Route) => void;
}

export const AnalyticsView = ({ setRoute }: AnalyticsViewProps) => {
  const { db, isTestMode } = useDb();
  const [viewMode, setViewMode] = useState<'focus' | 'xp'>('focus');
  
  const dailyTasks = useLiveQuery(() => db.dailyTasks.toArray(), [isTestMode]) ?? [];
  const quarterlyGoals = useLiveQuery(() => db.quarterlyGoals.toArray(), [isTestMode]) ?? [];
  const annualGoals = useLiveQuery(() => db.annualGoals.toArray(), [isTestMode]) ?? [];
  const allTasks = useLiveQuery(() => db.tasks.toArray(), [isTestMode]) ?? [];

  // Compute XP for last 14 days
  const xpHistory = useMemo(() => {
    const history = [];
    const now = new Date();
    let maxXP = 0;

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayTasks = dailyTasks.filter(t => t.date === dateStr && t.done);
      const dayQGs = quarterlyGoals.filter(q => q.status === 'done' && q.completedAt && new Date(q.completedAt).toISOString().split('T')[0] === dateStr);
      
      let xp = 0;
      dayTasks.forEach(t => xp += t.category === 'deep-work' ? 5 : 2);
      xp += dayQGs.length * 20;

      if (xp > maxXP) maxXP = xp;
      history.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), fullDate: dateStr, xp });
    }
    return { history, maxXP };
  }, [dailyTasks, quarterlyGoals]);

  // Compute Pillar Health
  const pillars = useMemo(() => {
    return CATEGORIES.map(cat => {
      const goal = annualGoals.find(g => g.category === cat.id && g.status !== 'done');
      let progress = 0;
      if (goal) {
        const subQuarterlyIds = quarterlyGoals.filter(q => q.annualGoalId === goal.id).map(q => q.id);
        const relatedTasks = allTasks.filter(t => t.annualGoalId === goal.id || (t.quarterlyGoalId && subQuarterlyIds.includes(t.quarterlyGoalId)));
        const doneCount = relatedTasks.filter(t => t.status === 'done').length;
        progress = relatedTasks.length ? Math.round((doneCount / relatedTasks.length) * 100) : 0;
      }
      return { ...cat, goal, progress };
    });
  }, [annualGoals, quarterlyGoals, allTasks]);

  const totalXP14D = xpHistory.history.reduce((sum, day) => sum + day.xp, 0);

  return (
    <div className="pb-24 max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-500 px-4 md:px-8 pt-8">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tight flex items-center gap-3">
            <Activity size={28} className="text-primary" /> Analytics Hub
          </h2>
          <p className="font-body text-[11px] text-on-surface-variant/50 uppercase tracking-widest mt-1">
            System Performance Metrics
          </p>
        </div>

        <div className="flex items-center gap-4">
           {/* VIEW MODE TOGGLE */}
           <div className="flex bg-surface-container rounded-full p-1 border border-white/5">
              <button onClick={() => setViewMode('focus')}
                 className={`flex items-center gap-2 px-6 py-2 rounded-full font-headline font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'focus' ? 'bg-[#212328] text-primary shadow-lg shadow-primary/10' : 'text-on-surface-variant/40 hover:text-on-surface-variant'}`}>
                 <Timer size={14}/> Focus Velocity
              </button>
              <button onClick={() => setViewMode('xp')}
                 className={`flex items-center gap-2 px-6 py-2 rounded-full font-headline font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'xp' ? 'bg-[#212328] text-[#ffba38] shadow-lg shadow-[#ffba38]/10' : 'text-on-surface-variant/40 hover:text-on-surface-variant'}`}>
                 <Zap size={14}/> XP Metrics
              </button>
           </div>

           <button onClick={() => setRoute('timer')} 
                   className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors bg-primary/5 shadow-[0_0_15px_rgba(0,219,233,0.1)]">
              <Timer size={16}/>
              <span className="text-[11px] uppercase font-bold tracking-widest">Back to Focus</span>
           </button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
         {viewMode === 'focus' ? (
            /* FOCUS VELOCITY VIEW */
            <MetricsView isEmbedded />
         ) : (
            /* XP & STRATEGIC VIEW */
            <div className="space-y-12">
               {/* XP VELOCITY CHART */}
               <section className="bg-[#1a1c22] rounded-[2rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group hover:border-primary/20 transition-all duration-500">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-10 relative z-10">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                           <Zap size={20} className="text-primary" />
                        </div>
                        <div>
                           <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight">XP Velocity</h3>
                           <p className="font-headline font-black text-[9px] uppercase tracking-widest text-primary/60">Last 14 Days</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="font-headline font-black text-4xl text-primary tabular-nums">{totalXP14D}</div>
                        <div className="font-headline font-black text-[8px] uppercase tracking-widest text-on-surface-variant/40 mt-1">Total XP Generated</div>
                     </div>
                  </div>

                  <div className="h-64 flex items-end justify-between gap-2 relative z-10 overflow-x-auto no-scrollbar">
                     {xpHistory.history.map((day) => {
                        const heightPct = xpHistory.maxXP > 0 ? (day.xp / Math.max(xpHistory.maxXP, 20)) * 100 : 0;
                        return (
                           <div key={day.fullDate} className="flex flex-col items-center flex-1 min-w-[30px] gap-3 group/bar">
                              <div className="text-[10px] font-headline font-black text-primary opacity-0 group-hover/bar:opacity-100 transition-opacity translate-y-2 group-hover/bar:-translate-y-0 tabular-nums">
                                 {day.xp}
                              </div>
                              <div className="w-full bg-black/40 rounded-t-lg relative overflow-hidden flex flex-col justify-end" style={{ height: '100%', minHeight: '4px' }}>
                                 <div className="w-full bg-primary transition-all duration-1000 group-hover/bar:bg-[#00e475] shadow-[0_0_15px_rgba(0,219,233,0.3)] rounded-t-sm" style={{ height: `${heightPct}%` }} />
                              </div>
                              <div className="text-[8px] font-bold uppercase tracking-widest text-on-surface-variant/40 group-hover/bar:text-on-surface transition-colors">
                                 {day.date}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </section>

               {/* PILLAR HEALTH */}
               <section className="space-y-6">
                  <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight flex items-center gap-3">
                     <Target size={20} className="text-secondary" /> Pillar Health
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                     {pillars.map(pillar => {
                        const Icon = pillar.icon;
                        return (
                           <div key={pillar.id} className="bg-[#111318] rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors shadow-lg">
                              <div className="flex items-center gap-3 mb-6">
                                 <div className={`p-2.5 rounded-xl bg-black/40 ${pillar.color} border border-white/5 shadow-inner`}>
                                    <Icon size={16} />
                                 </div>
                                 <span className="font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant/60">{pillar.label}</span>
                              </div>
                              
                              <div className="flex items-end justify-between mb-3">
                                 <span className={`font-headline font-black text-2xl tabular-nums ${pillar.color}`}>{pillar.progress}%</span>
                                 <span className="font-headline font-black text-[8px] uppercase tracking-widest text-on-surface-variant/40 pb-1">Stability</span>
                              </div>

                              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
                                 <div className={`h-full rounded-full transition-all duration-1000 ${pillar.bg} shadow-[0_0_10px_currentColor]`} style={{ width: `${pillar.progress}%` }} />
                              </div>

                              {pillar.goal ? (
                                 <p className="mt-4 font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant/40 truncate">
                                    {pillar.goal.title}
                                 </p>
                              ) : (
                                 <p className="mt-4 font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant/20 italic">
                                    No active directive
                                 </p>
                              )}
                           </div>
                        );
                     })}
                  </div>
               </section>
            </div>
         )}
      </div>

    </div>
  );
};
