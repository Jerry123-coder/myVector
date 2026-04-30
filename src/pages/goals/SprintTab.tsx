import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Plus, Trash2, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task } from '../../lib/db';
import { nowMs } from '../../lib/time';

const PRIORITIES = ['HIGH', 'MED', 'LOW'] as const;
type Priority = typeof PRIORITIES[number];
const PRI: Record<Priority, string> = {
  HIGH: 'text-error border-error/30 bg-error/5',
  MED:  'text-tertiary-fixed-dim border-tertiary-fixed-dim/30',
  LOW:  'text-outline border-outline-variant',
};

export const SprintTab = () => {
  const sprints         = useLiveQuery(() => db.sprints.toArray().then(a => a.sort((x,y) => y.startDate - x.startDate)), []) ?? [];
  const quarterlyGoals  = useLiveQuery(() => db.quarterlyGoals.toArray(), []) ?? [];

  const [selectedId, setSelectedId]     = useState<number | undefined>();
  const [creating, setCreating]         = useState(false);
  const [name, setName]                 = useState('');
  const [qGoalId, setQGoalId]           = useState<number | undefined>();
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskPri, setNewTaskPri]     = useState<Priority>('MED');

  const displayed = sprints.find(s => s.id === selectedId) ?? sprints[0];

  const sprintTasks = useLiveQuery(
    () => displayed?.id ? db.tasks.where('sprintId').equals(displayed.id).toArray().then(a => a.sort((x,y) => (x.order ?? x.createdAt) - (y.order ?? y.createdAt))) : Promise.resolve([] as Task[]),
    [displayed?.id]
  ) ?? [];

  const doneTasks    = sprintTasks.filter(t => t.status === 'done');
  const progress     = sprintTasks.length ? Math.round((doneTasks.length / sprintTasks.length) * 100) : 0;

  // Day tracker
  const sprintDays = displayed ? (() => {
    const total    = Math.max(1, Math.ceil((displayed.endDate - displayed.startDate) / 86400000));
    const todayMs  = new Date().setHours(0, 0, 0, 0);
    const todayIdx = Math.floor((todayMs - displayed.startDate) / 86400000);
    return Array.from({ length: total }, (_, i) => {
      const dayStart = displayed.startDate + i * 86400000;
      const hasDone  = doneTasks.some(t => t.completedAt && t.completedAt >= dayStart && t.completedAt < dayStart + 86400000);
      return { num: i + 1, isToday: i === todayIdx, isPast: i < todayIdx, hasDone };
    });
  })() : [];

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector<HTMLElement>('[data-today]');
    if (el) scrollRef.current.scrollLeft = el.offsetLeft - scrollRef.current.offsetWidth / 2 + el.offsetWidth / 2;
  }, [displayed?.id, sprintDays.length]);

  const createSprint = async () => {
    if (!name || !startDate || !endDate) return;
    const id = await db.sprints.add({
      name: name.toUpperCase(), quarterlyGoalId: qGoalId,
      startDate: new Date(startDate).getTime(), endDate: new Date(endDate).getTime(),
      status: 'active', createdAt: nowMs(), updatedAt: Date.now(),
    }) as number;
    setSelectedId(id);
    setName(''); setStartDate(''); setEndDate(''); setQGoalId(undefined); setCreating(false);
  };

  const addTask = async () => {
    if (!newTaskLabel.trim() || !displayed?.id) return;
    const qGoal = quarterlyGoals.find(g => g.id === displayed.quarterlyGoalId);
    await db.tasks.add({
      label: newTaskLabel.trim().toUpperCase(), status: 'pending', priority: newTaskPri,
      sprintId: displayed.id, quarterlyGoalId: displayed.quarterlyGoalId,
      annualGoalId: qGoal?.annualGoalId, order: sprintTasks.length, createdAt: nowMs(), updatedAt: Date.now(),
    });
    setNewTaskLabel('');
  };

  const toggleTask = async (t: Task) => {
    if (!t.id) return;
    await db.tasks.update(t.id, t.status === 'done'
      ? { status: 'pending', completedAt: undefined, updatedAt: Date.now() }
      : { status: 'done', completedAt: nowMs(), updatedAt: Date.now() });
  };

  const reorderTask = async (task: Task, direction: 'up' | 'down') => {
    if (!task.id) return;
    const currentIndex = sprintTasks.findIndex(t => t.id === task.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sprintTasks.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapTask = sprintTasks[swapIndex];

    await db.transaction('rw', db.tasks, async () => {
      await db.tasks.update(task.id!, { order: swapIndex, updatedAt: Date.now() });
      await db.tasks.update(swapTask.id!, { order: currentIndex, updatedAt: Date.now() });
    });
  };

  const deleteTask = async (id?: number) => { if (id) await db.tasks.delete(id); };
  const deleteSprint = async (id?: number) => { if (id) { await db.sprints.delete(id); setSelectedId(undefined); } };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-8 bg-surface-container-highest p-4 rounded-2xl border border-outline-variant/10 shadow-sm">
        <select
          value={displayed?.id ?? ''}
          onChange={e => setSelectedId(Number(e.target.value) || undefined)}
          className="bg-[#111318] rounded-xl font-headline font-bold text-sm text-primary uppercase tracking-tight outline-none px-4 py-2.5 border border-outline-variant/20 hover:border-primary/40 focus:border-primary/70 transition-colors cursor-pointer shadow-inner">
          {sprints.length === 0 && <option value="">No sprints yet</option>}
          {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {displayed && (
          <div className="font-body text-[10px] text-on-surface-variant font-bold uppercase tracking-widest px-3 py-1.5 bg-black/20 rounded-lg">
            {new Date(displayed.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}<span className="text-primary-fixed-dim/50 mx-2">→</span>
            {new Date(displayed.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
        <div className="ml-auto flex gap-2">
          {displayed && (
            <button onClick={() => deleteSprint(displayed.id)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-error/10 text-outline/30 hover:text-error transition-colors"
              title="Delete sprint">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={() => setCreating(!creating)}
            className="flex items-center gap-2 px-4 py-2 font-headline font-bold text-[10px] text-primary-fixed-dim uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all border border-primary/20 hover:border-primary/50 shadow-sm">
            <Plus size={12} /> New Sprint
          </button>
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-8 p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ background: '#111318', border: '1px solid rgba(0,219,233,0.15)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant ml-1">Sprint Name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="E.g., Q3_SPRINT_BETA"
              className="bg-surface-container-highest rounded-xl font-headline font-bold text-sm text-primary uppercase outline-none px-4 py-3 placeholder:text-on-surface-variant/30 border border-outline-variant/10 focus:border-primary/40 transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant ml-1">Link to Goal</span>
            <select value={qGoalId ?? ''} onChange={e => setQGoalId(Number(e.target.value) || undefined)}
              className="bg-surface-container-highest rounded-xl font-headline font-bold text-sm text-primary uppercase outline-none px-4 py-3 border border-outline-variant/10 focus:border-primary/40 transition-colors">
              <option value="">— Unlinked / Standalone —</option>
              {quarterlyGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant ml-1">Start Date</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-surface-container-highest rounded-xl font-headline font-bold text-sm text-primary outline-none px-4 py-3 border border-outline-variant/10 focus:border-primary/40 transition-colors" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant ml-1">End Date</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-surface-container-highest rounded-xl font-headline font-bold text-sm text-primary outline-none px-4 py-3 border border-outline-variant/10 focus:border-primary/40 transition-colors" />
          </div>
          <div className="sm:col-span-2 flex gap-3 mt-2">
            <button onClick={createSprint}
              className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-headline font-black text-[11px] uppercase tracking-widest active:scale-95 text-black hover:opacity-90 shadow-[0_0_20px_rgba(0,219,233,0.2)] transition-transform"
              style={{ background: '#00dbe9' }}>Initialize Sprint</button>
            <button onClick={() => setCreating(false)}
              className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-headline font-bold text-[11px] uppercase tracking-widest border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:border-primary/30 transition-colors bg-surface-container-high">Cancel</button>
          </div>
        </div>
      )}
      {sprints.length === 0 && !creating && (
        <div className="py-12 text-center" style={{ border: '1px dashed rgba(0,219,233,0.1)' }}>
          <Zap size={24} className="text-primary/20 mx-auto mb-3" />
          <div className="font-headline font-bold text-xs text-on-surface-variant/50 uppercase tracking-widest">No sprints yet</div>
          <div className="font-body text-[10px] text-on-surface-variant/30 mt-1">Create your first sprint above.</div>
        </div>
      )}

      {displayed && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Task list and Input */}
            <div className="mb-6 rounded-2xl bg-[#111318] border border-outline-variant/10 shadow-lg overflow-hidden">
               {/* Add task */}
               <div className="flex flex-wrap md:flex-nowrap items-center gap-2 p-3 border-b border-outline-variant/10 bg-surface-container-highest/30">
                 <input value={newTaskLabel} onChange={e => setNewTaskLabel(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && addTask()}
                   placeholder="Log a task into this sprint..."
                   className="flex-1 bg-transparent font-headline font-bold text-sm text-primary uppercase tracking-tight placeholder:text-on-surface-variant/30 outline-none px-2" />
                 <div className="flex gap-1 bg-[#0B0C10] p-1 rounded-lg">
                   {PRIORITIES.map(p => (
                     <button key={p} onClick={() => setNewTaskPri(p)}
                       className={`px-3 py-1.5 font-body font-bold text-[9px] rounded uppercase transition-all ${newTaskPri === p ? PRI[p] : 'text-outline/50 hover:text-on-surface-variant'}`}>
                       {p}
                     </button>
                   ))}
                 </div>
                 <button onClick={addTask}
                   className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-primary/10 text-primary-fixed-dim hover:bg-primary/20 transition-colors">
                   <Plus size={16} />
                 </button>
               </div>
   
               {/* Task list */}
               <div className="flex flex-col divide-y divide-outline-variant/5">
                 {sprintTasks.length === 0 && (
                   <div className="py-12 text-center">
                     <span className="font-headline font-bold text-xs text-on-surface-variant/40 uppercase tracking-widest">No tasks in this sprint</span>
                   </div>
                 )}
                 {sprintTasks.map((task, index) => {
                   const isNextActive = task.status !== 'done' && sprintTasks.slice(0, index).every(t => t.status === 'done');
                   return (
                   <div key={task.id} onClick={() => toggleTask(task)}
                     className={`flex items-center justify-between p-4 group cursor-pointer transition-all ${task.status === 'done' ? 'bg-[#111318]' : isNextActive ? 'bg-[#1a1c20] border-l-2 border-primary' : 'bg-[#16181b] hover:bg-[#1a1c20]'}`}>
                     <div className="flex items-center gap-4 flex-1 min-w-0">
                       <div className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border transition-all ${task.status === 'done' ? 'border-secondary bg-secondary/10' : isNextActive ? 'border-primary shadow-[0_0_10px_rgba(0,219,233,0.3)]' : 'border-outline-variant group-hover:border-primary/50'}`}>
                         {task.status === 'done'   && <CheckCircle2 size={12} className="text-secondary" />}
                         {isNextActive && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                       </div>
                       <div className="min-w-0 flex-1">
                         <div className={`font-headline font-bold text-sm uppercase tracking-tight truncate flex items-center gap-2 ${task.status === 'done' ? 'text-on-surface-variant/40 line-through' : isNextActive ? 'text-primary' : 'text-on-surface'}`}>
                           {task.label}
                           {isNextActive && <span className="text-[8px] px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary font-black tracking-widest">NEXT TARGET</span>}
                         </div>
                         {task.status === 'done' && task.completedAt && (
                           <div className="font-body text-[9px] text-secondary uppercase tracking-widest mt-0.5">
                             Ended {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                           </div>
                         )}
                       </div>
                     </div>
                     <div className="flex items-center gap-2 flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={e => { e.stopPropagation(); reorderTask(task, 'up'); }} disabled={index === 0}
                         className="w-6 h-6 rounded flex items-center justify-center text-outline/50 hover:bg-white/10 hover:text-on-surface disabled:opacity-30">
                         <ArrowUp size={14} />
                       </button>
                       <button onClick={e => { e.stopPropagation(); reorderTask(task, 'down'); }} disabled={index === sprintTasks.length - 1}
                         className="w-6 h-6 rounded flex items-center justify-center text-outline/50 hover:bg-white/10 hover:text-on-surface disabled:opacity-30">
                         <ArrowDown size={14} />
                       </button>
                     </div>
                     <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                       <span className={`text-[9px] rounded uppercase tracking-wider font-bold px-2 py-1 border ${PRI[task.priority]}`}>{task.priority}</span>
                       <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                         className="w-8 h-8 rounded-lg flex items-center justify-center text-outline/30 hover:bg-error/10 hover:text-error transition-colors opacity-0 group-hover:opacity-100">
                         <Trash2 size={14} />
                       </button>
                     </div>
                   </div>
                 )})}
               </div>
            </div>
          </div>

          <div className="lg:col-span-1 border border-outline-variant/10 rounded-2xl bg-[#111318] p-5 shadow-lg max-h-min">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <span className="font-headline font-black text-[11px] uppercase tracking-widest text-on-surface">Sprint Trajectory</span>
                <span className="font-headline font-black text-2xl text-primary-fixed-dim tabular-nums leading-none">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest overflow-hidden rounded-full">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: 'linear-gradient(to right,#00dbe9,#00f0ff)', boxShadow: '0 0 12px rgba(0,219,233,0.5)' }} />
              </div>
            </div>
  
            {/* Day tracker timeline */}
            <div className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant/60 mb-3">Timeline</div>
            <div ref={scrollRef} className="overflow-auto no-scrollbar rounded-xl bg-surface-container-highest/20 border border-outline-variant/5 p-3" style={{ scrollBehavior: 'smooth', maxHeight: '400px' }}>
              <div className="flex flex-col gap-2">
                {sprintDays.map(({ num, isToday, isPast, hasDone }) => (
                  <div key={num} data-today={isToday || undefined}
                    className="w-full flex items-center gap-3 rounded-lg px-4 py-3 transition-all"
                    style={{
                      borderLeft: `3px solid ${isToday ? '#00dbe9' : hasDone ? '#00e475' : isPast ? '#3b494b' : 'transparent'}`,
                      background: isToday ? 'rgba(0,219,233,0.1)' : hasDone ? 'rgba(0,228,117,0.05)' : isPast ? '#151821' : '#0e1014',
                      boxShadow: isToday ? '0 0 14px rgba(0,219,233,0.1)' : 'none',
                    }}>
                    <div className={`w-8 font-headline font-black text-xs tabular-nums text-center ${isToday ? 'text-primary' : hasDone ? 'text-secondary' : isPast ? 'text-on-surface-variant/50' : 'text-on-surface-variant/20'}`}>
                      D{num}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                       {isToday && <><div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00dbe9]" /><span className="text-[9px] uppercase tracking-widest font-bold text-primary">Today</span></>}
                       {hasDone && !isToday && <><CheckCircle2 size={12} className="text-secondary" /><span className="text-[9px] uppercase tracking-widest font-bold text-secondary">Logged</span></>}
                       {isPast && !hasDone && <span className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/40">—</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
