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

export const CommandDashboard = () => {
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

  // Vision Ingress State
  const [visionInput, setVisionInput] = useState('');
  const [visionImg, setVisionImg] = useState('');
  const [visionYear, setVisionYear] = useState(new Date().getFullYear() + 3);

  const pillars = useMemo(() => {
    return categories.map(cat => {
      const vision = multiYears.find(v => v.category === cat.id && v.status !== 'done');
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
      return { ...cat, vision, goal, progress, delta, sparkData };
    });
  }, [multiYears, annuals, quarterlies, allTasks, categories, now]);

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

  const deployVision = async () => {
    if (!visionInput.trim()) return;
    await db.multiYearGoals.add({
      title: visionInput.trim().toUpperCase(),
      imageUrl: visionImg.trim(),
      targetYear: visionYear,
      status: 'active',
      category: 'CRAFT',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setVisionInput('');
    setVisionImg('');
    showToast('Horizon Vision Captured', 'success');
  };

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

      {/* STRATEGIC HORIZON: THE LIVE VISION BOARD */}
      <div className="mt-16 mb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
           <div className="space-y-2">
              <h2 className="text-[11px] font-black text-primary uppercase tracking-[0.6em] flex items-center gap-3">
                 <Globe size={16} /> Strategic Horizon
              </h2>
              <p className="text-[10px] font-bold text-on-surface-variant/20 uppercase tracking-widest">3-5 Year Vision Board Integration</p>
           </div>
           
           <div className="flex items-center gap-3 bg-black/40 p-2 rounded-3xl border border-white/5 backdrop-blur-3xl shadow-2xl">
              <div className="flex flex-col gap-1 px-4 border-r border-white/5">
                 <input 
                    value={visionInput}
                    onChange={e => setVisionInput(e.target.value)}
                    placeholder="VISION TITLE..." 
                    className="bg-transparent border-none outline-none text-[11px] font-black uppercase tracking-widest text-primary w-48 placeholder:text-on-surface-variant/20"
                 />
                 <input 
                    value={visionImg}
                    onChange={e => setVisionImg(e.target.value)}
                    placeholder="IMAGE URL (OPTIONAL)..." 
                    className="bg-transparent border-none outline-none text-[8px] font-bold uppercase tracking-widest text-on-surface-variant/40 w-48 placeholder:text-on-surface-variant/10"
                 />
              </div>
              <select 
                value={visionYear}
                onChange={e => setVisionYear(parseInt(e.target.value))}
                className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-on-surface-variant/60 px-2 cursor-pointer"
              >
                {[3,4,5,6].map(offset => (
                  <option key={offset} value={new Date().getFullYear() + offset}>
                    {new Date().getFullYear() + offset}
                  </option>
                ))}
              </select>
              <button onClick={deployVision} className="w-12 h-12 bg-primary text-black rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg">
                <Sparkles size={18} />
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
           {multiYears.filter(v => v.status === 'active').slice(0, 3).map(vision => {
              const pillar = categories.find(c => c.id === vision.category);
              return (
                <motion.div 
                  key={vision.id}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="group relative aspect-[16/10] rounded-[32px] overflow-hidden bg-[#0f1115] border border-white/5 shadow-2xl cursor-pointer"
                >
                  {/* Background Image / Gradient */}
                  {vision.imageUrl ? (
                     <img src={vision.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-1000" />
                  ) : (
                     <div className="absolute inset-0 bg-gradient-to-br from-black via-[#1a1a1a] to-black opacity-60" />
                  )}
                  
                  {/* Glass Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  
                  {/* Pillar Accent */}
                  <div className="absolute top-0 left-0 w-1 h-full opacity-60" style={{ backgroundColor: pillar?.glow }} />

                  {/* Content Overlay */}
                  <div className="absolute inset-0 p-10 flex flex-col justify-between z-10">
                     <div className="flex justify-between items-start">
                        <div className={`px-4 py-1.5 rounded-xl border backdrop-blur-xl text-[9px] font-black uppercase tracking-[0.3em] ${pillar?.border} ${pillar?.color} bg-black/40 shadow-xl`}>
                           {pillar?.label || 'Strategic'}
                        </div>
                        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 flex flex-col items-center">
                           <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-none">TARGET</span>
                           <span className="text-lg font-headline font-black text-primary tracking-tighter mt-1">{vision.targetYear}</span>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h3 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tight leading-tight group-hover:text-primary transition-colors">
                           {vision.title}
                        </h3>
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 duration-500">
                           <span className="text-[10px] font-black uppercase tracking-widest text-primary">Explore Directive</span>
                           <ChevronRight size={14} className="text-primary" />
                        </div>
                     </div>
                  </div>
                </motion.div>
              );
           })}
           {multiYears.filter(v => v.status === 'active').length === 0 && (
              <div className="md:col-span-2 xl:col-span-3 py-32 text-center border-2 border-dashed border-white/5 rounded-[32px] bg-black/20">
                 <p className="text-[11px] font-black uppercase tracking-[0.6em] text-on-surface-variant/10">Strategic_Horizon_Offline_Capture_Vision_Above</p>
              </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Sector Telemetry */}
        <div className="lg:col-span-8 space-y-12">
           <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black text-on-surface-variant/30 uppercase tracking-[0.5em] flex items-center gap-3">
                 <Activity size={16} /> Sector Telemetry
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
                                   <Globe size={10} /> HORIZON {p.vision.targetYear}
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
                                   <span className="text-[8px] font-black uppercase tracking-[0.3em] text-on-surface-variant/20">MOMENTUM</span>
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-on-surface-variant/20">ANNUAL_DECK</span>
                             </div>
                          </div>
                       </div>
                    ) : (
                       <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl opacity-20 group-hover:opacity-40 transition-opacity">
                          <p className="text-[9px] font-black uppercase tracking-widest italic">Awaiting Strategy</p>
                       </div>
                    )}
                 </motion.div>
              ))}
           </div>
        </div>

        {/* Right Column: Horizon Radar & Pipeline */}
        <div className="lg:col-span-4 space-y-12">
           <section className="space-y-8">
              <h2 className="text-[11px] font-black text-on-surface-variant/30 uppercase tracking-[0.5em] flex items-center gap-3 px-2">
                 <Rocket size={16} className="text-secondary" /> Horizon Radar
              </h2>
              <div className="space-y-4">
                 {roadmap.map(item => (
                    <div key={item.id} className="p-6 bg-black/40 border border-white/5 rounded-[24px] flex items-center justify-between group hover:border-primary/20 transition-all hover:bg-black/60 shadow-lg">
                       <div className="flex items-center gap-5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-black/60 border border-white/5 ${item.color} shadow-xl`}>
                             {item.type === 'MILESTONE' ? <Target size={18} /> : <Zap size={18} />}
                          </div>
                          <div>
                             <p className="text-[8px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 mb-1">{getTMinus(item.date)}</p>
                             <p className="text-sm font-headline font-black text-on-surface uppercase tracking-tight">{item.label}</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-on-surface-variant/20 group-hover:text-primary transition-all" />
                    </div>
                 ))}
              </div>
           </section>

           <section className="space-y-8">
              <h2 className="text-[11px] font-black text-on-surface-variant/30 uppercase tracking-[0.5em] flex items-center gap-3 px-2">
                 <Target size={16} className="text-primary" /> Active Pipeline
              </h2>
              <div className="space-y-6">
                 {activeFocus.map(q => (
                    <div key={q.id} className="p-8 bg-primary/5 border border-primary/10 rounded-[32px] space-y-6 shadow-2xl relative overflow-hidden group/pipe">
                       <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover/pipe:opacity-[0.05] transition-opacity">
                          <Target size={80} className="text-primary" />
                       </div>
                       <div className="flex justify-between items-start relative z-10">
                          <div className="flex flex-col">
                             <h4 className="text-base font-headline font-black text-primary uppercase tracking-tight truncate max-w-[180px]">{q.title}</h4>
                             <span className="text-[9px] font-black text-primary/40 uppercase tracking-[0.3em] mt-1">QUARTERLY DECK</span>
                          </div>
                          <span className="text-xl font-headline font-black text-primary/60">{q.progress}%</span>
                       </div>
                       <div className="space-y-2 relative z-10">
                          {q.tasks.map(t => (
                             <div key={t.id} onClick={() => toggleTask(t)} className="flex items-center gap-4 p-4 bg-black/60 rounded-2xl border border-white/5 hover:border-primary/40 cursor-pointer group/task transition-all shadow-lg">
                                <Circle size={12} className="text-on-surface-variant/20 group-hover/task:text-primary transition-colors" />
                                <span className="text-[10px] font-headline font-bold text-on-surface/80 uppercase tracking-widest truncate">{t.label}</span>
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
