import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../../lib/DbContext';
import { type MultiYearGoal } from '../../lib/db';
import { Trash2, Activity, Globe, Sparkles, Edit3 } from 'lucide-react';
import { useToast } from '../../components/ToastContext';
import { nowMs } from '../../lib/time';

const PILLARS = ['CRAFT', 'FINANCE', 'HEALTH', 'SOCIAL', 'CHARACTER', 'OTHER'] as const;

export const MultiYearGoalsView = () => {
  const { db, isTestMode } = useDb();
  const { showToast } = useToast();

  const multiYearGoals = useLiveQuery(() => db.multiYearGoals.toArray(), [isTestMode]) ?? [];
  const annualGoals    = useLiveQuery(() => db.annualGoals.toArray(), [isTestMode]) ?? [];

  const [creatingGoal, setCreatingGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [goalTitle, setGoalTitle]       = useState('');
  const [goalDesc, setGoalDesc]         = useState('');
  const [goalTargetYear, setGoalTargetYear] = useState<number>(new Date().getFullYear() + 3);
  const [goalCategory, setGoalCategory] = useState<MultiYearGoal['category']>('CRAFT');

  const saveGoal = async () => {
    if (!goalTitle.trim()) return;
    const now = nowMs();
    if (editingGoalId) {
      await db.multiYearGoals.update(editingGoalId, { 
        title: goalTitle.trim().toUpperCase(), 
        description: goalDesc,
        category: goalCategory,
        targetYear: goalTargetYear,
        updatedAt: Date.now() 
      });
      showToast('Vision Updated', 'success');
    } else {
      await db.multiYearGoals.add({
        title: goalTitle.trim().toUpperCase(), 
        description: goalDesc,
        status: 'active', 
        category: goalCategory, 
        targetYear: goalTargetYear,
        createdAt: now, updatedAt: now
      });
      showToast('New Vision Established', 'success');
    }
    setGoalTitle(''); setGoalDesc(''); setEditingGoalId(null); setCreatingGoal(false);
  };

  const deleteGoal = async (id: number) => {
    if (confirm("Erase this multi-year vision? Linked annual goals will become standalone.")) {
      await db.multiYearGoals.delete(id);
      showToast('Vision Erased', 'info');
    }
  };

  return (
    <div className="pb-24 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tight flex items-center gap-3">
            <Globe size={28} className="text-primary" /> Vision Board
          </h2>
          <p className="font-body text-[11px] text-on-surface-variant/50 uppercase tracking-widest mt-1">
            Multi-Year Strategic Trajectories
          </p>
        </div>
        {!creatingGoal && (
          <button onClick={() => setCreatingGoal(true)} className="flex items-center gap-2 px-5 py-3 glass rounded-xl font-headline font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all">
            <Sparkles size={14} /> Establish Vision
          </button>
        )}
      </div>

      {creatingGoal && (
         <div className="mb-12 bg-gradient-to-br from-[#1a1c22] to-[#0a0c10] rounded-[2rem] p-10 border border-primary/30 shadow-[0_0_50px_rgba(0,219,233,0.1)] animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="flex items-center gap-3 mb-8 relative z-10">
               <Globe size={24} className="text-primary" />
               <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight">{editingGoalId ? 'Refine_Vision' : 'New_Strategic_Vision'}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 relative z-10">
               <div className="md:col-span-2">
                  <span className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-primary/60 ml-1">Vision_Identifier</span>
                  <input autoFocus value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="E.g., FINANCIAL INDEPENDENCE..." className="w-full mt-2 bg-black/40 rounded-2xl px-6 py-5 font-headline font-black text-2xl text-primary uppercase border border-white/5 outline-none focus:border-primary/40 transition-colors" />
               </div>
               <div className="md:col-span-2">
                  <span className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40 ml-1">Manifesto / Description</span>
                  <textarea value={goalDesc} onChange={e => setGoalDesc(e.target.value)} placeholder="Describe the end state..." className="w-full mt-2 bg-black/40 rounded-2xl px-6 py-5 font-body text-sm text-on-surface border border-white/5 outline-none focus:border-primary/40 transition-colors min-h-[100px]" />
               </div>
               <div>
                  <span className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40 ml-1">Target_Year</span>
                  <input type="number" value={goalTargetYear} onChange={e => setGoalTargetYear(Number(e.target.value))} className="w-full mt-2 bg-black/40 rounded-2xl px-6 py-5 font-headline font-black text-lg text-primary border border-white/5 outline-none focus:border-primary/40 transition-colors" />
               </div>
               <div>
                  <span className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40 ml-1">Sector_Pillar</span>
                  <select value={goalCategory} onChange={e => setGoalCategory(e.target.value as any)} className="w-full mt-2 bg-black/40 rounded-2xl px-6 py-5 font-headline font-black text-sm text-primary uppercase border border-white/5 outline-none">
                     {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
               </div>
            </div>
            <div className="flex gap-4 relative z-10">
               <button onClick={saveGoal} className="px-10 py-4 rounded-xl font-headline font-black text-xs uppercase tracking-widest text-black shadow-xl hover:scale-105 active:scale-95 transition-all" style={{ background: '#00dbe9' }}>Establish_Trajectory</button>
               <button onClick={() => { setCreatingGoal(false); setEditingGoalId(null); setGoalTitle(''); setGoalDesc(''); }} className="px-10 py-4 rounded-xl glass font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant/40 hover:text-on-surface transition-colors">Abort</button>
            </div>
         </div>
      )}

      {multiYearGoals.length === 0 && !creatingGoal ? (
        <div className="py-32 text-center">
          <Sparkles size={48} className="mx-auto text-primary/20 mb-6" />
          <div className="font-headline font-black text-sm text-on-surface-variant/30 uppercase tracking-[0.5em] mb-8">The horizon is clear. Plot your course.</div>
          <button onClick={() => setCreatingGoal(true)} className="px-8 py-3 rounded-xl font-headline font-black text-[10px] uppercase tracking-widest text-black active:scale-95 transition-all shadow-[0_0_30px_rgba(0,219,233,0.3)]" style={{ background: '#00dbe9' }}>
            Set First Vision
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {multiYearGoals.map(vision => {
             const linkedAnnual = annualGoals.filter(g => g.multiYearGoalId === vision.id);
             return (
               <div key={vision.id} className="relative group bg-[#0a0c10] rounded-[2rem] p-8 overflow-hidden border border-white/5 shadow-2xl hover:border-primary/20 transition-all duration-500">
                  <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/5 rounded-full blur-[80px] group-hover:bg-primary/10 transition-colors pointer-events-none" />
                  
                  <div className="relative z-10 flex justify-between items-start mb-6">
                     <span className="px-3 py-1 rounded-lg bg-white/5 text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/60 border border-white/5">
                        {vision.category ?? 'Life'}
                     </span>
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingGoalId(vision.id!); setGoalTitle(vision.title); setGoalDesc(vision.description || ''); setGoalCategory(vision.category ?? 'CRAFT'); setGoalTargetYear(vision.targetYear); setCreatingGoal(true); }} className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors text-on-surface-variant/40">
                           <Edit3 size={14} />
                        </button>
                        <button onClick={() => deleteGoal(vision.id!)} className="p-2 rounded-xl bg-white/5 hover:bg-error/20 hover:text-error transition-colors text-on-surface-variant/40">
                           <Trash2 size={14} />
                        </button>
                     </div>
                  </div>

                  <div className="relative z-10 mb-8">
                     <h3 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tighter leading-tight mb-4 group-hover:text-primary transition-colors">
                        {vision.title}
                     </h3>
                     {vision.description && (
                        <p className="font-body text-sm text-on-surface-variant/60 leading-relaxed">
                           {vision.description}
                        </p>
                     )}
                  </div>

                  <div className="relative z-10 flex items-center justify-between py-4 border-t border-b border-white/5 mb-6">
                     <div>
                        <span className="block font-headline font-black text-[8px] uppercase tracking-widest text-on-surface-variant/40 mb-1">Target Horizon</span>
                        <span className="font-headline font-black text-xl text-primary tabular-nums">{vision.targetYear}</span>
                     </div>
                     <div className="text-right">
                        <span className="block font-headline font-black text-[8px] uppercase tracking-widest text-on-surface-variant/40 mb-1">Linked Annual Ops</span>
                        <span className="font-headline font-black text-xl text-on-surface tabular-nums">{linkedAnnual.length}</span>
                     </div>
                  </div>

                  {linkedAnnual.length > 0 && (
                     <div className="relative z-10">
                        <span className="font-headline font-black text-[8px] uppercase tracking-widest text-on-surface-variant/30 mb-3 block">Executing Pillars</span>
                        <div className="space-y-2">
                           {linkedAnnual.map(ag => (
                              <div key={ag.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                                 <Activity size={12} className="text-primary/60 shrink-0" />
                                 <span className="font-headline font-bold text-[10px] text-on-surface uppercase tracking-widest truncate">{ag.title}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
             );
          })}
        </div>
      )}
    </div>
  );
};
