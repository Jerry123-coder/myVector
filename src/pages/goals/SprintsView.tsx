import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../../lib/DbContext';
import { type Task, type Sprint } from '../../lib/db';
import { nowMs } from '../../lib/time';
import {
  Plus, Trash2, Zap,
  CalendarRange, Check, Target, GripVertical, LayoutGrid, ListTodo, Lock
} from 'lucide-react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { useToast } from '../../components/ToastContext';
import { StatusRibbon } from '../../components/StatusRibbon';

const PRIORITIES = ['HIGH', 'MED', 'LOW'] as const;
type Priority = typeof PRIORITIES[number];
const PRI_COLORS: Record<Priority, string> = {
  HIGH: 'text-error border-error/20 bg-error/10',
  MED:  'text-[#ffba38] border-[#ffba38]/20 bg-[#ffba38]/10',
  LOW:  'text-on-surface-variant/60 border-white/10 bg-white/5',
};

// ── Quarter helpers ──────────────────────────────────────
function currentQuarterStart(): Date {
  const now = new Date(); const qStart = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), qStart, 1);
}
function buildQuarterBlocks() {
  const qs = currentQuarterStart();
  return Array.from({ length: 6 }, (_, i) => {
    const s = new Date(qs); s.setDate(s.getDate() + i * 14);
    const e = new Date(s);  e.setDate(e.getDate() + 13);
    return { slot: i + 1, weekStart: s, weekEnd: e };
  });
}

const nowMs_ = Date.now();
function daysRemaining(endDate: number): number {
  return Math.max(0, Math.ceil((endDate - nowMs_) / 86400000));
}

export const SprintsView = () => {
  const { db, isTestMode } = useDb();
  const sprints        = useLiveQuery(() => db.sprints.orderBy('startDate').toArray(), [isTestMode]) ?? [];
  const quarterlyGoals = useLiveQuery(() => db.quarterlyGoals.toArray(), [isTestMode]) ?? [];
  const allTasks       = useLiveQuery(() => db.tasks.toArray(), [isTestMode]) ?? [];

  const [creating, setCreating]         = useState(false);
  const [selectedId, setSelectedId]     = useState<number | undefined>();
  const [name, setName]                 = useState('');
  const [sprintObjective, setSprintObjective] = useState('');
  const [qGoalId, setQGoalId]           = useState<number | undefined>();
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskPri, setNewTaskPri]     = useState<Priority>('MED');
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban'>('list');
  const [focusMode, setFocusMode]       = useState(false);

  const { showToast } = useToast();
  const roadmapRef = useRef<HTMLDivElement>(null);
  const quarterBlocks = buildQuarterBlocks();
  const now = Date.now();

  const activeSprint = sprints.find(s => s.status === 'active' && s.startDate <= now && s.endDate >= now)
    ?? sprints.find(s => s.status === 'active');

  const selectedSprint: Sprint | undefined = sprints.find(s => s.id === selectedId) ?? activeSprint ?? sprints[0];

  const sprintTasks = useLiveQuery(
    () => selectedSprint?.id
      ? db.tasks.where('sprintId').equals(selectedSprint.id).toArray().then(a => a.sort((x, y) => (x.order ?? x.createdAt) - (y.order ?? y.createdAt)))
      : Promise.resolve([] as Task[]),
    [selectedSprint?.id, isTestMode]
  ) ?? [];

  const displayTasks = focusMode ? sprintTasks.filter(t => t.dailyFocus) : sprintTasks;

  const toggleFocus = async (t: Task) => {
    if (!t.id) return;
    const isFocus = !t.dailyFocus;
    if (isFocus) {
      const activeFocusCount = sprintTasks.filter(task => task.dailyFocus).length;
      if (activeFocusCount >= 3) {
        showToast('Maximum daily focus capacity reached (3)', 'error');
        return;
      }
    }
    await db.tasks.update(t.id, { dailyFocus: isFocus, updatedAt: Date.now() });
    showToast(isFocus ? 'Tactical focus node activated' : 'Focus flag removed', 'success');
  };

  const doneTasks = sprintTasks.filter(t => t.status === 'done');
  const progress  = sprintTasks.length ? Math.round((doneTasks.length / sprintTasks.length) * 100) : 0;

  useEffect(() => {
    const el = roadmapRef.current?.querySelector<HTMLElement>('[data-active]');
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [sprints.length]);

  const createSprint = async () => {
    if (!name || !startDate || !endDate) return;
    const id = await db.sprints.add({
      name: name.toUpperCase(), objective: sprintObjective, quarterlyGoalId: qGoalId,
      startDate: new Date(startDate).getTime(), endDate: new Date(endDate).getTime(),
      status: 'planned', createdAt: nowMs(), updatedAt: Date.now(),
    }) as number;
    setSelectedId(id);
    resetForm();
    showToast('Sprint Started', 'success');
  };

  const resetForm = () => {
    setName(''); setSprintObjective(''); setStartDate(''); setEndDate(''); setQGoalId(undefined);
    setCreating(false);
  };

  const addTask = async () => {
    if (!newTaskLabel.trim() || !selectedSprint?.id) return;
    const qGoal = quarterlyGoals.find(g => g.id === selectedSprint.quarterlyGoalId);
    await db.tasks.add({
      label: newTaskLabel.trim().toUpperCase(), status: 'pending', priority: newTaskPri,
      sprintId: selectedSprint.id, quarterlyGoalId: selectedSprint.quarterlyGoalId,
      annualGoalId: qGoal?.annualGoalId, order: sprintTasks.length, createdAt: nowMs(), updatedAt: Date.now(),
    });
    setNewTaskLabel('');
    showToast('Task Added', 'success');
  };

  const toggleTask = async (t: Task) => {
    if (!t.id) return;
    const isDone = t.status === 'done';
    await db.tasks.update(t.id, isDone
      ? { status: 'pending', completedAt: undefined, updatedAt: Date.now() }
      : { status: 'done', completedAt: nowMs(), updatedAt: Date.now() });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = Number(active.id);
    const overId = over.id;
    const activeTask = sprintTasks.find(t => t.id === activeId);
    if (!activeTask) return;

    if (overId === 'pending' || overId === 'active' || overId === 'done') {
      if (activeTask.status !== overId) {
         await db.tasks.update(activeId, { status: overId as Task['status'], updatedAt: Date.now() });
      }
      return;
    }

    const overIdNum = Number(over.id);
    const overTask = sprintTasks.find(t => t.id === overIdNum);

    if (overTask && activeTask.id !== overTask.id) {
       if (taskViewMode === 'kanban' && activeTask.status !== overTask.status) {
          await db.tasks.update(activeId, { status: overTask.status, updatedAt: Date.now() });
          return; 
       }
       const activeIndex = sprintTasks.findIndex(t => t.id === activeId);
       const overIndex = sprintTasks.findIndex(t => t.id === overIdNum);
       const newTasks = arrayMove(sprintTasks, activeIndex, overIndex);
       await db.transaction('rw', db.tasks, async () => {
          for (let i = 0; i < newTasks.length; i++) {
             await db.tasks.update(newTasks[i].id!, { order: i, updatedAt: Date.now() });
          }
       });
    }
  };

  const deleteTask   = async (id?: number) => { if (id) { await db.tasks.delete(id); showToast('Task Removed', 'info'); } };
  const deleteSprint = async (id?: number) => { if (id) { await db.sprints.delete(id); setSelectedId(undefined); showToast('Sprint Deleted', 'info'); } };

  const openCreateWithSlot = (slot: typeof quarterBlocks[0]) => {
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    setStartDate(fmt(slot.weekStart)); setEndDate(fmt(slot.weekEnd));
    setName(`SPRINT_0${slot.slot}`);
    setCreating(true);
  };

  const statusColor: Record<string, string> = { active: '#00dbe9', planned: '#646464', done: '#00e475' };

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4">
      
      <StatusRibbon />

      {/* ── ROADMAP STRIP ────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5 px-1">
           <div className="flex items-center gap-4">
              <h2 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight flex items-center gap-3">
                 <CalendarRange size={20} className="text-primary" /> Sprint Pipeline
              </h2>
              <div className="h-px w-16 bg-white/5" />
              <span className="text-[9px] font-black text-on-surface-variant/20 uppercase tracking-[0.3em]">Execution Workflow</span>
           </div>
           {activeSprint && (
              <button onClick={() => setSelectedId(activeSprint.id)} 
                      className="px-4 py-1.5 rounded-[14px] bg-primary/5 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all">
                 Jump_To_Live
              </button>
           )}
        </div>

        <div ref={roadmapRef} className="overflow-x-auto no-scrollbar pb-6">
           <div className="flex gap-3 min-w-max px-1">
              {Array.from({ length: 7 }, (_, i) => {
                 const qs = currentQuarterStart();
                 const s = new Date(qs); s.setDate(s.getDate() + i * 14);
                 const e = new Date(s);  e.setDate(e.getDate() + 13);
                 const block = { slot: i + 1, weekStart: s, weekEnd: e };
                 
                 const sprint = sprints.find(s => s.startDate <= block.weekEnd.getTime() && s.endDate >= block.weekStart.getTime());
                 const isCurrent = block.weekStart.getTime() <= now && block.weekEnd.getTime() >= now;
                 const isActive = sprint?.status === 'active';
                 const isSelected = selectedSprint?.id === sprint?.id || (!sprint && selectedId === undefined && isCurrent);
                 
                 return (
                    <button key={block.slot} 
                            data-active={isCurrent ? "true" : undefined}
                            onClick={() => sprint ? setSelectedId(sprint.id) : openCreateWithSlot(block)}
                            className={`group relative w-[165px] p-4 rounded-[14px] border transition-all duration-500 text-left ${
                               isActive ? 'bg-[#1a1c22] border-primary shadow-[0_0_25px_rgba(0,219,233,0.1)] ring-1 ring-primary/10' :
                               isSelected && sprint ? 'bg-[#1e2026] border-primary/40' :
                               sprint ? 'bg-[#111318] border-white/10 hover:border-white/20' :
                               isCurrent ? 'bg-primary/5 border-dashed border-primary/30 border-2' : 
                               'bg-[#0a0c10] border-dashed border-white/5 opacity-40 hover:opacity-100 hover:border-white/10'
                            }`}>
                       
                       {isActive && <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-[14px] pointer-events-none" />}
                       
                       <div className="flex items-center justify-between mb-3 relative z-10">
                          <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                             Phase_0{block.slot}
                          </span>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#00dbe9] animate-pulse" />}
                       </div>
                       
                       <div className="relative z-10 h-20 flex flex-col justify-between">
                          {sprint ? (
                             <>
                                <div className="min-w-0">
                                   <h4 className={`font-headline font-black text-[10px] uppercase tracking-tight mb-1 truncate ${isActive ? 'text-on-surface' : 'text-on-surface-variant/80'}`}>
                                      {sprint.name}
                                   </h4>
                                   <div className="flex items-center gap-1.5">
                                      <div className="w-1 h-1 rounded-full bg-current" style={{ color: statusColor[sprint.status] }} />
                                      <span className="text-[7px] font-black uppercase tracking-[0.1em] opacity-60" style={{ color: statusColor[sprint.status] }}>
                                         {sprint.status === 'active' ? 'Engaged' : 'Wait'}
                                      </span>
                                   </div>
                                </div>
                                
                                {(() => {
                                   const tasks = allTasks.filter(t => t.sprintId === sprint.id);
                                   const done = tasks.filter(t => t.status === 'done').length;
                                   const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
                                   return (
                                      <div className="space-y-1 mt-auto">
                                         <div className="flex justify-between items-end">
                                            <span className="text-[7px] font-black text-on-surface-variant/40 uppercase tracking-widest">{pct}%</span>
                                            <span className="text-[6px] font-black text-on-surface-variant/20 uppercase tracking-widest">{done}/{tasks.length}</span>
                                         </div>
                                         <div className="h-0.5 w-full bg-black/40 rounded-full overflow-hidden">
                                            <div className="h-full bg-current transition-all duration-1000 ease-out" 
                                                 style={{ width: `${pct}%`, color: statusColor[sprint.status] }} />
                                         </div>
                                      </div>
                                   );
                                })()}
                             </>
                          ) : (
                             <div className="flex flex-col items-center justify-center flex-1 text-on-surface-variant/10 group-hover:text-primary/40 transition-all duration-300">
                                <Plus size={16} strokeWidth={3} />
                             </div>
                          )}
                       </div>

                       <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between relative z-10">
                          <span className="text-[7px] font-black text-on-surface-variant/30 uppercase tracking-widest flex items-center gap-1">
                             {block.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          {isSelected && <div className="w-1 h-1 rounded-full bg-primary" />}
                       </div>
                    </button>
                 );
              })}
           </div>
        </div>
      </div>

      {/* ── TACTICAL COMMAND CENTER ─────────────────────────────── */}
      {selectedSprint ? (
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0f1115] rounded-[14px] border border-white/5 shadow-2xl overflow-hidden">
               {/* TOP HEADER / STATUS */}
               <div className="p-8 border-b border-white/5 relative overflow-hidden bg-gradient-to-br from-[#16181d] to-[#0f1115]">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="px-3 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/60">
                              {selectedSprint.status}
                           </div>
                           {selectedSprint.status === 'active' && (
                              <div className="flex items-center gap-1.5 px-3 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest">
                                 <span className="w-1 h-1 rounded-full bg-primary animate-pulse" /> Live_Ops
                              </div>
                           )}
                        </div>
                        <h3 className="font-headline font-black text-4xl text-on-surface uppercase tracking-tight leading-none mb-3">{selectedSprint.name}</h3>
                        {selectedSprint.objective && (
                           <div className="flex items-center gap-2 text-on-surface-variant/60">
                              <Target size={14} className="text-primary/60" />
                              <span className="font-headline font-bold text-[10px] uppercase tracking-widest">{selectedSprint.objective}</span>
                           </div>
                        )}
                     </div>

                     <div className="flex items-center gap-8">
                        <div className="text-right">
                           <span className="block text-[9px] font-black text-on-surface-variant/30 uppercase tracking-widest mb-0.5">Temporal</span>
                           <div className="flex items-end gap-1.5">
                              <span className="text-3xl font-headline font-black text-secondary tabular-nums leading-none">{daysRemaining(selectedSprint.endDate)}</span>
                              <span className="text-[10px] font-black text-on-surface-variant/40 mb-0.5 uppercase tracking-widest">D</span>
                           </div>
                        </div>
                        <div className="text-right">
                           <span className="block text-[9px] font-black text-on-surface-variant/30 uppercase tracking-widest mb-0.5">Efficiency</span>
                           <div className="flex items-end gap-1.5">
                              <span className="text-3xl font-headline font-black text-primary tabular-nums leading-none">{progress}</span>
                              <span className="text-[10px] font-black text-on-surface-variant/40 mb-0.5 uppercase tracking-widest">%</span>
                           </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                           {selectedSprint.status === 'planned' ? (
                              <button onClick={() => db.sprints.update(selectedSprint.id!, { status: 'active', updatedAt: Date.now() })}
                                      className="px-6 py-2.5 bg-primary text-black rounded-[14px] font-headline font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all">
                                 Initialize
                              </button>
                           ) : (
                              <button onClick={() => db.sprints.update(selectedSprint.id!, { status: selectedSprint.status === 'done' ? 'active' : 'done', updatedAt: Date.now() })}
                                      className={`px-6 py-2.5 rounded-[14px] font-headline font-black text-[9px] uppercase tracking-widest transition-all ${selectedSprint.status === 'done' ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'bg-secondary text-black shadow-lg hover:scale-105 active:scale-95'}`}>
                                 {selectedSprint.status === 'done' ? 'Reopen' : 'Complete'}
                              </button>
                           )}
                           <button onClick={() => deleteSprint(selectedSprint.id)} className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/20 hover:text-error transition-colors text-center">Nullify</button>
                        </div>
                     </div>
                  </div>

                  <div className="mt-8 h-1 w-full bg-black/40 rounded-full overflow-hidden">
                     <div className="h-full bg-primary transition-all duration-700 shadow-[0_0_10px_rgba(0,219,233,0.4)]" style={{ width: `${progress}%` }} />
                  </div>
               </div>

               {/* TASK CONTROL AREA */}
               <div className="p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                     <div className="flex-1 max-w-2xl bg-white/[0.03] border border-white/5 rounded-[14px] p-1 flex items-center gap-2">
                        <div className="flex gap-0.5 p-0.5 bg-black/40 rounded-lg border border-white/5">
                           {PRIORITIES.map(p => (
                              <button key={p} onClick={() => setNewTaskPri(p)}
                                      className={`px-3 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${newTaskPri === p ? PRI_COLORS[p] : 'text-on-surface-variant/20 hover:text-on-surface-variant'}`}>
                                 {p}
                              </button>
                           ))}
                        </div>
                        <input value={newTaskLabel} onChange={e => setNewTaskLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                               placeholder="Directive identifier..."
                               className="flex-1 bg-transparent border-none outline-none font-headline font-bold text-xs text-on-surface placeholder:text-on-surface-variant/20 px-2" />
                        <button onClick={addTask} className="w-10 h-10 rounded-lg bg-primary text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                           <Plus size={18} />
                        </button>
                     </div>

                     <div className="flex bg-black/40 p-1 rounded-[14px] border border-white/5">
                        <button onClick={() => setTaskViewMode('list')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${taskViewMode === 'list' ? 'bg-primary text-black' : 'text-on-surface-variant/40 hover:text-on-surface'}`}>
                           <ListTodo size={12} /> List
                        </button>
                        <button onClick={() => setTaskViewMode('kanban')} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${taskViewMode === 'kanban' ? 'bg-primary text-black' : 'text-on-surface-variant/40 hover:text-on-surface'}`}>
                           <LayoutGrid size={12} /> Kanban
                        </button>
                     </div>
                  </div>

                  <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                     {taskViewMode === 'list' ? (
                        <div className="space-y-1.5">
                           <SortableContext items={sprintTasks.map(t => t.id!.toString())} strategy={verticalListSortingStrategy}>
                              {sprintTasks.map((task, index) => {
                                 const isNextActive = task.status !== 'done' && sprintTasks.slice(0, index).every(t => t.status === 'done');
                                 return <SortableTaskItem key={task.id} task={task} toggleTask={toggleTask} deleteTask={deleteTask} isNextActive={isNextActive} viewMode="list" />;
                              })}
                           </SortableContext>
                           {sprintTasks.length === 0 && (
                              <div className="py-16 text-center border border-dashed border-white/5 rounded-[14px]">
                                 <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/20">Empty</p>
                              </div>
                           )}
                        </div>
                     ) : (
                        <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar min-h-[500px]">
                           <KanbanColumn id="pending" title="Backlog" tasks={sprintTasks.filter(t => t.status === 'pending')} toggleTask={toggleTask} deleteTask={deleteTask} />
                           <KanbanColumn id="active" title="Engaged" tasks={sprintTasks.filter(t => t.status === 'active')} toggleTask={toggleTask} deleteTask={deleteTask} />
                           <KanbanColumn id="done" title="Complete" tasks={sprintTasks.filter(t => t.status === 'done')} toggleTask={toggleTask} deleteTask={deleteTask} />
                        </div>
                     )}
                  </DndContext>
               </div>
            </div>
         </div>
      ) : null}

      {/* ── CREATE MODAL ────────────────────────────────────────── */}
      {creating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
             <div className="w-full max-w-lg bg-[#16181d] rounded-[14px] p-10 border border-primary/20 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="flex justify-between items-center mb-8 relative z-10">
                   <div className="flex items-center gap-3">
                      <Zap size={24} className="text-primary" />
                      <h3 className="font-headline font-black text-2xl text-on-surface uppercase tracking-tight">Initialize Sprint</h3>
                   </div>
                   <button onClick={resetForm} className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-on-surface-variant/40 transition-colors">
                      <Plus size={24} className="rotate-45" />
                   </button>
                </div>

                <div className="space-y-6 relative z-10">
                   <div>
                      <span className="font-headline font-black text-[9px] uppercase tracking-widest text-primary/60 ml-1">Identifier</span>
                      <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="PHASE_ALPHA..." 
                             className="w-full mt-1.5 bg-black/40 rounded-[14px] px-5 py-4 font-headline font-black text-xl text-primary uppercase border border-white/5 outline-none focus:border-primary/40" />
                   </div>

                   <div>
                      <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Objective</span>
                      <input value={sprintObjective} onChange={e => setSprintObjective(e.target.value)} placeholder="MISSION_TARGET..." 
                             className="w-full mt-1.5 bg-black/40 rounded-[14px] px-5 py-4 font-headline font-bold text-xs text-primary uppercase border border-white/5 outline-none" />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Start</span>
                         <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} 
                                className="w-full mt-1.5 bg-black/40 rounded-[14px] px-4 py-3 font-headline font-black text-xs text-primary border border-white/5 outline-none" />
                      </div>
                      <div>
                         <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/40 ml-1">End</span>
                         <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} 
                                className="w-full mt-1.5 bg-black/40 rounded-[14px] px-4 py-3 font-headline font-black text-xs text-primary border border-white/5 outline-none" />
                      </div>
                   </div>

                   <div className="flex gap-4 pt-6">
                      <button onClick={createSprint} className="flex-1 py-4 rounded-[14px] font-headline font-black text-xs uppercase tracking-[0.2em] text-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all" style={{ background: '#00dbe9' }}>Establish</button>
                      <button onClick={resetForm} className="px-8 py-4 rounded-[14px] bg-white/5 font-headline font-black text-xs uppercase tracking-[0.2em] text-on-surface-variant/40 hover:text-on-surface transition-colors border border-white/5">Abort</button>
                   </div>
                </div>
             </div>
          </div>
      )}
    </div>
  );
}

function KanbanColumn({ id, title, tasks, toggleTask, deleteTask }: { id: string, title: string, tasks: Task[], toggleTask: (t: Task)=>void, deleteTask: (id: number)=>void }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div className="flex flex-col w-[300px] shrink-0 bg-black/20 rounded-[14px] border border-white/5 overflow-hidden">
       <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#111318]">
          <span className="font-headline font-black text-[10px] uppercase tracking-widest text-primary/60">{title}</span>
          <span className="bg-primary/10 px-2 py-0.5 rounded text-[9px] font-black text-primary border border-primary/20">{tasks.length}</span>
       </div>
       <div ref={setNodeRef} className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar min-h-[150px]">
         <SortableContext items={tasks.map(t => t.id!.toString())} strategy={verticalListSortingStrategy}>
            {tasks.map(t => <SortableTaskItem key={t.id} task={t} toggleTask={toggleTask} deleteTask={deleteTask} viewMode="kanban" isNextActive={false} />)}
         </SortableContext>
       </div>
    </div>
  )
}

function SortableTaskItem({ task, toggleTask, deleteTask, isNextActive, viewMode }: { task: Task, toggleTask: (t: Task)=>void, deleteTask: (id: number)=>void, isNextActive: boolean, viewMode: 'list' | 'kanban' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id!.toString() });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const priorityColor = PRI_COLORS[task.priority] ?? PRI_COLORS.LOW;

  if (viewMode === 'kanban') {
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}
           className={`p-5 rounded-[14px] border bg-[#1a1c22] shadow-lg group cursor-grab active:cursor-grabbing transition-all ${task.status === 'done' ? 'border-secondary/20 opacity-60' : 'border-white/5 hover:border-primary/40 hover:-translate-y-1 hover:shadow-primary/5'}`}>
         <div className="flex items-center gap-3 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-current" style={{ color: task.status === 'done' ? '#00e475' : '#00dbe9' }} />
            <span className={`font-headline font-bold text-[11px] uppercase tracking-widest truncate ${task.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`}>{task.label}</span>
         </div>
         <div className="flex justify-between items-center mt-4">
            <span className={`text-[7px] rounded-md font-black uppercase tracking-widest px-2 py-0.5 border ${priorityColor}`}>{task.priority}</span>
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={(e) => { e.stopPropagation(); toggleTask(task); }} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-secondary text-black' : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-black'}`}><Check size={12}/></button>
               <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id!); }} className="w-7 h-7 rounded-lg bg-error/10 text-error flex items-center justify-center border border-error/20 hover:bg-error hover:text-white transition-all"><Trash2 size={12}/></button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center justify-between px-6 py-4 rounded-[14px] group transition-all duration-300 relative bg-[#111318] border border-white/5 ${task.status === 'done' ? 'opacity-40 border-dashed' : isNextActive ? 'border-primary/40 bg-primary/5' : 'hover:border-white/20'}`}>
24      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div {...attributes} {...listeners} className="cursor-grab text-on-surface-variant/10 hover:text-primary transition-colors touch-none">
           <GripVertical size={14} />
        </div>
        <div onClick={() => toggleTask(task)} className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${task.status === 'done' ? 'border-secondary bg-secondary' : isNextActive ? 'border-primary shadow-[0_0_8px_rgba(0,219,233,0.4)]' : 'border-white/10 group-hover:border-primary/50'}`}>
          {task.status === 'done' ? <Check size={12} className="text-black" /> : isNextActive ? <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> : null}
        </div>
        <div className={`font-headline font-black text-[11px] uppercase tracking-widest truncate flex items-center gap-2 ${task.status === 'done' ? 'text-on-surface-variant/40 line-through' : isNextActive ? 'text-primary' : 'text-on-surface'}`}>
          {task.label}
          {isNextActive && <span className="text-[6px] px-1.5 py-0.5 rounded bg-primary text-black font-black tracking-widest uppercase">Target</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className={`text-[7px] rounded-md font-black uppercase tracking-widest px-2 py-0.5 border ${priorityColor}`}>{task.priority}</span>
        <button onClick={() => deleteTask(task.id!)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/10 hover:bg-error/10 hover:text-error transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-error/20">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};
