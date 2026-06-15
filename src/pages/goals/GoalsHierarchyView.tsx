import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../../lib/DbContext';
import { INITIAL_CATEGORIES } from '../../lib/db';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, CheckCircle2, Circle, X, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const GoalsHierarchyView = ({ setTab }: { setTab?: (tab: 'sprints' | 'goals' | 'milestones') => void }) => {
  const { db, isTestMode } = useDb();
  
  const currentYear = new Date().getFullYear();
  
  const [horizon, setHorizon] = useState<'annual' | '3year' | '5year'>('annual');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const annualGoals = useLiveQuery(() => db.annualGoals.toArray(), [isTestMode]) ?? [];
  const multiYearGoals = useLiveQuery(() => db.multiYearGoals.toArray(), [isTestMode]) ?? [];
  const quarterlyGoals = useLiveQuery(() => db.quarterlyGoals.where('status').equals('active').toArray(), [isTestMode]) ?? [];
  const allTasks = useLiveQuery(() => db.tasks.toArray(), [isTestMode]) ?? [];
  const sprints = useLiveQuery(() => db.sprints.toArray(), [isTestMode]) ?? [];

  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('CRAFT');
  const [formMultiYearGoalId, setFormMultiYearGoalId] = useState<number | undefined>();

  const openForm = (goal?: any) => {
    if (goal) {
      setEditingGoal(goal);
      setFormTitle(goal.title);
      setFormDesc(horizon === 'annual' ? goal.description : goal.targetAchievement);
      setFormCategory(goal.category || 'CRAFT');
      setFormMultiYearGoalId(goal.multiYearGoalId);
    } else {
      setEditingGoal(null);
      setFormTitle('');
      setFormDesc('');
      setFormCategory('CRAFT');
      setFormMultiYearGoalId(undefined);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingGoal(null);
  };

  const saveGoal = async () => {
    if (!formTitle.trim()) return;
    
    const now = Date.now();
    const basePayload = {
      title: formTitle,
      category: formCategory as any,
      updatedAt: now,
    };
    
    if (horizon === 'annual') {
      const payload = { ...basePayload, description: formDesc, year: currentYear, multiYearGoalId: formMultiYearGoalId };
      if (editingGoal) {
        await db.annualGoals.update(editingGoal.id, payload);
      } else {
        await db.annualGoals.add({
          ...payload,
          status: 'active',
          targetDate: new Date(`${currentYear}-12-31`).getTime(),
          createdAt: now
        });
      }
    } else {
      const targetY = horizon === '3year' ? currentYear + 3 : currentYear + 5;
      const payload = { ...basePayload, targetAchievement: formDesc, targetYear: targetY };
      if (editingGoal) {
        await db.multiYearGoals.update(editingGoal.id, payload);
      } else {
        await db.multiYearGoals.add({
          ...payload,
          status: 'active',
          createdAt: now
        });
      }
    }
    closeForm();
  };

  const deleteGoal = async (id: number) => {
    if (!confirm('Erase this goal?')) return;
    if (horizon === 'annual') {
      await db.annualGoals.delete(id);
    } else {
      await db.multiYearGoals.delete(id);
    }
  };

  // Group goals by active horizon (Flat list)
  const activeGoals = useMemo(() => {
    let list: any[] = [];
    if (horizon === 'annual') {
      list = annualGoals.filter(g => g.year === currentYear);
    } else if (horizon === '3year') {
      list = multiYearGoals.filter(g => g.targetYear <= currentYear + 3);
    } else {
      list = multiYearGoals.filter(g => g.targetYear > currentYear + 3);
    }
    // Sort by created at or ID
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [horizon, annualGoals, multiYearGoals, currentYear]);

  const handleEpicClick = (qgId: number) => {
    localStorage.setItem('focusEpicId', String(qgId));
    setTab?.('sprints');
  };

  const getGoalStats = (g: any) => {
    let items: any[] = [];
    let completedCount = 0;
    let totalCount = 0;

    if (horizon === 'annual') {
      items = allTasks.filter(t => t.annualGoalId === g.id);
      completedCount = items.filter(t => t.status === 'done').length;
      totalCount = items.length;
    } else {
      items = annualGoals.filter(ag => ag.multiYearGoalId === g.id);
      completedCount = items.filter(ag => ag.status === 'done').length; 
      totalCount = items.length;
    }

    let pct = 0;
    if (horizon === 'annual') {
        pct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
    } else {
        if (totalCount > 0) {
            let sumPct = 0;
            items.forEach(ag => {
               const tasks = allTasks.filter(t => t.annualGoalId === ag.id);
               const done = tasks.filter(t => t.status === 'done').length;
               sumPct += tasks.length ? (done / tasks.length) * 100 : 0;
            });
            pct = Math.round(sumPct / totalCount);
        }
    }

    return { items, completedCount, totalCount, pct };
  };

  const getSolidColor = (colorClass: string) => {
    if (colorClass.includes('primary')) return '#00dbe9';
    if (colorClass.includes('emerald')) return '#34d399';
    if (colorClass.includes('error')) return '#ff5252';
    if (colorClass.includes('#b464ff')) return '#b464ff';
    if (colorClass.includes('#FFBA38')) return '#FFBA38';
    return '#ffffff';
  };

  const renderCardView = (g: any) => {
    const isExpanded = expandedGoalId === g.id;
    const cat = INITIAL_CATEGORIES.find(c => c.id === g.category) || INITIAL_CATEGORIES[INITIAL_CATEGORIES.length - 1];
    const { items, completedCount, totalCount, pct } = getGoalStats(g);
    
    const radius = 22;
    const stroke = 3;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (pct / 100) * circumference;
    const parentGoal = horizon === 'annual' ? multiYearGoals.find(m => m.id === g.multiYearGoalId) : null;
    const solidColor = getSolidColor(cat.color || '');

    return (
      <div key={g.id} className="relative bg-[#0f1115]/80 backdrop-blur-md border border-white/10 rounded-[18px] p-5 hover:border-white/20 transition-all group shadow-xl overflow-hidden flex flex-col h-full">
        {/* Soft Background Glow */}
        <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none" style={{ background: `radial-gradient(circle at 100% 100%, ${solidColor}, transparent 80%)` }} />
        
        {/* Aesthetic Wavy Right Corner */}
        <div className="absolute inset-y-0 right-0 w-28 md:w-36 pointer-events-none z-0">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
             <path 
                d="M100,0 L50,0 C80,30 20,60 50,80 C70,95 40,100 50,100 L100,100 Z" 
                fill={solidColor}
                fillOpacity="0.15"
                stroke={solidColor}
                strokeWidth="1.5"
                strokeOpacity="0.4"
             />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-l from-black/40 to-transparent mix-blend-overlay" />
        </div>

        {/* Top Right Actions */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-20">
          <button onClick={() => openForm(g)} className="p-1.5 rounded-md bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors text-on-surface-variant">
             <Edit2 size={14} />
          </button>
          <button onClick={() => deleteGoal(g.id)} className="p-1.5 rounded-md bg-white/5 hover:bg-error/20 hover:text-error transition-colors text-on-surface-variant">
             <Trash2 size={14} />
          </button>
        </div>

        {/* Life Category Flair at Bottom Right */}
        <div className={`absolute bottom-3 right-5 font-headline font-black text-[9px] uppercase tracking-widest z-10 ${cat.color} drop-shadow-[0_2px_4px_rgba(0,0,0,1)] flex items-center justify-end pointer-events-none`}>
          {cat.label}
        </div>

        <div className="flex items-start gap-5 relative z-10 flex-1">
          {/* Progress Circle */}
          <div className="shrink-0 relative flex flex-col items-center justify-center mt-1">
             <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
                <circle stroke="rgba(255,255,255,0.05)" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
                <circle stroke={pct === 100 ? '#00e475' : solidColor} fill="transparent" strokeWidth={stroke} strokeDasharray={`${circumference} ${circumference}`} style={{ strokeDashoffset }} r={normalizedRadius} cx={radius} cy={radius} className="transition-all duration-1000 ease-out" />
             </svg>
             <div className="absolute flex flex-col items-center justify-center leading-none">
                <span className="text-[10px] font-headline font-black text-on-surface tabular-nums">{pct}%</span>
             </div>
          </div>

          {/* Main Body (Description Removed) */}
          <div className="flex-1 min-w-0 pr-12 pb-1">
             <h3 className="font-headline font-black text-[17px] text-white uppercase tracking-tight leading-snug line-clamp-3">
                {g.title}
             </h3>
             
             {parentGoal && (
                <div className="mt-2 text-[8px] font-black uppercase tracking-widest text-primary/80 flex items-center gap-1.5">
                   <span className="opacity-50">Achieves:</span>
                   <span className="truncate">{parentGoal.title}</span>
                </div>
             )}
             
             <div className="mt-4 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">
                   {horizon === 'annual' ? `Completed: ${completedCount}/${totalCount}` : `Objectives: ${totalCount}`}
                </span>
                
                <button 
                  onClick={() => setExpandedGoalId(isExpanded ? null : g.id)}
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors pr-12 ${isExpanded ? cat.color : 'text-on-surface-variant/50 hover:text-white'}`}
                >
                   {isExpanded ? 'Hide Details' : 'View Details'}
                   {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
             </div>
          </div>
        </div>

        {/* Expandable Details Area (Description & Checklist) */}
        <AnimatePresence>
          {isExpanded && (
             <motion.div 
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               className="relative z-10 overflow-hidden border-t border-white/5 mt-5 pt-4"
             >
                <div className="pb-6 pr-16 space-y-4">
                   <p className="text-xs text-on-surface-variant/80 leading-relaxed italic border-l-2 border-white/10 pl-3">
                      {horizon === 'annual' ? g.description : g.targetAchievement}
                   </p>
                   
                   {items.length === 0 && (
                      <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest block pl-3">No objectives linked.</span>
                   )}
                   
                   {items.length > 0 && (
                     <div className="space-y-2">
                        {items.map((item: any) => {
                           const isDone = item.status === 'done';
                           return (
                              <div key={item.id} className="flex items-start gap-3 group/item">
                                 <div className="mt-0.5 text-primary/60">
                                    {isDone ? <CheckCircle2 size={16} className={cat.color} /> : <Circle size={16} className="text-white/20" />}
                                 </div>
                                 <div>
                                    <p className={`text-sm font-medium ${isDone ? 'text-on-surface-variant/40 line-through' : 'text-on-surface-variant'}`}>
                                       {item.title || item.label}
                                    </p>
                                    {horizon !== 'annual' && (
                                       <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest mt-1">Target: {item.year}</p>
                                    )}
                                 </div>
                              </div>
                           )
                        })}
                     </div>
                   )}
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderListView = (g: any) => {
    const isExpanded = expandedGoalId === g.id;
    const cat = INITIAL_CATEGORIES.find(c => c.id === g.category) || INITIAL_CATEGORIES[INITIAL_CATEGORIES.length - 1];
    const { items, completedCount, totalCount, pct } = getGoalStats(g);
    const parentGoal = horizon === 'annual' ? multiYearGoals.find(m => m.id === g.multiYearGoalId) : null;
    const solidColor = getSolidColor(cat.color || '');

    const radius = 14;
    const stroke = 2.5;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (pct / 100) * circumference;

    return (
      <div key={g.id} className="relative bg-[#0f1115]/60 backdrop-blur-md border border-white/5 rounded-[12px] hover:border-white/20 transition-all group shadow-sm flex flex-col">
         {/* List Row Header */}
         <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
               {/* Tiny progress ring */}
               <div className="shrink-0 relative flex flex-col items-center justify-center">
                  <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
                     <circle stroke="rgba(255,255,255,0.05)" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
                     <circle stroke={pct === 100 ? '#00e475' : solidColor} fill="transparent" strokeWidth={stroke} strokeDasharray={`${circumference} ${circumference}`} style={{ strokeDashoffset }} r={normalizedRadius} cx={radius} cy={radius} className="transition-all duration-1000 ease-out" />
                  </svg>
               </div>
               
               <div className="flex-1 min-w-0 flex items-center gap-4">
                  <h3 className="font-headline font-black text-sm text-white uppercase tracking-tight truncate">{g.title}</h3>
                  {parentGoal && (
                     <span className="text-[8px] font-black uppercase tracking-widest text-primary/60 border border-primary/20 px-1.5 py-0.5 rounded-[4px] shrink-0 truncate max-w-[150px] hidden sm:block">
                        Achieves: {parentGoal.title}
                     </span>
                  )}
               </div>
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
               <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 hidden sm:block">
                  {completedCount}/{totalCount}
               </span>
               <div className={`px-2 py-1 rounded-[6px] font-headline font-black text-[8px] uppercase tracking-widest ${cat.bg} ${cat.color}`}>{cat.label}</div>
               
               <div className="flex gap-1 border-l border-white/5 pl-4">
                  <button onClick={() => openForm(g)} className="p-1 rounded-md text-on-surface-variant/40 hover:text-white transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => setExpandedGoalId(isExpanded ? null : g.id)} className={`p-1 rounded-md transition-colors ${isExpanded ? cat.color : 'text-on-surface-variant/40 hover:text-white'}`}>
                     {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
               </div>
            </div>
         </div>

         {/* Expandable Details */}
         <AnimatePresence>
           {isExpanded && (
             <motion.div 
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               className="overflow-hidden border-t border-white/5 mx-3"
             >
               <div className="py-4 pl-12 pr-4 space-y-4">
                  <p className="text-xs text-on-surface-variant/80 italic border-l-2 border-white/10 pl-3 max-w-3xl">
                     {horizon === 'annual' ? g.description : g.targetAchievement}
                  </p>
                  
                  {items.length === 0 && <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest block">No objectives linked.</span>}
                  
                  {items.length > 0 && (
                     <div className="space-y-2 mt-4">
                        {items.map((item: any) => {
                           const isDone = item.status === 'done';
                           return (
                              <div key={item.id} className="flex items-start gap-3">
                                 <div className="mt-0.5">
                                    {isDone ? <CheckCircle2 size={14} className={cat.color} /> : <Circle size={14} className="text-white/20" />}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className={`text-[13px] font-medium truncate ${isDone ? 'text-on-surface-variant/40 line-through' : 'text-on-surface-variant'}`}>
                                       {item.title || item.label}
                                    </p>
                                 </div>
                              </div>
                           )
                        })}
                     </div>
                  )}
               </div>
             </motion.div>
           )}
         </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="pb-10 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* LEFT COLUMN: Main Ledger */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Horizon Tabs & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
             <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
               <button onClick={() => {setHorizon('annual'); setExpandedGoalId(null)}} className={`whitespace-nowrap px-6 py-2 rounded-full font-headline font-black text-[10px] uppercase tracking-widest border transition-all duration-300 ${horizon === 'annual' ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(0,219,233,0.2)]' : 'bg-black/40 border-white/5 text-on-surface-variant/40 hover:text-white'}`}>
                 {currentYear} GOALS
               </button>
               <button onClick={() => {setHorizon('3year'); setExpandedGoalId(null)}} className={`whitespace-nowrap px-6 py-2 rounded-full font-headline font-black text-[10px] uppercase tracking-widest border transition-all duration-300 ${horizon === '3year' ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(0,219,233,0.2)]' : 'bg-black/40 border-white/5 text-on-surface-variant/40 hover:text-white'}`}>
                 3 YEAR GOALS
               </button>
               <button onClick={() => {setHorizon('5year'); setExpandedGoalId(null)}} className={`whitespace-nowrap px-6 py-2 rounded-full font-headline font-black text-[10px] uppercase tracking-widest border transition-all duration-300 ${horizon === '5year' ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(0,219,233,0.2)]' : 'bg-black/40 border-white/5 text-on-surface-variant/40 hover:text-white'}`}>
                 5 YEAR GOALS
               </button>
             </div>
             
             {!isFormOpen && (
               <div className="flex items-center gap-3 shrink-0">
                 {/* View Mode Toggle */}
                 <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-full">
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-on-surface-variant/40 hover:text-white'}`}>
                       <List size={14} />
                    </button>
                    <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-full transition-colors ${viewMode === 'card' ? 'bg-white/10 text-white' : 'text-on-surface-variant/40 hover:text-white'}`}>
                       <LayoutGrid size={14} />
                    </button>
                 </div>
                 
                 <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-white/5 hover:bg-primary hover:text-black text-on-surface font-headline font-black text-[9px] uppercase tracking-widest transition-all">
                    <Plus size={14} /> Add Goal
                 </button>
               </div>
             )}
          </div>

          {/* Goal Modal */}
          {isFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-[#111318] border border-white/10 rounded-[14px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                     <div>
                        <h2 className="text-xl font-headline font-black uppercase text-on-surface tracking-widest">{editingGoal ? 'Edit Goal' : 'Establish Goal'}</h2>
                        <p className="text-xs text-on-surface-variant/40 uppercase tracking-widest mt-1">Define horizon parameters</p>
                     </div>
                     <button onClick={closeForm} className="text-on-surface-variant/40 hover:text-white transition-colors">
                        <X size={20} />
                     </button>
                  </div>
            
                  <div className="p-6 overflow-y-auto flex-1 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                           <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Goal Title</label>
                           <input autoFocus value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="ENTER TITLE..." className="w-full bg-black/40 border border-white/10 rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors font-headline font-semibold uppercase" />
                        </div>
            
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Life Category</label>
                           <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none font-headline uppercase">
                              {INITIAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                           </select>
                        </div>
            
                        {horizon === 'annual' && (
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Linked Multi-Year Goal</label>
                              <select value={formMultiYearGoalId || ''} onChange={e => setFormMultiYearGoalId(e.target.value ? Number(e.target.value) : undefined)} className="w-full bg-black/40 border border-white/10 rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none font-headline uppercase">
                                 <option value="">-- Unlinked --</option>
                                 {multiYearGoals.filter(g => g.status === 'active').map(g => (
                                    <option key={g.id} value={g.id}>{g.title}</option>
                                 ))}
                              </select>
                           </div>
                        )}
                     </div>
            
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{horizon === 'annual' ? "Objective / Description" : "Target Achievement Conditions"}</label>
                        <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={4} placeholder="What does victory look like?" className="w-full bg-black/40 border border-white/10 rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors resize-none leading-relaxed" />
                     </div>
                  </div>
            
                  <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-black/20">
                     <button onClick={closeForm} className="px-5 py-2.5 rounded-[8px] border border-white/10 text-white hover:bg-white/5 text-xs font-black uppercase tracking-widest transition-all">Cancel</button>
                     <button onClick={saveGoal} className="px-5 py-2.5 rounded-[8px] bg-primary text-black hover:bg-[#00c4d1] shadow-[0_0_15px_rgba(0,219,233,0.3)] text-xs font-black uppercase tracking-widest transition-all">Save Goal</button>
                  </div>
               </div>
            </div>
          )}

          {/* Goal Display */}
          <div className={`mt-2 ${viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'space-y-3'}`}>
            {activeGoals.map(g => viewMode === 'card' ? renderCardView(g) : renderListView(g))}
            
            {activeGoals.length === 0 && !isFormOpen && (
               <div className="md:col-span-2 py-20 text-center border-2 border-dashed border-white/5 rounded-[18px]">
                  <div className="text-[11px] font-black text-on-surface-variant/30 uppercase tracking-widest mb-4">No goals defined for this horizon</div>
                  <button onClick={() => openForm()} className="px-6 py-2 rounded-[12px] bg-white/5 hover:bg-primary/20 text-on-surface-variant hover:text-primary font-headline font-black text-[10px] uppercase tracking-widest transition-all">
                     Create First Goal
                  </button>
               </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Execution Anchor Sidebar */}
        <div className="lg:col-span-4 pl-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-white/5 pt-8 lg:pt-2">
          <h2 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface mb-6 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-error shadow-[0_0_8px_rgba(255,82,82,0.8)] animate-pulse" />
             This Quarter:
          </h2>
          
          <div className="space-y-5">
            {quarterlyGoals.map(qg => {
              const qSprints = sprints.filter(s => s.quarterlyGoalId === qg.id);
              const completedSprints = qSprints.filter(s => s.status === 'done').length;
              const totalSprints = Math.max(qSprints.length, 6); // Assume 6 sprints per quarter normally
              const parentAnnual = annualGoals.find(a => a.id === qg.annualGoalId);

              return (
                <button
                  key={qg.id}
                  onClick={() => handleEpicClick(qg.id!)}
                  className="w-full text-left bg-[#0f1115]/80 backdrop-blur-md border border-white/5 hover:border-primary/40 rounded-[18px] p-6 group transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,219,233,0.1)] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[40px] rounded-full pointer-events-none group-hover:bg-primary/20 transition-colors" />
                  
                  <div className="relative z-10 flex flex-col justify-between mb-8">
                     <h3 className="font-headline font-black text-base text-on-surface uppercase tracking-tight leading-snug line-clamp-2 pr-4">
                        {qg.title}
                     </h3>
                     {parentAnnual && (
                        <div className="mt-2 text-[8px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-1.5 group-hover:text-primary transition-colors">
                           <span className="opacity-50">Drives:</span>
                           <span className="truncate">{parentAnnual.title}</span>
                        </div>
                     )}
                  </div>
                  
                  <div className="relative z-10 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 group-hover:text-primary/60 transition-colors">
                     <span className="whitespace-nowrap">Sprint {completedSprints} of {totalSprints}</span>
                     <div className="h-1 flex-1 mx-3 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary/40 group-hover:bg-primary transition-all" style={{ width: `${Math.min(100, (completedSprints/totalSprints)*100)}%` }} />
                     </div>
                  </div>
                </button>
              );
            })}
            
            {quarterlyGoals.length === 0 && (
               <div className="p-8 border border-white/5 border-dashed rounded-[18px] text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant/30">
                  No active quarter epics.
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
