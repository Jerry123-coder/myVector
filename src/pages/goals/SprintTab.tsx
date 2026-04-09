import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Plus, Trash2, Zap } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task } from '../../lib/db';

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
    () => displayed?.id ? db.tasks.where('sprintId').equals(displayed.id).toArray().then(a => a.sort((x,y) => x.createdAt - y.createdAt)) : Promise.resolve([] as Task[]),
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
      status: 'active', createdAt: Date.now(),
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
      annualGoalId: qGoal?.annualGoalId, createdAt: Date.now(),
    });
    setNewTaskLabel('');
  };

  const toggleTask = async (t: Task) => {
    if (!t.id) return;
    await db.tasks.update(t.id, t.status === 'done'
      ? { status: 'pending', completedAt: undefined }
      : { status: 'done', completedAt: Date.now() });
  };

  const deleteTask = async (id?: number) => { if (id) await db.tasks.delete(id); };
  const deleteSprint = async (id?: number) => { if (id) { await db.sprints.delete(id); setSelectedId(undefined); } };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={displayed?.id ?? ''}
          onChange={e => setSelectedId(Number(e.target.value) || undefined)}
          className="bg-surface-container-high font-headline font-bold text-sm text-primary uppercase tracking-tight outline-none px-3 py-2 border border-surface-container-highest cursor-pointer">
          {sprints.length === 0 && <option value="">No sprints yet</option>}
          {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {displayed && (
          <span className="font-body text-[9px] text-on-surface-variant uppercase tracking-widest">
            {new Date(displayed.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} →{' '}
            {new Date(displayed.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {displayed && (
            <button onClick={() => deleteSprint(displayed.id)}
              className="w-8 h-8 flex items-center justify-center text-outline/30 hover:text-error/70 transition-colors"
              title="Delete sprint">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={() => setCreating(!creating)}
            className="flex items-center gap-1.5 px-3 py-2 font-headline font-bold text-[10px] text-primary-fixed-dim uppercase tracking-widest hover:bg-surface-container-high transition-all"
            style={{ border: '1px solid rgba(0,219,233,0.2)' }}>
            <Plus size={12} /> New Sprint
          </button>
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-6 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ background: '#1e2024', border: '1px solid rgba(0,219,233,0.15)', borderLeft: '2px solid #00dbe9' }}>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant">Sprint Name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Q3_SPRINT_BETA"
              className="bg-transparent border-b border-surface-container-highest font-headline font-bold text-sm text-primary uppercase outline-none py-1.5 placeholder:text-on-surface-variant/30" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant">Link to Goal</span>
            <select value={qGoalId ?? ''} onChange={e => setQGoalId(Number(e.target.value) || undefined)}
              className="bg-transparent border-b border-surface-container-highest font-headline font-bold text-sm text-primary uppercase outline-none py-1.5">
              <option value="">— None —</option>
              {quarterlyGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant">Start Date</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="bg-transparent border-b border-surface-container-highest font-headline font-bold text-sm text-primary outline-none py-1.5" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant">End Date</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="bg-transparent border-b border-surface-container-highest font-headline font-bold text-sm text-primary outline-none py-1.5" />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={createSprint}
              className="px-6 py-2.5 font-headline font-black text-xs uppercase tracking-widest active:scale-95"
              style={{ background: '#00dbe9', color: '#002022' }}>Create Sprint</button>
            <button onClick={() => setCreating(false)}
              className="px-6 py-2.5 font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary"
              style={{ border: '1px solid #282a2e' }}>Cancel</button>
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
        <>
          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-1.5">
              <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Sprint Completion</span>
              <span className="font-headline font-black text-xl text-primary-fixed-dim tabular-nums">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest overflow-hidden">
              <div className="h-full transition-all duration-700"
                style={{ width: `${progress}%`, background: 'linear-gradient(to right,#00dbe9,#00f0ff)', boxShadow: '0 0 10px rgba(0,219,233,0.4)' }} />
            </div>
          </div>

          {/* Day tracker — scrolled to center on today */}
          <div ref={scrollRef} className="mb-8 overflow-x-auto no-scrollbar" style={{ scrollBehavior: 'smooth' }}>
            <div className="flex gap-1.5 pb-2" style={{ minWidth: 'max-content', padding: '4px 16px' }}>
              {sprintDays.map(({ num, isToday, isPast, hasDone }) => (
                <div key={num} data-today={isToday || undefined}
                  className="flex-shrink-0 w-12 h-16 flex flex-col items-center justify-center gap-1 border-l-2 transition-all"
                  style={{
                    borderLeftColor: isToday ? '#00dbe9' : hasDone ? '#00e475' : isPast ? '#3b494b' : '#1e2024',
                    background: isToday ? 'rgba(0,219,233,0.1)' : hasDone ? 'rgba(0,228,117,0.08)' : isPast ? '#151821' : '#0c0e12',
                    transform: isToday ? 'scaleY(1.08)' : 'none',
                    boxShadow: isToday ? '0 0 14px rgba(0,219,233,0.2)' : hasDone ? '0 0 0 1px rgba(0,228,117,0.1)' : 'none',
                  }}>
                  <span className={`font-headline font-bold text-[9px] ${isToday ? 'text-primary' : hasDone ? 'text-secondary' : isPast ? 'text-on-surface-variant/50' : 'text-on-surface-variant/20'}`}>
                    D{num}
                  </span>
                  {isToday  && <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_6px_#00dbe9]" />}
                  {hasDone && !isToday && <CheckCircle2 size={13} className="text-secondary" />}
                  {isPast && !hasDone && <div className="w-1.5 h-0.5 bg-outline/30" />}
                </div>
              ))}
            </div>
          </div>

          {/* Add task */}
          <div className="flex items-center gap-2 mb-3 p-3"
            style={{ background: '#1e2024', border: '1px solid rgba(0,219,233,0.08)' }}>
            <input value={newTaskLabel} onChange={e => setNewTaskLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="ADD TASK TO SPRINT..."
              className="flex-1 bg-transparent font-headline font-bold text-xs text-primary uppercase tracking-tight placeholder:text-on-surface-variant/30 outline-none" />
            <div className="flex gap-1">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => setNewTaskPri(p)}
                  className={`px-2 py-1 font-body font-bold text-[8px] border uppercase transition-all ${newTaskPri === p ? PRI[p] : 'text-outline/50 border-outline-variant/30'}`}>
                  {p}
                </button>
              ))}
            </div>
            <button onClick={addTask}
              className="w-8 h-8 flex items-center justify-center text-primary-fixed-dim hover:bg-surface-container-highest transition-colors">
              <Plus size={14} />
            </button>
          </div>

          {/* Task list */}
          <div className="space-y-2">
            {sprintTasks.length === 0 && (
              <div className="py-6 text-center">
                <span className="font-headline font-bold text-xs text-on-surface-variant/40 uppercase tracking-widest">No tasks in this sprint</span>
              </div>
            )}
            {sprintTasks.map(task => (
              <div key={task.id} onClick={() => toggleTask(task)}
                className={`flex items-center justify-between p-4 group cursor-pointer transition-all border-l-2 ${task.status === 'done' ? 'border-secondary/40' : task.status === 'active' ? 'border-primary-fixed-dim' : 'border-transparent hover:border-outline-variant'}`}
                style={{ background: task.status === 'active' ? 'rgba(0,219,233,0.04)' : '#1e2024' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center border-2 transition-all ${task.status === 'done' ? 'border-secondary bg-secondary/10' : task.status === 'active' ? 'border-primary' : 'border-outline-variant group-hover:border-outline'}`}>
                    {task.status === 'done'   && <CheckCircle2 size={14} className="text-secondary" />}
                    {task.status === 'active' && <div className="w-2 h-2 bg-primary animate-pulse" />}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-headline font-bold text-sm uppercase tracking-tight truncate ${task.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`}>
                      {task.label}
                    </div>
                    {task.status === 'done' && task.completedAt && (
                      <div className="font-body text-[9px] text-secondary uppercase tracking-widest mt-0.5">
                        ✓ {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className={`text-[8px] font-bold px-2 py-0.5 border ${PRI[task.priority]}`}>{task.priority}</span>
                  <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }}
                    className="w-7 h-7 flex items-center justify-center text-outline/30 hover:text-error/70 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
