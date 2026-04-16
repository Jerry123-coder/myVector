import { useState } from 'react';
import { CheckCircle2, Plus, Trash2, Star, Target, CheckSquare, Zap } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr, type Sprint, type Task } from '../../lib/db';

interface Props { activeSprint?: Sprint; }

export const TodayTab = ({ activeSprint }: Props) => {
  const today = todayStr();
  const daily = useLiveQuery(() => db.dailyTasks.where('date').equals(today).sortBy('order'), [today]) ?? [];
  const sprintTasks = useLiveQuery(
    () => activeSprint?.id ? db.tasks.where('sprintId').equals(activeSprint.id).toArray() : Promise.resolve([] as Task[]),
    [activeSprint?.id]
  ) ?? [];

  const [showAdd, setShowAdd] = useState(false);
  const [label,   setLabel]   = useState('');

  const done   = daily.filter(t => t.done).length;

  const add = async (lbl: string, taskId?: number) => {
    const clean = lbl.trim();
    if (!clean) return;
    await db.dailyTasks.add({ date: today, label: clean, taskId, done: false, order: daily.length, updatedAt: Date.now() });
    setLabel(''); setShowAdd(false);
  };

  const toggle = async (id?: number, cur?: boolean) => {
    if (id != null) await db.dailyTasks.update(id, { done: !cur, updatedAt: Date.now() });
  };

  const remove = async (id?: number) => {
    if (id != null) await db.dailyTasks.delete(id);
  };

  const pending = sprintTasks.filter(t => t.status !== 'done');
  const primaryTargets = daily.slice(0, 3);
  const generalBacklog = daily.slice(3);

  const renderTask = (task: typeof daily[0], isPrimary: boolean) => (
    <div key={task.id}
      className={`group flex items-center gap-3 p-4 rounded-xl transition-all shadow-sm border ${task.done ? 'border-surface-container-highest bg-[#111318]/50' : 'border-outline-variant/10 bg-[#16181b] hover:border-primary/20 hover:bg-[#1a1c20]'}`}>
      <button onClick={() => toggle(task.id, task.done)}
        className={`w-6 h-6 shrink-0 flex items-center justify-center rounded transition-all border ${task.done ? 'border-secondary bg-secondary/10' : isPrimary ? 'border-primary hover:bg-primary/20' : 'border-outline/50 hover:border-primary'}`}>
        {task.done && <CheckCircle2 size={14} className="text-secondary" />}
      </button>
      <span className={`flex-1 font-headline font-bold text-sm tracking-wide break-words ${task.done ? 'line-through text-on-surface-variant/40' : 'text-on-surface'}`}>
        {task.label}
      </span>
      <button onClick={() => remove(task.id)}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-outline/30 hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100">
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 pb-6 border-b border-outline-variant/10 gap-4">
        <div>
          <h2 className="font-headline font-black text-2xl text-primary flex items-center gap-2">
            <Zap className="text-primary" size={24}/> Today's Directives
          </h2>
          <p className="font-body text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        {daily.length > 0 && (
          <div className="px-5 py-3 rounded-xl bg-surface-container-highest border border-outline-variant/20 shadow-md">
            <div className="text-[9px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-0.5">Execution Status</div>
            <div className="font-headline font-black text-xl text-secondary">{done} <span className="text-on-surface-variant/40 text-sm font-bold">/ {daily.length} Done</span></div>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300 relative z-20">
          <div className="flex flex-col md:flex-row items-center gap-3 p-4 rounded-2xl bg-surface-container border border-primary/30 shadow-[0_0_20px_rgba(0,219,233,0.1)]">
            <div className="w-full relative">
              <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && add(label)}
                placeholder="What needs to be done?"
                className="w-full bg-transparent font-headline font-bold text-base text-primary tracking-wide placeholder:text-on-surface-variant/30 outline-none p-2" />
            </div>
            
            <div className="flex w-full md:w-auto items-center gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-none border-outline-variant/10">
              {pending.length > 0 && (
                <div className="relative group/sprint flex-1 md:flex-none">
                  <button className="w-full px-4 py-2.5 font-headline font-bold text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-all rounded-lg border border-outline-variant/20 hover:border-primary/40 bg-surface-container-high whitespace-nowrap">
                    Pull From Sprint
                  </button>
                  <div className="hidden group-hover/sprint:block absolute top-[110%] md:bottom-[110%] md:top-auto right-0 mb-1 w-64 max-h-52 overflow-y-auto z-50 rounded-xl"
                    style={{ background: '#1e2024', border: '1px solid rgba(0,219,233,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                    {pending.map(t => (
                      <button key={t.id} onClick={() => add(t.label, t.id)}
                        className="w-full px-4 py-3 text-left hover:bg-surface-container-highest transition-colors border-b border-outline-variant/10 last:border-0 block text-xs">
                        <span className="font-headline font-bold text-on-surface truncate tracking-tight">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <button onClick={() => add(label)}
                className="flex-1 md:flex-none px-6 py-2.5 rounded-lg font-headline font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all text-black hover:bg-primary-hover shadow-[0_0_15px_rgba(0,219,233,0.3)]"
                style={{ background: '#00dbe9' }}>Add</button>
              <button onClick={() => { setShowAdd(false); setLabel(''); }}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:text-error border border-outline-variant/10 hover:border-error/30 transition-colors">
                <Trash2 size={16}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Track Grid */}
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 items-stretch pb-12">
        
        {/* Tier 1: Primary Targets */}
        <div>
           <div className="flex justify-between items-end mb-4">
               <div>
                  <h3 className="font-headline font-black text-sm text-primary uppercase tracking-widest flex items-center gap-2">
                     <Target size={16}/> Main Priorities
                  </h3>
                  <p className="font-body text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest mt-0.5">Top Critical Focuses</p>
               </div>
               {daily.length < 3 && !showAdd && (
                 <button onClick={() => setShowAdd(true)} className="text-xs text-primary font-bold uppercase flex items-center gap-1 hover:text-primary-fixed-dim transition-colors pb-1">
                   <Plus size={14}/> Add
                 </button>
               )}
           </div>

           <div className="flex flex-col gap-3">
              {primaryTargets.map(t => renderTask(t, true))}
              
              {primaryTargets.length === 0 && !showAdd && (
                 <button onClick={() => setShowAdd(true)} className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-outline-variant/20 rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-colors text-on-surface-variant/40 group">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                       <Plus size={20} />
                    </div>
                    <span className="font-headline font-bold text-xs uppercase tracking-widest">Set First Priority</span>
                 </button>
              )}
           </div>
        </div>

        {/* Tier 2: General Backlog */}
        {(generalBacklog.length > 0 || (primaryTargets.length >= 3 && !showAdd)) && (
          <details className="group marker:content-['']">
             <summary className="flex items-center justify-between cursor-pointer list-none p-4 rounded-xl border border-outline-variant/10 bg-surface-container-highest/20 hover:bg-surface-container-highest/50 transition-colors">
                 <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded flex items-center justify-center bg-surface-container-high group-open:bg-primary/10 text-on-surface-variant group-open:text-primary transition-colors">
                       <CheckSquare size={14}/>
                    </div>
                    <div>
                       <h3 className="font-headline font-black text-sm text-on-surface uppercase tracking-widest">
                          Minor Tasks & Backlog
                       </h3>
                       <p className="font-body text-[9px] text-on-surface-variant/60 font-bold uppercase tracking-widest mt-0.5">
                          {generalBacklog.length} Items
                       </p>
                    </div>
                 </div>
                 <div className="text-on-surface-variant group-open:rotate-180 transition-transform">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                 </div>
             </summary>
             <div className="pt-4 flex flex-col gap-3">
                {generalBacklog.map(t => renderTask(t, false))}
                
                {!showAdd && (
                   <button onClick={() => setShowAdd(true)} className="w-full flex items-center gap-3 p-4 border border-outline-variant/10 rounded-xl hover:border-primary/30 hover:bg-surface-container-highest transition-colors text-on-surface-variant/60 group">
                      <div className="w-6 h-6 border-2 border-dashed border-outline-variant/30 rounded flex items-center justify-center flex-shrink-0 group-hover:border-primary group-hover:text-primary transition-colors">
                         <Plus size={14} />
                      </div>
                      <span className="font-headline font-bold text-xs uppercase tracking-widest">Log a minor task...</span>
                   </button>
                )}
             </div>
          </details>
        )}
      </div>

      {daily.length > 0 && done === daily.length && (
        <div className="mt-12 p-6 rounded-3xl text-center border border-secondary/20 shadow-[0_0_30px_rgba(0,228,117,0.05)] bg-[#111318] relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,228,117,0.05)] via-transparent to-[rgba(0,228,117,0.05)]" />
           <Star size={32} className="text-secondary mx-auto mb-3" fill="currentColor"/>
           <div className="font-headline font-black text-lg text-secondary uppercase tracking-widest relative z-10">Total Victory</div>
           <div className="font-body text-xs text-secondary/70 mt-1 font-bold tracking-wide relative z-10">All daily directives have been demolished.</div>
        </div>
      )}
    </div>
  );
};
