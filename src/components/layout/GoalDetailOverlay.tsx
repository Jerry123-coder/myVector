import { X, CheckCircle2, Clock, Trash2, Plus, Flag, Rocket, Pin, Swords, Minus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task, type AnnualGoal, type QuarterlyGoal, type SideQuest } from '../../lib/db';
import { useState } from 'react';
import { nowMs } from '../../lib/time';

interface GoalDetailOverlayProps {
  goalId: number | null;
  type: 'annual' | 'quarterly' | null;
  onClose: () => void;
}

export const GoalDetailOverlay = ({ goalId, type, onClose }: GoalDetailOverlayProps) => {
  const [newTask, setNewTask] = useState('');

  // Queries (split so useLiveQuery infers a single entity type per subscription)
  const annualGoal = useLiveQuery(
    () => (type === 'annual' && goalId ? db.annualGoals.get(goalId) : undefined),
    [goalId, type]
  );
  const quarterlyGoal = useLiveQuery(
    () => (type === 'quarterly' && goalId ? db.quarterlyGoals.get(goalId) : undefined),
    [goalId, type]
  );
  const goal: AnnualGoal | QuarterlyGoal | undefined =
    type === 'annual' ? annualGoal : type === 'quarterly' ? quarterlyGoal : undefined;

  const subGoals = useLiveQuery(
    () => (type === 'annual' && goalId ? db.quarterlyGoals.where('annualGoalId').equals(goalId).toArray() : []),
    [goalId, type]
  );

  const tasks = useLiveQuery(
    () => {
      if (!goalId || !type) return [];
      return type === 'annual' 
        ? db.tasks.where('annualGoalId').equals(goalId).filter(t => !t.quarterlyGoalId).toArray()
        : db.tasks.where('quarterlyGoalId').equals(goalId).toArray();
    },
    [goalId, type]
  );

  const milestones = useLiveQuery(
    () => {
      if (!goalId || !type) return [];
      return type === 'annual'
        ? db.milestones.where('annualGoalId').equals(goalId).toArray()
        : db.milestones.where('quarterlyGoalId').equals(goalId).toArray();
    },
    [goalId, type]
  );

  const sprints = useLiveQuery(
    () => {
      if (!goalId || !type) return [];
      return type === 'annual'
        ? db.sprints.where('annualGoalId').equals(goalId).toArray()
        : db.sprints.where('quarterlyGoalId').equals(goalId).toArray();
    },
    [goalId, type]
  );

  const linkedQuests = useLiveQuery(
    () => {
      if (!goalId || !type) return [];
      return type === 'annual'
        ? db.sideQuests.where('annualGoalId').equals(goalId).toArray()
        : db.sideQuests.where('quarterlyGoalId').equals(goalId).toArray();
    },
    [goalId, type]
  );

  const unlinkedQuests = useLiveQuery(
    () => db.sideQuests.filter(q => !q.annualGoalId && !q.quarterlyGoalId).toArray(),
    []
  );

  const multiYearGoals = useLiveQuery(() => db.multiYearGoals.toArray(), []) ?? [];
  const allAnnualGoals = useLiveQuery(() => db.annualGoals.toArray(), []) ?? [];

  const taskList = tasks ?? [];
  const subGoalList = subGoals ?? [];
  const milestoneList = milestones ?? [];
  const sprintList = sprints ?? [];

  if (!goalId || !goal) return null;

  const toggleTask = async (task: Task) => {
    if (!task.id) return;
    await db.tasks.update(task.id, {
      status: task.status === 'done' ? 'pending' : 'done',
      completedAt: task.status === 'done' ? undefined : nowMs(),
      updatedAt: Date.now()
    });
  };

  const addTask = async () => {
    if (!newTask.trim() || !goalId) return;
    await db.tasks.add({
      label: newTask.trim().toUpperCase(),
      status: 'pending',
      priority: 'MED',
      annualGoalId: type === 'annual' ? goalId : (goal as any).annualGoalId,
      quarterlyGoalId: type === 'quarterly' ? goalId : undefined,
      createdAt: nowMs(),
      updatedAt: Date.now()
    });
    setNewTask('');
  };

  const deleteGoal = async () => {
    if (!window.confirm("Are you sure you want to terminate this directive? All linked data will persist but the goal will be removed.")) return;
    if (type === 'annual') await db.annualGoals.delete(goalId);
    else await db.quarterlyGoals.delete(goalId);
    onClose();
  };

  const togglePin = async () => {
    if (!goalId || !type) return;
    const table = type === 'annual' ? db.annualGoals : db.quarterlyGoals;
    
    // Unpin others if we are pinning this one (optional, but cleaner for "Primary Mission")
    if (!goal.isPinned) {
      await db.annualGoals.filter((g) => !!g.isPinned).modify({ isPinned: false });
      await db.quarterlyGoals.filter((g) => !!g.isPinned).modify({ isPinned: false });
    }

    await table.update(goalId, { isPinned: !goal.isPinned, updatedAt: Date.now() });
  };

  const updateCategory = async (cat: AnnualGoal['category']) => {
    if (type !== 'annual' || !goalId) return;
    await db.annualGoals.update(goalId, { category: cat, updatedAt: Date.now() });
  };

  const updateDescription = async (desc: string) => {
    if (!goalId || !type) return;
    const table = type === 'annual' ? db.annualGoals : db.quarterlyGoals;
    await table.update(goalId, { description: desc, updatedAt: Date.now() });
  };

  const updateParentLink = async (parentId: number | undefined) => {
    if (!goalId || !type) return;
    if (type === 'annual') {
      await db.annualGoals.update(goalId, { multiYearGoalId: parentId, updatedAt: Date.now() });
    } else {
      await db.quarterlyGoals.update(goalId, { annualGoalId: parentId, updatedAt: Date.now() });
    }
  };

  const linkQuest = async (questId: number) => {
    if (!goalId || !type) return;
    const update = type === 'annual' ? { annualGoalId: goalId } : { quarterlyGoalId: goalId };
    await db.sideQuests.update(questId, { ...update, updatedAt: Date.now() });
  };

  const unlinkQuest = async (questId: number) => {
    const update = type === 'annual' ? { annualGoalId: undefined } : { quarterlyGoalId: undefined };
    await db.sideQuests.update(questId, { ...update, updatedAt: Date.now() });
  };

  const incrementQuest = async (q: SideQuest) => {
    if (q.currentCount < q.targetCount) {
      await db.sideQuests.update(q.id!, { currentCount: q.currentCount + 1, updatedAt: Date.now() });
    }
  };

  const decrementQuest = async (q: SideQuest) => {
    if (q.currentCount > 0) {
      await db.sideQuests.update(q.id!, { currentCount: q.currentCount - 1, updatedAt: Date.now() });
    }
  };

  const progress = taskList.length ? Math.round((taskList.filter(t => t.status === 'done').length / taskList.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-300">
      <div className="absolute inset-0 bg-[#0B0E12]/98 backdrop-blur-3xl" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl h-full max-h-[90vh] bg-[#16181b] border border-outline-variant/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Section */}
        <div className="p-8 md:p-10 border-b border-outline-variant/10 flex items-start justify-between bg-surface-container/20">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest">
                {type?.toUpperCase()}_DIRECTIVE
              </div>
              {goal.targetDate && (
                <div className="flex items-center gap-2 text-on-surface-variant/60 text-[10px] font-bold uppercase tracking-widest">
                  <Clock size={12} /> {new Date(goal.targetDate).toLocaleDateString()}
                </div>
              )}
              <button 
                onClick={togglePin}
                className={`flex items-center gap-2 px-3 py-1 rounded-sm border transition-all text-[9px] font-black uppercase tracking-widest ${
                  goal.isPinned 
                    ? 'bg-tertiary-fixed-dim text-black border-tertiary-fixed-dim shadow-[0_0_15px_rgba(255,186,56,0.3)]' 
                    : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:border-tertiary-fixed-dim'
                }`}
              >
                <Pin size={10} fill={goal.isPinned ? "currentColor" : "none"} />
                {goal.isPinned ? "Pinned_Priority" : "Pin_Objective"}
              </button>
            </div>
            <h1 className="text-3xl md:text-4xl font-headline font-black text-on-surface uppercase tracking-tight leading-none mb-4">
              {goal.title}
            </h1>
            
            {/* Category Selector (Annual only) */}
            {type === 'annual' && (
              <div className="flex flex-wrap gap-2 mb-6">
                {(['CRAFT', 'FINANCE', 'HEALTH', 'SOCIAL', 'CHARACTER', 'OTHER'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => updateCategory(cat)}
                    className={`px-3 py-1.5 rounded-sm border text-[9px] font-black uppercase tracking-widest transition-all ${
                      (goal as any).category === cat
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-surface-container-high border-outline-variant/30 text-on-surface-variant/60 hover:border-primary/20'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Parent Link Selector */}
            <div className="mb-6">
              <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest block mb-2">
                {type === 'annual' ? 'Link to Multi-Year Vision' : 'Link to Annual Anchor'}
              </label>
              <select 
                value={type === 'annual' ? (goal as any).multiYearGoalId || '' : (goal as any).annualGoalId || ''}
                onChange={(e) => updateParentLink(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full max-w-md bg-surface-container/30 border border-outline-variant/20 rounded-lg px-4 py-3 text-[11px] font-bold text-on-surface outline-none focus:border-primary/40 transition-all appearance-none"
              >
                <option value="">-- No Linked Parent --</option>
                {type === 'annual' 
                  ? multiYearGoals.map(mg => <option key={mg.id} value={mg.id}>{mg.title}</option>)
                  : allAnnualGoals.map(ag => <option key={ag.id} value={ag.id}>{ag.title}</option>)
                }
              </select>
            </div>

            <textarea 
              value={goal.description || ''}
              onChange={(e) => updateDescription(e.target.value)}
              placeholder="Tactical description or newline-separated checklist..."
              className="w-full max-w-2xl bg-surface-container/10 text-sm text-on-surface-variant/80 font-body leading-relaxed border border-outline-variant/10 hover:border-outline-variant/20 focus:border-primary/30 rounded-xl p-4 outline-none resize-none min-h-[100px] transition-all"
            />
          </div>
          <div className="flex flex-col items-end gap-4">
             <button onClick={onClose} className="p-3 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest transition-colors">
               <X className="text-on-surface-variant" size={24} />
             </button>
             <button onClick={deleteGoal} className="flex items-center gap-2 text-error/40 hover:text-error transition-colors text-[10px] font-bold uppercase tracking-widest">
                <Trash2 size={12} /> Terminate
             </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 md:p-10 no-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Column: Tactics & Work */}
            <div className="lg:col-span-8 space-y-10">
              
              {/* Progress Pulse */}
              <div className="p-8 rounded-[2rem] bg-surface-container/10 border border-outline-variant/5">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-[11px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Execution Velocity</span>
                  <span className="text-3xl font-headline font-black text-primary tabular-nums">{progress}%</span>
                </div>
                <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${progress}%`, boxShadow: '0 0 20px rgba(0,219,233,0.3)' }} />
                </div>
              </div>

              {/* Work Backlog */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black text-on-surface uppercase tracking-widest">Work Backlog</h3>
                  <span className="text-[10px] text-on-surface-variant/40 font-bold uppercase">{taskList.length} Items</span>
                </div>
                
                {/* Add Task Inline */}
                <div className="flex items-center gap-3 p-2 bg-surface-container/20 rounded-2xl border border-dashed border-outline-variant/20 hover:border-primary/30 transition-all group focus-within:border-primary/50">
                  <div className="w-10 h-10 flex items-center justify-center text-primary/30 group-hover:text-primary transition-colors">
                    <Plus size={20} />
                  </div>
                  <input 
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTask()}
                    placeholder="Log a new tactical step..."
                    className="flex-1 bg-transparent border-none outline-none text-sm font-headline font-bold text-primary uppercase placeholder:text-on-surface-variant/20"
                  />
                </div>

                <div className="space-y-2">
                  {taskList.map(t => (
                    <div key={t.id} onClick={() => toggleTask(t)} className="flex items-center gap-4 p-5 rounded-2xl bg-surface-container/30 border border-outline-variant/5 hover:bg-surface-container-high transition-all cursor-pointer group">
                      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${t.status === 'done' ? 'bg-secondary border-secondary' : 'border-outline-variant group-hover:border-primary'}`}>
                        {t.status === 'done' && <CheckCircle2 size={14} className="text-black" />}
                      </div>
                      <span className={`flex-1 text-sm font-headline font-bold uppercase tracking-tight transition-all ${t.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`}>
                        {t.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-Directives (If Annual) */}
              {type === 'annual' && subGoalList.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-on-surface uppercase tracking-widest px-2">Tactical Targets (Quarterly)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {subGoalList.map(sg => (
                      <div key={sg.id} className="p-6 rounded-[1.5rem] bg-[#1a1c20] border border-outline-variant/10 hover:border-primary/30 transition-all cursor-pointer">
                        <div className="text-[10px] font-bold text-on-surface-variant/50 uppercase mb-2">{sg.quarter}</div>
                        <div className="text-sm font-headline font-black text-on-surface uppercase mb-3 line-clamp-2">{sg.title}</div>
                        <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: '40%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Context & Milestones */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Context Block */}
              <div className="p-8 rounded-[2rem] bg-[#0c0e12] border border-outline-variant/5 space-y-6">
                <div>
                  <div className="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Flag size={12} className="text-primary" /> Anchor Milestones
                  </div>
                  <div className="space-y-4">
                    {milestoneList.length === 0 ? (
                      <div className="text-[10px] font-bold text-on-surface-variant/20 uppercase tracking-widest py-4 border border-dashed border-outline-variant/5 rounded-xl text-center">No Anchors Set</div>
                    ) : (
                      milestoneList.map(m => (
                        <div key={m.id} className="flex gap-3">
                          <div className="w-px bg-outline-variant/10 relative">
                             <div className="absolute top-0 -left-1 w-2 h-2 rounded-full bg-primary" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-on-surface uppercase tracking-tight">{m.title}</div>
                            <div className="text-[9px] text-on-surface-variant font-bold uppercase">{new Date(m.targetDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-outline-variant/5">
                  <div className="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Rocket size={12} className="text-secondary" /> Active Sprints
                  </div>
                  <div className="space-y-3">
                    {sprintList.map(s => (
                      <div key={s.id} className="p-4 rounded-xl bg-surface-container-high/40 border border-outline-variant/5">
                         <div className="text-[10px] font-black text-secondary uppercase tracking-widest mb-1">{s.name}</div>
                         <div className="text-[9px] text-on-surface-variant font-bold uppercase">{Math.ceil((s.endDate - nowMs()) / 86400000)} Days Remaining</div>
                      </div>
                    ))}
                    {sprintList.length === 0 && (
                       <div className="text-[10px] font-bold text-on-surface-variant/20 uppercase tracking-widest py-4 bg-surface-container/10 border border-outline-variant/5 rounded-xl text-center">No Active Sprints</div>
                    )}
                  </div>
                </div>

                {/* Side Quests (Habits) */}
                <div className="pt-6 border-t border-outline-variant/5">
                  <div className="flex items-center justify-between mb-4">
                     <div className="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest flex items-center gap-2">
                        <Swords size={12} className="text-primary" /> Integrated Quests
                     </div>
                  </div>
                  <div className="space-y-3">
                    {(linkedQuests || []).map(q => (
                       <div key={q.id} className="p-4 rounded-xl bg-primary/5 border border-primary/10 group/q">
                          <div className="flex justify-between items-start mb-2">
                             <div className="text-[9px] font-black text-on-surface uppercase tracking-tight">{q.title}</div>
                             <button onClick={() => unlinkQuest(q.id!)} className="opacity-0 group-hover/q:opacity-100 text-error/40 hover:text-error transition-all">
                                <Trash2 size={10} />
                             </button>
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-[12px] font-headline font-black text-primary tabular-nums">{q.currentCount} / {q.targetCount}</span>
                             <div className="flex gap-1">
                                <button onClick={() => decrementQuest(q)} className="w-6 h-6 rounded-lg bg-black/40 hover:bg-error/20 flex items-center justify-center transition-colors">
                                   <Minus size={10} />
                                </button>
                                <button onClick={() => incrementQuest(q)} className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center transition-colors">
                                   <Plus size={10} />
                                </button>
                             </div>
                          </div>
                       </div>
                    ))}
                    
                    <div className="relative group/add">
                       <select 
                          onChange={(e) => {
                             const id = Number(e.target.value);
                             if (id) linkQuest(id);
                          }}
                          className="w-full appearance-none bg-surface-container/20 border border-dashed border-outline-variant/20 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 hover:border-primary/40 hover:text-primary transition-all outline-none cursor-pointer"
                       >
                          <option value="">+ Link Side Quest</option>
                          {(unlinkedQuests || []).map(q => (
                             <option key={q.id} value={q.id}>{q.title}</option>
                          ))}
                       </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Note */}
              <div className="p-6 rounded-[1.5rem] bg-primary/5 border border-primary/10">
                <ShieldInfo size={20} className="text-primary/40 mb-3" />
                <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase leading-relaxed font-body">
                  Maintain discipline. This directive represents a core pillar of your growth architecture. Initialize focus sessions relative to these tasks to ensure linear progression.
                </p>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

const ShieldInfo = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="M12 8h.01" /><path d="M12 12v4" />
  </svg>
)
