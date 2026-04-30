import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../../lib/DbContext';
import { type SideQuest } from '../../lib/db';
import { Plus, Trash2, Activity, Target, Check, ChevronDown, ChevronUp, ListTodo, Sparkles, Zap, Minus } from 'lucide-react';
import { useToast } from '../../components/ToastContext';
import { nowMs } from '../../lib/time';
import { StatusRibbon } from '../../components/StatusRibbon';
import { motion, AnimatePresence } from 'framer-motion';

export const QuarterlyGoalsView = () => {
  const { db, isTestMode } = useDb();
  const { showToast } = useToast();

  const quarterlyGoals = useLiveQuery(() => db.quarterlyGoals.toArray(), [isTestMode]) ?? [];
  const allTasks       = useLiveQuery(() => db.tasks.toArray(), [isTestMode]) ?? [];
  const annualGoals    = useLiveQuery(() => db.annualGoals.toArray(), [isTestMode]) ?? [];
  const allQuests      = useLiveQuery(() => db.sideQuests.toArray(), [isTestMode]) ?? [];
  const categories     = useLiveQuery(() => db.categories.toArray(), [isTestMode]) ?? [];

  const [rapidInput, setRapidInput] = useState('');
  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);
  const [krInputs, setKrInputs] = useState<Record<number, string>>({});

  const addRapidFocus = async () => {
    if (!rapidInput.trim()) return;
    const now = nowMs();
    await db.quarterlyGoals.add({
      title: rapidInput.trim().toUpperCase(),
      status: 'active',
      category: 'CRAFT',
      quarter: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
      createdAt: now,
      updatedAt: now
    });
    setRapidInput('');
    showToast('Focus Established', 'success');
  };

  const deleteGoal = async (id: number) => {
    if (confirm("Decommission this objective?")) {
      await db.quarterlyGoals.delete(id);
      showToast('Objective Purged', 'info');
    }
  };

  const incrementQuest = async (quest: SideQuest) => {
    if (quest.currentCount < quest.targetCount) {
      await db.sideQuests.update(quest.id!, { currentCount: quest.currentCount + 1, updatedAt: Date.now() });
    }
  };

  const decrementQuest = async (quest: SideQuest) => {
    if (quest.currentCount > 0) {
      await db.sideQuests.update(quest.id!, { currentCount: quest.currentCount - 1, updatedAt: Date.now() });
    }
  };

  const addKr = async (qgId: number) => {
    const text = (krInputs[qgId] || '').trim();
    if (!text) return;
    const qg = await db.quarterlyGoals.get(qgId);
    if (!qg) return;
    const keyResults = qg.keyResults || [];
    keyResults.push({ id: Date.now().toString(), title: text, done: false });
    await db.quarterlyGoals.update(qgId, { keyResults, updatedAt: Date.now() });
    setKrInputs({ ...krInputs, [qgId]: '' });
  };

  const toggleKr = async (qgId: number, krId: string) => {
    const qg = await db.quarterlyGoals.get(qgId);
    if (!qg) return;
    const keyResults = (qg.keyResults || []).map(kr => kr.id === krId ? { ...kr, done: !kr.done } : kr);
    await db.quarterlyGoals.update(qgId, { keyResults, updatedAt: Date.now() });
  };

  const getPillarTheme = (catId?: string) => {
    const fallback = { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/10', glow: 'rgba(0,219,233,0.3)' };
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
        <div className="absolute inset-0 bg-primary/5 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex items-center bg-[#0f1115]/80 backdrop-blur-xl border border-white/5 p-2 rounded-[18px] shadow-2xl focus-within:border-primary/40 transition-all">
           <div className="w-12 h-12 flex items-center justify-center text-primary/40 group-focus-within:text-primary transition-colors">
              <Zap size={20} />
           </div>
           <input 
              value={rapidInput}
              onChange={e => setRapidInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRapidFocus()}
              placeholder="Initialize new 90-day focus area..."
              className="flex-1 bg-transparent border-none outline-none font-headline font-black text-sm uppercase tracking-widest text-on-surface placeholder:text-on-surface-variant/20 px-2"
           />
           <button onClick={addRapidFocus} className="px-6 py-3 bg-primary text-black rounded-[14px] font-headline font-black text-[9px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">
              Initialize
           </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em] flex items-center gap-3">
           <Target size={14} className="text-primary" /> Active Directives
        </h2>
        <span className="text-[8px] font-black text-on-surface-variant/20 uppercase tracking-widest">{quarterlyGoals.length} Strategic Hubs</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {quarterlyGoals.map(qg => {
          const qgTasks = allTasks.filter(t => t.quarterlyGoalId === qg.id);
          const qgDone = qgTasks.filter(t => t.status === 'done').length;
          const qgQuests = allQuests.filter(sq => sq.quarterlyGoalId === qg.id);
          const theme = getPillarTheme(qg.category);
          
          const isExpanded = expandedGoalId === qg.id;
          const linkedAnnual = annualGoals.find(a => a.id === qg.annualGoalId);

          const taskPct = qgTasks.length ? (qgDone / qgTasks.length) * 100 : 0;
          const questPct = qgQuests.length ? qgQuests.reduce((acc, q) => acc + (q.currentCount / q.targetCount), 0) / qgQuests.length * 100 : 0;
          const overallPct = Math.round((taskPct + (qgQuests.length ? questPct : taskPct)) / (qgQuests.length ? 2 : 1));

          return (
            <motion.div 
              key={qg.id} 
              layout
              className={`bg-[#0f1115]/40 backdrop-blur-md rounded-[14px] border transition-all duration-500 overflow-hidden relative group/card ${isExpanded ? 'border-primary/40 col-span-full shadow-2xl' : 'border-white/5 hover:border-white/10'}`}
            >
               {/* Holo Accent */}
               <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] opacity-[0.03] group-hover/card:opacity-[0.08] transition-opacity pointer-events-none" 
                    style={{ backgroundColor: theme.glow }} />
               
               <div className="p-8">
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                           <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${theme.bg} ${theme.text} border ${theme.border}`}>
                              {categories.find(c => c.id === qg.category)?.label ?? qg.category ?? 'Life'}
                           </span>
                           <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/20">{qg.quarter}</span>
                        </div>

                        <h3 className={`font-headline font-black text-2xl uppercase tracking-tight leading-tight mb-4 transition-colors ${isExpanded ? 'text-primary' : 'text-on-surface'}`}>
                           {qg.title}
                        </h3>

                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/20 mb-6">
                           <Activity size={10} className="text-secondary/40" />
                           <span>Last update: {new Date(qg.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Integrated Quests Strip */}
                        {qgQuests.length > 0 && (
                           <div className="flex flex-wrap gap-3 mb-6">
                              {qgQuests.map(sq => (
                                 <div key={sq.id} className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl px-4 py-2 group/quest">
                                    <div className="flex flex-col">
                                       <span className="text-[7px] font-black text-on-surface-variant/40 uppercase tracking-widest">{sq.title}</span>
                                       <span className="text-[10px] font-headline font-black text-primary tabular-nums">{sq.currentCount} / {sq.targetCount}</span>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                       <button onClick={() => decrementQuest(sq)} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-error/20 hover:text-error flex items-center justify-center transition-colors">
                                          <Minus size={10} />
                                       </button>
                                       <button onClick={() => incrementQuest(sq)} className="w-6 h-6 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-black flex items-center justify-center transition-colors">
                                          <Plus size={10} />
                                       </button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     <div className="flex flex-col items-end gap-6">
                        <div className="flex gap-2">
                           <button onClick={() => setExpandedGoalId(isExpanded ? null : qg.id!)}
                                   className={`w-10 h-10 flex items-center justify-center rounded-[14px] border transition-all ${isExpanded ? 'bg-primary text-black border-primary' : 'bg-white/5 border-white/5 text-on-surface-variant/40 hover:text-primary'}`}>
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                           </button>
                           <button onClick={() => deleteGoal(qg.id!)} className="w-10 h-10 flex items-center justify-center rounded-[14px] bg-white/5 border border-white/5 text-on-surface-variant/20 hover:text-error transition-all">
                              <Trash2 size={16} />
                           </button>
                        </div>
                        
                        <div className="text-right">
                           <div className="text-4xl font-headline font-black text-primary tabular-nums tracking-tighter leading-none">{overallPct}%</div>
                           <div className="text-[8px] font-black uppercase tracking-widest text-primary/40 mt-1">Operational Sync</div>
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
                            {/* Key Results */}
                            <div className="space-y-4">
                               <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 flex items-center gap-2">
                                  <Sparkles size={12} /> Key Results
                               </h4>
                               <div className="space-y-2">
                                  {(qg.keyResults || []).map(kr => (
                                     <div key={kr.id} className="flex items-center gap-3 p-3 rounded-[14px] bg-black/40 border border-white/5 group/kr">
                                        <button onClick={() => toggleKr(qg.id!, kr.id)} 
                                                className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${kr.done ? 'bg-primary border-primary text-black' : 'border-white/10 text-transparent hover:border-primary/40'}`}>
                                           <Check size={10} strokeWidth={3} />
                                        </button>
                                        <span className={`text-[10px] font-headline font-bold uppercase tracking-widest flex-1 truncate ${kr.done ? 'text-on-surface-variant/20 line-through' : 'text-on-surface/80'}`}>{kr.title}</span>
                                     </div>
                                  ))}
                                  <div className="flex items-center gap-3 p-3 rounded-[14px] border border-dashed border-white/10 focus-within:border-primary/30 transition-colors">
                                     <input value={krInputs[qg.id!] || ''} 
                                            onChange={e => setKrInputs({...krInputs, [qg.id!]: e.target.value})}
                                            onKeyDown={e => e.key === 'Enter' && addKr(qg.id!)}
                                            placeholder="Add marker..."
                                            className="bg-transparent text-[9px] font-headline font-bold uppercase tracking-widest text-on-surface outline-none placeholder:text-on-surface-variant/10 flex-1" />
                                  </div>
                               </div>
                            </div>

                            {/* Linked Annual Anchor */}
                            <div className="space-y-4">
                               <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary/60 flex items-center gap-2">
                                  <Target size={12} /> Strategic Anchor
                               </h4>
                               {linkedAnnual ? (
                                  <div className="p-6 bg-black/40 rounded-[14px] border border-white/5">
                                     <span className="text-[7px] font-black uppercase tracking-widest text-secondary/40 mb-2 block">Yearly Horizon</span>
                                     <h5 className="font-headline font-black text-sm text-on-surface uppercase tracking-tight">{linkedAnnual.title}</h5>
                                  </div>
                               ) : (
                                  <div className="py-12 text-center border border-dashed border-white/5 rounded-[14px] bg-black/20">
                                     <p className="text-[8px] font-black text-on-surface-variant/10 uppercase tracking-widest">No Yearly Linkage</p>
                                  </div>
                               )}
                            </div>

                            {/* Operational Tasks */}
                            <div className="space-y-4">
                               <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ffba38]/60 flex items-center gap-2">
                                  <ListTodo size={12} /> Task Pipeline
                               </h4>
                               <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar pr-1">
                                  {qgTasks.map(t => (
                                     <div key={t.id} className="flex items-center justify-between p-3 rounded-[14px] bg-black/40 border border-white/5">
                                        <div className="flex items-center gap-2 min-w-0">
                                           <div className={`w-1 h-1 rounded-full ${t.status === 'done' ? 'bg-[#ffba38]' : 'bg-white/10'}`} />
                                           <span className={`text-[9px] font-headline font-bold uppercase tracking-widest truncate ${t.status === 'done' ? 'text-on-surface-variant/20' : 'text-on-surface/60'}`}>{t.label}</span>
                                        </div>
                                     </div>
                                  ))}
                                  {qgTasks.length === 0 && (
                                     <div className="py-12 text-center border border-dashed border-white/5 rounded-[14px] bg-black/20">
                                        <p className="text-[8px] font-black text-on-surface-variant/10 uppercase tracking-widest">No Direct Tasks</p>
                                     </div>
                                  )}
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
    </div>
  );
};
