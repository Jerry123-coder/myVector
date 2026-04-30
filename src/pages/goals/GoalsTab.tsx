import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task, type AnnualGoal } from '../../lib/db';
import { nowMs } from '../../lib/time';
import { Plus, Target, ChevronRight, CheckCircle2, Circle, Clock, Rocket, Trophy, LayoutGrid, Calendar, Pin } from 'lucide-react';
import { GoalDetailOverlay } from '../../components/layout/GoalDetailOverlay';

const daysLeft = (ms: number | undefined, ref: number) => {
  if (!ms) return null;
  const d = Math.ceil((ms - ref) / 86400000);
  return d > 0 ? `${d}d left` : d === 0 ? 'Today' : 'Overdue';
};

export const GoalsTab = () => {
  const [now] = useState(() => Date.now());
  
  // Queries
  const annualGoals     = useLiveQuery(() => db.annualGoals.toArray().then(a => a.sort((x,y) => y.createdAt - x.createdAt)), []) ?? [];
  const quarterlyGoals  = useLiveQuery(() => db.quarterlyGoals.toArray().then(a => a.sort((x,y) => x.createdAt - y.createdAt)), []) ?? [];
  const allTasks        = useLiveQuery(() => db.tasks.toArray(), []) ?? [];

  // UI State
  const [selectedGoal, setSelectedGoal] = useState<{ id: number; type: 'annual' | 'quarterly' } | null>(null);
  const [creatingAnnual, setCreatingAnnual] = useState(false);
  const [creatingQ, setCreatingQ] = useState(false);

  // Form State (Simplified)
  const [aTitle, setATitle] = useState('');
  const [aCategory, setACategory] = useState<AnnualGoal['category']>('CRAFT');
  const [qTitle, setQTitle] = useState('');
  const [qQuarter, setQQuarter] = useState(`Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`);

  const createAnnual = async () => {
    if (!aTitle.trim()) return;
    await db.annualGoals.add({
      title: aTitle.trim().toUpperCase(),
      category: aCategory,
      year: new Date().getFullYear(),
      status: 'active',
      createdAt: nowMs(),
      updatedAt: Date.now(),
    });
    setATitle('');
    setCreatingAnnual(false);
  };

  const createQuarterly = async () => {
    if (!qTitle.trim()) return;
    await db.quarterlyGoals.add({
      title: qTitle.trim().toUpperCase(),
      quarter: qQuarter,
      status: 'active',
      createdAt: nowMs(),
      updatedAt: Date.now(),
    });
    setQTitle('');
    setCreatingQ(false);
  };

  const toggleTask = async (t: Task) => {
    if (!t.id) return;
    await db.tasks.update(t.id, {
      status: t.status === 'done' ? 'pending' : 'done',
      completedAt: t.status === 'done' ? undefined : nowMs(),
      updatedAt: Date.now()
    });
  };

  const renderGoalCard = (g: any, type: 'annual' | 'quarterly') => {
    const isAnnual = type === 'annual';
    const tasks = allTasks.filter(t => isAnnual ? (t.annualGoalId === g.id && !t.quarterlyGoalId) : t.quarterlyGoalId === g.id);
    const progress = tasks.length ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0;
    const isDone = g.status === 'done' || (tasks.length > 0 && progress === 100);
    const nextTasks = tasks.filter(t => t.status !== 'done').slice(0, 3);
    const dl = daysLeft(g.targetDate, now);

    return (
      <div key={g.id} className={`group relative rounded-sm p-8 transition-all duration-300 border ${g.isPinned ? 'border-tertiary-fixed-dim/40 bg-tertiary-fixed-dim/5 shadow-[0_0_30px_rgba(255,186,56,0.05)]' : isDone ? 'bg-secondary/5 border-secondary/20 shadow-[0_0_30px_rgba(0,228,117,0.05)]' : 'bg-[#16181b] border-outline-variant/10 hover:border-primary/30 hover:shadow-2xl'}`}>
        
        {g.isPinned && (
           <div className="absolute top-4 right-4 text-tertiary-fixed-dim">
              <Pin size={14} fill="currentColor" />
           </div>
        )}
        {/* Card Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[9px] font-black uppercase tracking-widest ${isAnnual ? 'text-primary' : 'text-primary-fixed-dim'}`}>
                {isAnnual ? 'Master_Directive' : 'Tactical_Target'}
              </span>
              {isDone && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/20 border border-secondary/30 text-[8px] font-black text-secondary uppercase animate-pulse">
                  <Trophy size={10} /> Trophy_Status
                </div>
              )}
            </div>
            <h3 className={`text-xl font-headline font-black uppercase tracking-tight leading-tight line-clamp-2 ${isDone ? 'text-secondary/70' : 'text-on-surface'}`}>
              {g.title}
            </h3>
          </div>
          <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-container-highest" />
              <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" 
                strokeDasharray={176} strokeDashoffset={176 - (176 * progress) / 100}
                className={`transition-all duration-1000 ${isDone ? 'text-secondary' : 'text-primary'}`} 
                style={{ strokeLinecap: 'round' }} />
            </svg>
            <span className={`absolute font-headline font-black text-xs tabular-nums ${isDone ? 'text-secondary' : 'text-primary'}`}>{progress}%</span>
          </div>
        </div>

        {/* Quick Task Strip */}
        <div className="space-y-2 mb-6">
          {nextTasks.length > 0 ? (
            nextTasks.map(t => (
              <div key={t.id} onClick={(e) => { e.stopPropagation(); toggleTask(t); }} className="flex items-center gap-3 py-1 text-on-surface-variant/40 hover:text-primary transition-colors cursor-pointer group/task">
                <Circle size={10} className="group-hover/task:text-primary transition-colors" />
                <span className="text-[10px] font-headline font-bold uppercase tracking-widest truncate flex-1">{t.label}</span>
                <ChevronRight size={10} className="opacity-0 group-hover/task:opacity-100 -translate-x-2 group-hover/task:translate-x-0 transition-all" />
              </div>
            ))
          ) : !isDone ? (
            <div className="text-[9px] text-on-surface-variant/20 font-bold uppercase tracking-widest py-1">All tactical steps complete</div>
          ) : (
             <div className="text-[10px] text-secondary/40 font-headline font-black uppercase tracking-widest py-1 flex items-center gap-2">
               <CheckCircle2 size={12} /> Execution_Complete
             </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-outline-variant/5 flex items-center justify-between">
          <div className="flex items-center gap-4 text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
            {isAnnual ? (
              <div className="flex items-center gap-1"><LayoutGrid size={10}/> {quarterlyGoals.filter(q => q.annualGoalId === g.id).length} Sub-Goals</div>
            ) : (
              <div className="flex items-center gap-1"><Calendar size={10}/> {g.quarter}</div>
            )}
            {dl && <div className={`flex items-center gap-1 ${dl === 'Overdue' ? 'text-error' : ''}`}><Clock size={10}/> {dl}</div>}
          </div>
          <button 
            onClick={() => setSelectedGoal({ id: g.id!, type })}
            className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-primary hover:text-black font-headline font-black text-[9px] uppercase tracking-widest transition-all"
          >
            Manage
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20">
      
      {/* Annual Directives Section */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tighter mb-1">Master Directives</h2>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-[0.3em] font-bold">Annual Macro-Objectives</p>
          </div>
          <button onClick={() => setCreatingAnnual(true)} className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all">
            <Plus size={24} />
          </button>
        </div>

        {creatingAnnual && (
          <div className="mb-8 p-6 rounded-[2rem] bg-surface-container-high border border-primary/20 animate-in slide-in-from-top-2">
            <input 
              autoFocus
              value={aTitle}
              onChange={e => setATitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createAnnual()}
              placeholder="Initialize Master Directive..."
              className="w-full bg-transparent border-none outline-none text-xl font-headline font-black text-primary uppercase placeholder:text-primary/20 mb-4"
            />
            <div className="flex flex-wrap gap-2 mb-6">
              {(['CRAFT', 'FINANCE', 'HEALTH', 'SOCIAL', 'CHARACTER', 'OTHER'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setACategory(cat)}
                  className={`px-3 py-1.5 rounded-sm border text-[8px] font-black uppercase tracking-widest transition-all ${
                    aCategory === cat
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-surface-container-high border-outline-variant/30 text-on-surface-variant/60 hover:border-primary/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={createAnnual} className="px-6 py-2 bg-primary text-black font-headline font-black text-[10px] uppercase rounded-xl">Create</button>
              <button onClick={() => setCreatingAnnual(false)} className="px-6 py-2 text-on-surface-variant font-headline font-bold text-[10px] uppercase">Cancel</button>
            </div>
          </div>
        )}

        {annualGoals.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-outline-variant/10 rounded-[3rem]">
            <Target size={40} className="mx-auto text-on-surface-variant/10 mb-4" />
            <div className="text-[11px] font-black text-on-surface-variant/30 uppercase tracking-[0.5em]">No directives issued</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {annualGoals.map(ag => renderGoalCard(ag, 'annual'))}
          </div>
        )}
      </section>

      {/* Tactical Targets Section */}
      <section>
        <div className="flex items-center justify-between mb-8 pt-8 border-t border-outline-variant/10">
          <div>
            <h2 className="text-2xl font-headline font-black text-on-surface uppercase tracking-tighter mb-1">Tactical Targets</h2>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-[0.3em] font-bold">Quarterly Focus Windows</p>
          </div>
          <button onClick={() => setCreatingQ(true)} className="w-12 h-12 rounded-2xl bg-primary-fixed-dim/10 border border-primary-fixed-dim/20 flex items-center justify-center text-primary-fixed-dim hover:bg-primary-fixed-dim hover:text-black transition-all">
            <Plus size={24} />
          </button>
        </div>

        {creatingQ && (
          <div className="mb-8 p-6 rounded-[2rem] bg-surface-container-high border border-primary-fixed-dim/20 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input 
                autoFocus
                value={qTitle}
                onChange={e => setQTitle(e.target.value)}
                placeholder="Initialize Tactical Target..."
                className="w-full bg-transparent border-none outline-none text-lg font-headline font-black text-primary-fixed-dim uppercase placeholder:text-primary-fixed-dim/20"
              />
              <input 
                value={qQuarter}
                onChange={e => setQQuarter(e.target.value)}
                placeholder="Q# YYYY"
                className="w-full bg-transparent border-none outline-none text-lg font-headline font-black text-on-surface-variant/40 uppercase"
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={createQuarterly} className="px-6 py-2 bg-primary-fixed-dim text-black font-headline font-black text-[10px] uppercase rounded-xl">Create</button>
              <button onClick={() => setCreatingQ(false)} className="px-6 py-2 text-on-surface-variant font-headline font-bold text-[10px] uppercase">Cancel</button>
            </div>
          </div>
        )}

        {quarterlyGoals.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-outline-variant/10 rounded-[3rem]">
            <Rocket size={40} className="mx-auto text-on-surface-variant/10 mb-4" />
            <div className="text-[11px] font-black text-on-surface-variant/30 uppercase tracking-[0.5em]">No tactical windows open</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quarterlyGoals.map(qg => renderGoalCard(qg, 'quarterly'))}
          </div>
        )}
      </section>

      {/* Goal Detail Overlay */}
      <GoalDetailOverlay 
        goalId={selectedGoal?.id ?? null}
        type={selectedGoal?.type ?? null}
        onClose={() => setSelectedGoal(null)}
      />
    </div>
  );
};
