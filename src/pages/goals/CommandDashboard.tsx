import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task } from '../../lib/db';
import { getTMinus } from '../../lib/metrics';
import { Sparkline } from '../../components/layout/Sparkline';
import {
  Target, Zap, Circle,
  DollarSign, Heart, Users, Cpu, ArrowRight, Sparkles, Shield, Rocket, Activity, ChevronDown
} from 'lucide-react';

const CATEGORIES = [
  { id: 'CRAFT', label: 'Craft & Skills', icon: Cpu, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20', glow: 'shadow-primary/20', gradient: 'from-primary/20 to-transparent' },
  { id: 'FINANCE', label: 'Financial Freedom', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/5', border: 'border-emerald-400/20', glow: 'shadow-emerald-400/20', gradient: 'from-emerald-400/20 to-transparent' },
  { id: 'HEALTH', label: 'Vitality & Health', icon: Heart, color: 'text-error', bg: 'bg-error/5', border: 'border-error/20', glow: 'shadow-error/20', gradient: 'from-error/20 to-transparent' },
  { id: 'SOCIAL', label: 'Social & Family', icon: Users, color: 'text-[#00e475]', bg: 'bg-[#00e475]/5', border: 'border-[#00e475]/20', glow: 'shadow-[#00e475]/20', gradient: 'from-[#00e475]/20 to-transparent' },
  { id: 'CHARACTER', label: 'Character & Brand', icon: Shield, color: 'text-[#FFBA38]', bg: 'bg-[#FFBA38]/5', border: 'border-[#FFBA38]/20', glow: 'shadow-[#FFBA38]/20', gradient: 'from-[#FFBA38]/20 to-transparent' },
] as const;

export const CommandDashboard = () => {
  const [now] = useState(() => Date.now());

  // Data Queries
  const annuals = useLiveQuery(() => db.annualGoals.toArray(), []) ?? [];
  const quarterlies = useLiveQuery(() => db.quarterlyGoals.toArray(), []) ?? [];
  const milestones = useLiveQuery(() => db.milestones.where('status').notEqual('done').toArray(), []) ?? [];
  const sprints = useLiveQuery(() => db.sprints.where('status').equals('active').toArray(), []) ?? [];
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];

  // Derived: Tier 1 - Life Pillars (High-Fidelity Engine)
  const pillars = useMemo(() => {
    return CATEGORIES.map(cat => {
      const goal = annuals.find(g => g.category === cat.id && g.status !== 'done');
      let progress = 0;
      let status: 'PEAK' | 'STEADY' | 'STATIC' | 'IDLE' = 'IDLE';
      let delta = 0;
      let sparkData: number[] = [0, 0, 0, 0, 0, 0, 0];

      if (goal) {
        const subQuarterlyIds = quarterlies.filter(q => q.annualGoalId === goal.id).map(q => q.id);
        const relatedTasks = allTasks.filter(t => 
          t.annualGoalId === goal.id || 
          (t.quarterlyGoalId && subQuarterlyIds.includes(t.quarterlyGoalId))
        );

        const doneCount = relatedTasks.filter(t => t.status === 'done').length;
        progress = relatedTasks.length ? Math.round((doneCount / relatedTasks.length) * 100) : 0;

        // Sparkline: Last 7 days
        for (let i = 0; i < 7; i++) {
          const dayStart = new Date(now - (6 - i) * 86400000).setHours(0,0,0,0);
          const dayEnd = dayStart + 86400000;
          sparkData[i] = relatedTasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= dayStart && t.completedAt < dayEnd).length;
        }

        delta = sparkData.reduce((a, b) => a + b, 0);
        if (delta >= 5) status = 'PEAK';
        else if (delta >= 1) status = 'STEADY';
        else status = 'STATIC';
      }

      return { ...cat, goal, progress, status, delta, sparkData };
    });
  }, [annuals, quarterlies, allTasks, now]);

  // Derived: Tier 2 - Strategy Roadmap
  const roadmap = useMemo(() => {
    const items = [
      ...milestones.map(m => ({ id: `m-${m.id}`, label: m.title, date: m.targetDate, type: 'MILESTONE', color: 'text-primary' })),
      ...sprints.map(s => ({ id: `s-${s.id}`, label: `${s.name} RELEASE`, date: s.endDate, type: 'SPRINT', color: 'text-secondary' })),
    ];
    return items.sort((a, b) => a.date - b.date).slice(0, 5);
  }, [milestones, sprints]);

  // Derived: Tier 3 - Operation Center
  const quarterlyOps = useMemo(() => {
    return quarterlies.filter(q => q.status === 'active').map(q => {
      const tasks = allTasks.filter(t => t.quarterlyGoalId === q.id && t.status !== 'done').slice(0, 3);
      const doneCount = allTasks.filter(t => t.quarterlyGoalId === q.id && t.status === 'done').length;
      const totalCount = allTasks.filter(t => t.quarterlyGoalId === q.id).length;
      const progress = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
      return { ...q, nextTasks: tasks, progress };
    });
  }, [quarterlies, allTasks]);

  const toggleTask = async (t: Task) => {
    if (!t.id) return;
    await db.tasks.update(t.id, {
      status: t.status === 'done' ? 'pending' : 'done',
      completedAt: t.status === 'done' ? undefined : Date.now(),
      updatedAt: Date.now()
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-24 pb-48 animate-in fade-in slide-in-from-bottom-8 duration-1000 px-4 md:px-8">
      
      {/* HEADER SECTION: THE COMMAND CONSOLE */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-12">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(0,219,233,0.1)]">
                <Rocket size={20} className="text-primary animate-pulse" />
             </div>
             <h1 className="text-4xl font-headline font-black text-on-surface uppercase tracking-tighter">Command Deck</h1>
          </div>
          <p className="text-[11px] font-bold text-on-surface-variant/40 uppercase tracking-[0.5em] pl-14">Strategic Operational Interface v2.0</p>
        </div>
        
        <div className="flex items-center gap-4 bg-surface-container/30 border border-outline-variant/10 p-4 rounded-2xl backdrop-blur-md">
           <div className="text-right">
              <div className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">Global Status</div>
              <div className="text-xs font-headline font-black text-primary uppercase">All Systems Nominal</div>
           </div>
           <div className="w-px h-8 bg-outline-variant/10" />
           <div className="flex items-center gap-2 text-secondary">
              <Activity size={16} />
              <span className="text-xl font-headline font-black tabular-nums">1.0X</span>
           </div>
        </div>
      </header>

      {/* TIER 1: THE LIFE PILLARS (ASYNCHRONOUS HUD) */}
      <section className="space-y-12">
        <div className="flex items-center gap-4">
           <h2 className="text-xs font-black text-on-surface-variant/40 uppercase tracking-[0.6em]">Life_Pillars // Macrodynamics</h2>
           <div className="h-px flex-1 bg-outline-variant/10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
          {pillars.map(pillar => (
            <div key={pillar.id} className={`relative p-10 rounded-3xl border ${pillar.border} ${pillar.bg} backdrop-blur-xl group transition-all duration-700 hover:shadow-2xl hover:${pillar.glow} hover:-translate-y-3 overflow-hidden flex flex-col justify-between min-h-[360px]`}>
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-b ${pillar.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
              
              <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-start">
                  <div className={`p-4 rounded-2xl bg-black/40 shadow-inner ${pillar.color} border border-white/5 group-hover:scale-110 transition-transform`}>
                    <pillar.icon size={26} />
                  </div>
                  {pillar.goal && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-black/40 text-[9px] font-black uppercase tracking-widest ${pillar.color} shadow-lg`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {pillar.status}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                   <div className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">{pillar.label}</div>
                   {pillar.goal ? (
                     <h3 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tight leading-[1.1] group-hover:text-white transition-colors line-clamp-2">
                       {pillar.goal.title}
                     </h3>
                   ) : (
                     <div className="h-16 flex items-center">
                        <span className="text-xs font-bold text-on-surface-variant/20 uppercase tracking-widest italic font-headline">Sector_Awaiting_Input</span>
                     </div>
                   )}
                </div>
              </div>

              {pillar.goal ? (
                <div className="space-y-8 relative z-10">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-5xl font-headline font-black text-white tabular-nums tracking-tighter">
                          {pillar.progress}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                         <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Momentum</span>
                         <Sparkline data={pillar.sparkData} color={pillar.color} width={80} height={20} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                     <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-on-surface-variant/30">
                        <span>Pillar_Stability</span>
                        <span>{pillar.delta} Tasks/7D</span>
                     </div>
                     <div className="h-1.5 w-full bg-white/5 overflow-hidden rounded-full p-0.5 border border-white/5">
                        <div className={`h-full ${pillar.color.replace('text-', 'bg-')} transition-all duration-1000 rounded-full shadow-[0_0_15px_currentColor]`} style={{ width: `${pillar.progress}%` }} />
                     </div>
                  </div>
                </div>
              ) : (
                <button className="w-full py-6 border-2 border-dashed border-outline-variant/10 rounded-2xl flex flex-col items-center justify-center gap-3 group/btn hover:border-primary/40 hover:bg-primary/5 transition-all">
                  <div className="p-3 rounded-full bg-primary/5 group-hover/btn:bg-primary/20 group-hover/btn:scale-110 transition-all">
                    <Sparkles size={20} className="text-primary/20 group-hover/btn:text-primary" />
                  </div>
                  <span className="text-[11px] font-black text-on-surface-variant/30 group-hover/btn:text-primary uppercase tracking-[0.2em]">Deploy_Strategy</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* TIER 2: TACTICAL ROADMAP (TIMELINE HUD) */}
        <div className="xl:col-span-1 space-y-12">
          <div className="flex items-center gap-4">
             <h2 className="text-xs font-black text-on-surface-variant/40 uppercase tracking-[0.6em]">Tactical_Radar</h2>
             <div className="h-px flex-1 bg-outline-variant/10" />
          </div>

          <div className="space-y-4">
            {roadmap.length > 0 ? roadmap.map((item, idx) => (
              <div key={item.id} className={`p-6 bg-surface-container-low/20 border border-outline-variant/10 rounded-2xl group hover:border-white/20 transition-all flex items-center justify-between relative overflow-hidden backdrop-blur-sm ${idx === 0 ? 'ring-1 ring-primary/30 border-primary/20' : ''}`}>
                <div className="flex items-center gap-5 relative z-10">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-black/40 border border-white/5 ${item.color}`}>
                      {item.type === 'MILESTONE' ? <Target size={14} /> : <Zap size={14} />}
                   </div>
                   <div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1 flex items-center gap-2">
                         {item.type} <span className="w-1 h-1 rounded-full bg-current opacity-40" /> {getTMinus(item.date)}
                      </div>
                      <div className="text-sm font-headline font-black text-on-surface uppercase tracking-tight group-hover:text-white transition-colors max-w-[180px] truncate">
                        {item.label}
                      </div>
                   </div>
                </div>
                <div className="text-right group-hover:translate-x-1 transition-transform">
                   <div className="text-[10px] font-headline font-black text-on-surface/40 uppercase tracking-tighter">
                      {new Date(item.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                   </div>
                   <div className="text-[7px] font-bold text-on-surface-variant/20 uppercase tracking-widest">Horizon</div>
                </div>
              </div>
            )) : (
              <div className="py-24 text-center border-2 border-dashed border-outline-variant/10 rounded-3xl flex flex-col items-center gap-4 opacity-30 group hover:opacity-100 transition-opacity">
                 <div className="p-4 rounded-full bg-on-surface/5">
                    <Shield size={32} className="text-on-surface-variant/40" />
                 </div>
                 <div className="space-y-1">
                    <span className="text-[11px] font-black text-on-surface-variant/60 uppercase tracking-[0.4em]">Sector_Secure</span>
                    <p className="text-[8px] font-bold text-on-surface-variant/20 uppercase tracking-widest italic">No Proximal Mission Constraints</p>
                 </div>
              </div>
            )}
          </div>
        </div>

        {/* TIER 3: QUARTERLY OPERATIONS (MISSION DECK) */}
        <div className="xl:col-span-2 space-y-12">
          <div className="flex items-center gap-4">
             <h2 className="text-xs font-black text-on-surface-variant/40 uppercase tracking-[0.6em]">Mission_Control</h2>
             <div className="h-px flex-1 bg-outline-variant/10" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {quarterlyOps.length > 0 ? quarterlyOps.map(q => (
              <div key={q.id} className="relative bg-[#111318]/40 border border-outline-variant/10 rounded-3xl p-10 space-y-10 group hover:border-[#00e475]/30 transition-all duration-700 overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                   <Activity size={120} className="text-secondary" />
                </div>
                
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                       <span className="px-3 py-1 bg-secondary/10 border border-secondary/20 rounded-full text-[8px] font-black text-secondary uppercase tracking-[0.2em]">{q.quarter} Mission</span>
                       <div className="h-px w-6 bg-secondary/20" />
                    </div>
                    <h4 className="text-3xl font-headline font-black text-on-surface uppercase tracking-tight leading-none group-hover:text-white transition-colors">{q.title}</h4>
                  </div>
                  <div className="flex flex-col items-end">
                     <div className="text-4xl font-headline font-black text-secondary tabular-nums tracking-tighter">{q.progress}%</div>
                     <div className="text-[8px] font-black text-secondary/40 uppercase tracking-widest">Sector_Done</div>
                  </div>
                </div>

                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative z-10 p-0.5 border border-white/5 shadow-2xl">
                   <div className="h-full bg-secondary transition-all duration-1000 rounded-full shadow-[0_0_20px_rgba(0,228,117,0.4)]" style={{ width: `${q.progress}%` }} />
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] flex items-center gap-2">
                       Active_Pipeline
                    </div>
                    <div className="h-px flex-1 mx-4 bg-outline-variant/5" />
                    <ChevronDown size={14} className="text-on-surface-variant/30 group-hover:text-secondary transition-colors" />
                  </div>
                  
                  <div className="grid gap-3">
                    {q.nextTasks.length > 0 ? q.nextTasks.map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => toggleTask(t)}
                        className="flex items-center gap-5 p-6 bg-surface-container-highest/5 hover:bg-[#00e475]/5 border border-white/5 hover:border-secondary/40 cursor-pointer transition-all rounded-2xl group/task"
                      >
                        <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center group-hover/task:border-secondary transition-colors shadow-inner">
                           <Circle size={10} className="text-transparent group-hover/task:text-secondary" />
                        </div>
                        <span className="text-[11px] font-headline font-bold text-on-surface/80 group-hover/task:text-white uppercase tracking-widest flex-1 transition-colors leading-relaxed">{t.label}</span>
                        <ArrowRight size={16} className="opacity-0 group-hover/task:opacity-100 -translate-x-2 group-hover/task:translate-x-0 transition-all text-secondary" />
                      </div>
                    )) : (
                      <div className="py-16 text-center border-2 border-dashed border-outline-variant/10 rounded-3xl flex flex-col items-center gap-4 bg-black/20">
                        <Sparkles size={24} className="text-secondary animate-pulse" />
                        <div className="space-y-1 text-center">
                          <span className="text-[11px] font-black text-secondary/60 uppercase tracking-[0.3em]">Objectives_Met</span>
                          <p className="text-[8px] font-bold text-on-surface-variant/20 uppercase tracking-widest italic leading-relaxed">System Ready for New Tactical Directives</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-outline-variant/10 rounded-3xl flex flex-col items-center gap-4 bg-[#111318]/20 opacity-30">
                 <Rocket size={40} className="text-on-surface-variant/20" />
                 <span className="text-[11px] font-black uppercase tracking-[0.5em] text-on-surface-variant">No_Active_Strategic_Operations</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
