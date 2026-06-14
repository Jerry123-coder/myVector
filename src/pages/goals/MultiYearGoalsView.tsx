import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../../lib/DbContext';
import { type MultiYearGoal } from '../../lib/db';
import { Trash2, Globe, Sparkles, Edit3, Image as ImageIcon, Target, ChevronRight } from 'lucide-react';
import { useToast } from '../../components/ToastContext';
import { nowMs } from '../../lib/time';
import { StatusRibbon } from '../../components/StatusRibbon';
import { motion, AnimatePresence } from 'framer-motion';

const PILLARS = ['CRAFT', 'FINANCE', 'HEALTH', 'SOCIAL', 'CHARACTER', 'OTHER'] as const;

const PILLAR_COLORS: Record<string, string> = {
  CRAFT: 'from-[#00dbe9] to-[#00f0ff]',
  FINANCE: 'from-[#00e475] to-[#00ff9d]',
  HEALTH: 'from-[#ff4081] to-[#ff79b0]',
  SOCIAL: 'from-[#b464ff] to-[#d7a1ff]',
  CHARACTER: 'from-[#ffba38] to-[#ffd581]',
  OTHER: 'from-[#646464] to-[#a0a0a0]',
};

export const MultiYearGoalsView = () => {
  const { db, isTestMode } = useDb();
  const { showToast } = useToast();

  const multiYearGoals = useLiveQuery(() => db.multiYearGoals.toArray(), [isTestMode]) ?? [];
  const annualGoals    = useLiveQuery(() => db.annualGoals.toArray(), [isTestMode]) ?? [];
  const allTasks       = useLiveQuery(() => db.tasks.toArray(), [isTestMode]) ?? [];

  const [creatingGoal, setCreatingGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [goalTitle, setGoalTitle]       = useState('');
  const [goalDesc, setGoalDesc]         = useState('');
  const [goalAchievement, setGoalAchievement] = useState('');
  const [goalImageUrl, setGoalImageUrl] = useState('');
  const [goalTargetYear, setGoalTargetYear] = useState<number>(new Date().getFullYear() + 3);
  const [goalCategory, setGoalCategory] = useState<MultiYearGoal['category']>('CRAFT');

  const saveGoal = async () => {
    if (!goalTitle.trim()) return;
    const now = nowMs();
    const payload = {
      title: goalTitle.trim().toUpperCase(), 
      description: goalDesc,
      targetAchievement: goalAchievement,
      imageUrl: goalImageUrl,
      category: goalCategory,
      targetYear: goalTargetYear,
      updatedAt: Date.now() 
    };

    if (editingGoalId) {
      await db.multiYearGoals.update(editingGoalId, payload);
      showToast('Vision Refined', 'success');
    } else {
      await db.multiYearGoals.add({
        ...payload,
        status: 'active', 
        createdAt: now,
      });
      showToast('Vision Established', 'success');
    }
    resetForm();
  };

  const resetForm = () => {
    setGoalTitle(''); setGoalDesc(''); setGoalAchievement(''); setGoalImageUrl('');
    setEditingGoalId(null); setCreatingGoal(false);
  };

  const deleteGoal = async (id: number) => {
    if (confirm("Erase this vision?")) {
      await db.multiYearGoals.delete(id);
      showToast('Vision Erased', 'info');
    }
  };

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4">
      <StatusRibbon />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight flex items-center gap-3">
            <Globe size={20} className="text-primary" /> Core Vision
          </h2>
          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mt-1">Long Term Goals</p>
        </div>
        {!creatingGoal && (
          <button onClick={() => setCreatingGoal(true)} 
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-[14px] font-headline font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg">
            <Sparkles size={14} /> Establish Vision
          </button>
        )}
      </div>

      <AnimatePresence>
        {creatingGoal && (
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             className="mb-16 bg-[#16181d] rounded-[14px] p-10 border border-white/10 shadow-2xl relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-10">
                 {/* Image Preview */}
                 <div className="lg:col-span-4 flex flex-col gap-3">
                    <span className="text-[8px] font-black uppercase tracking-widest text-primary/60 ml-1">Visual Anchor</span>
                    <div className="aspect-[4/5] rounded-[14px] bg-black/40 border border-white/5 overflow-hidden relative group">
                       {goalImageUrl ? (
                          <img src={goalImageUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                       ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant/10 gap-3">
                             <ImageIcon size={40} strokeWidth={1} />
                             <span className="text-[7px] uppercase font-bold tracking-widest text-center px-6 opacity-40">Drop inspiration image URL here</span>
                          </div>
                       )}
                       <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6">
                          <input value={goalImageUrl} onChange={e => setGoalImageUrl(e.target.value)} placeholder="Paste URL..." 
                                 className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-[10px] text-on-surface outline-none focus:border-primary/40" />
                       </div>
                    </div>
                 </div>

                 {/* Fields */}
                 <div className="lg:col-span-8 flex flex-col gap-6">
                    <div>
                       <span className="text-[8px] font-black uppercase tracking-widest text-primary/60 ml-1">Core Objective</span>
                       <input autoFocus value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="E.G. BECOME A MASTER ARCHITECT..." 
                              className="w-full mt-1.5 bg-black/40 rounded-[14px] px-6 py-4 font-headline font-black text-xl text-primary uppercase border border-white/5 outline-none focus:border-primary/40 transition-colors" />
                    </div>

                    <div>
                       <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1">Ultimate Victory Definition</span>
                       <textarea value={goalAchievement} onChange={e => setGoalAchievement(e.target.value)} placeholder="What does absolute victory look like?..." 
                                 className="w-full mt-1.5 bg-black/40 rounded-[14px] px-6 py-4 font-body text-sm text-on-surface border border-white/5 outline-none focus:border-primary/40 transition-colors min-h-[100px]" />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div>
                          <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1">Target Horizon</span>
                          <input type="number" value={goalTargetYear} onChange={e => setGoalTargetYear(Number(e.target.value))} 
                                 className="w-full mt-1.5 bg-black/40 rounded-[14px] px-6 py-3 font-headline font-black text-xl text-primary border border-white/5 outline-none focus:border-primary/40 transition-colors" />
                       </div>
                       <div>
                          <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 ml-1">Life Sector</span>
                          <select value={goalCategory} onChange={e => setGoalCategory(e.target.value as any)} 
                                  className="w-full mt-1.5 bg-black/40 rounded-[14px] px-6 py-4 font-headline font-black text-xs text-primary uppercase border border-white/5 outline-none">
                             {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="flex gap-4 mt-auto pt-4">
                       <button onClick={saveGoal} className="flex-1 py-4 rounded-[14px] bg-primary text-black font-headline font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Establish Trajectory</button>
                       <button onClick={resetForm} className="px-10 py-4 rounded-[14px] bg-white/5 font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40 hover:text-on-surface transition-colors border border-white/5">Abort</button>
                    </div>
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
         {multiYearGoals.map(vision => {
            const linkedAnnual = annualGoals.filter(g => g.multiYearGoalId === vision.id);
            
            const totalAnnualProgress = linkedAnnual.length > 0 ? (() => {
               let sumPct = 0;
               linkedAnnual.forEach(ag => {
                  const tasks = allTasks.filter(t => t.annualGoalId === ag.id);
                  const done = tasks.filter(t => t.status === 'done').length;
                  sumPct += tasks.length ? (done / tasks.length) * 100 : 0;
               });
               return Math.round(sumPct / linkedAnnual.length);
            })() : 0;

            const pillarGradient = PILLAR_COLORS[vision.category ?? 'OTHER'];

            return (
               <motion.div key={vision.id} layout className="group relative bg-[#0f1115]/60 backdrop-blur-md rounded-[14px] overflow-hidden border border-white/5 shadow-2xl hover:border-primary/40 transition-all duration-500 flex flex-col h-full">
                  {/* Image Header */}
                  <div className="h-48 relative overflow-hidden">
                     {vision.imageUrl ? (
                        <img src={vision.imageUrl} alt={vision.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                     ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${pillarGradient} opacity-20`} />
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-transparent to-transparent" />
                     
                     <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                        <span className={`px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[7px] font-black uppercase tracking-widest text-primary border border-white/10`}>
                           {vision.category}
                        </span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                           <button onClick={() => { 
                              setEditingGoalId(vision.id!); 
                              setGoalTitle(vision.title); 
                              setGoalDesc(vision.description || ''); 
                              setGoalAchievement(vision.targetAchievement || '');
                              setGoalImageUrl(vision.imageUrl || '');
                              setGoalCategory(vision.category ?? 'CRAFT'); 
                              setGoalTargetYear(vision.targetYear); 
                              setCreatingGoal(true); 
                           }} className="w-8 h-8 rounded-lg bg-black/80 backdrop-blur-md flex items-center justify-center hover:bg-primary hover:text-black transition-all">
                              <Edit3 size={12} />
                           </button>
                           <button onClick={() => deleteGoal(vision.id!)} className="w-8 h-8 rounded-lg bg-black/80 backdrop-blur-md flex items-center justify-center hover:bg-error hover:text-white transition-all">
                              <Trash2 size={12} />
                           </button>
                        </div>
                     </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                     <div className="flex-1">
                        <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-2">
                           {vision.title}
                        </h3>
                        {vision.targetAchievement && (
                           <p className="font-body text-[10px] text-on-surface-variant/60 leading-relaxed mb-6 line-clamp-3 italic opacity-80">
                              "{vision.targetAchievement}"
                           </p>
                        )}
                     </div>

                     <div className="mt-auto space-y-4">
                        {/* Progress Tracker */}
                        <div className="space-y-1.5">
                           <div className="flex justify-between items-end">
                              <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/40">Total Progress</span>
                              <span className="text-lg font-headline font-black text-primary tabular-nums leading-none">{totalAnnualProgress}%</span>
                           </div>
                           <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${totalAnnualProgress}%` }} className="h-full bg-primary shadow-[0_0_10px_rgba(0,219,233,0.4)]" />
                           </div>
                        </div>

                        <div className="flex items-center justify-between py-2 border-t border-white/5">
                           <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center">
                                 <span className="font-headline font-black text-[9px] text-primary">{vision.targetYear}</span>
                              </div>
                              <span className="text-[8px] font-black text-on-surface-variant/30 uppercase tracking-widest">Target_Peak</span>
                           </div>
                           <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5">
                              <Target size={10} className="text-secondary/60" />
                              <span className="text-[9px] font-black text-on-surface tabular-nums leading-none">{linkedAnnual.length}</span>
                           </div>
                        </div>

                        {linkedAnnual.length > 0 && (
                           <div className="pt-2 border-t border-white/5">
                              <div className="flex items-center justify-between mb-2">
                                 <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/20">Yearly Anchors</span>
                                 <ChevronRight size={10} className="text-on-surface-variant/10" />
                              </div>
                              <div className="flex flex-wrap gap-1">
                                 {linkedAnnual.slice(0, 2).map(ag => (
                                    <div key={ag.id} className="px-1.5 py-0.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-center gap-1 min-w-0">
                                       <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/60 truncate">{ag.title}</span>
                                    </div>
                                  ))}
                                  {linkedAnnual.length > 2 && <span className="text-[7px] font-black text-on-surface-variant/20">+{linkedAnnual.length - 2}</span>}
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               </motion.div>
            );
         })}

         {multiYearGoals.length === 0 && !creatingGoal && (
            <div className="col-span-full py-32 text-center bg-[#0f1115]/40 rounded-[14px] border border-white/5 border-dashed">
               <Sparkles size={32} className="mx-auto text-primary/10 mb-6" />
               <h3 className="font-headline font-black text-lg text-on-surface-variant/40 uppercase tracking-[0.4em] mb-4">No Vision Anchors</h3>
               <button onClick={() => setCreatingGoal(true)} 
                       className="px-8 py-3 bg-primary text-black rounded-[14px] font-headline font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all">
                  Establish Vision
               </button>
            </div>
         )}
      </div>
    </div>
  );
};
