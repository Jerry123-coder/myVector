import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../../lib/DbContext';
import { type Task, type Sprint } from '../../lib/db';
import { nowMs } from '../../lib/time';
import {
  Plus, CheckCircle2, Trash2, Zap, Circle,
  CalendarRange, Play, Check, Clock, Target, Layers, GripVertical
} from 'lucide-react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { useToast } from '../../components/ToastContext';

const PRIORITIES = ['HIGH', 'MED', 'LOW'] as const;
type Priority = typeof PRIORITIES[number];
const PRI_COLORS: Record<Priority, string> = {
  HIGH: 'text-error border-error/30 bg-error/5',
  MED:  'text-tertiary-fixed-dim border-tertiary-fixed-dim/30',
  LOW:  'text-outline border-outline-variant',
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

// ── Days Remaining ───────────────────────────────────────
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
  const [prefillSlot, setPrefillSlot]   = useState<{ start: string; end: string } | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban'>('list');

  const { showToast } = useToast();

  const roadmapRef = useRef<HTMLDivElement>(null);
  const quarterBlocks = buildQuarterBlocks();
  const now = Date.now();

  // Active sprint = earliest active sprint that overlaps today
  const activeSprint = sprints.find(s => s.status === 'active' && s.startDate <= now && s.endDate >= now)
    ?? sprints.find(s => s.status === 'active');

  // Selected sprint for task panel
  const selectedSprint: Sprint | undefined = sprints.find(s => s.id === selectedId) ?? activeSprint ?? sprints[0];

  const sprintTasks = useLiveQuery(
    () => selectedSprint?.id
      ? db.tasks.where('sprintId').equals(selectedSprint.id).toArray().then(a => a.sort((x, y) => (x.order ?? x.createdAt) - (y.order ?? y.createdAt)))
      : Promise.resolve([] as Task[]),
    [selectedSprint?.id, isTestMode]
  ) ?? [];

  const doneTasks = sprintTasks.filter(t => t.status === 'done');
  const progress  = sprintTasks.length ? Math.round((doneTasks.length / sprintTasks.length) * 100) : 0;

  useEffect(() => {
    const el = roadmapRef.current?.querySelector<HTMLElement>('[data-active]');
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [sprints.length]);

  // ── Sprint CRUD ──────────────────────────────────────────
  const createSprint = async () => {
    if (!name || !startDate || !endDate) return;
    const id = await db.sprints.add({
      name: name.toUpperCase(), objective: sprintObjective, quarterlyGoalId: qGoalId,
      startDate: new Date(startDate).getTime(), endDate: new Date(endDate).getTime(),
      status: 'planned', createdAt: nowMs(), updatedAt: Date.now(),
    }) as number;
    setSelectedId(id);
    setName(''); setSprintObjective(''); setStartDate(''); setEndDate(''); setQGoalId(undefined);
    setCreating(false); setPrefillSlot(null);
    showToast('Focus Sprint Initialized', 'success');
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
    showToast('Directive Added', 'success');
  };

  const toggleTask = async (t: Task) => {
    if (!t.id) return;
    const isDone = t.status === 'done';
    await db.tasks.update(t.id, isDone
      ? { status: 'pending', completedAt: undefined, updatedAt: Date.now() }
      : { status: 'done', completedAt: nowMs(), updatedAt: Date.now() });
    if (!isDone) showToast('Directive Synchronized', 'success');
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

  const deleteTask   = async (id?: number) => { if (id) { await db.tasks.delete(id); showToast('Directive Purged', 'info'); } };
  const deleteSprint = async (id?: number) => { if (id) { await db.sprints.delete(id); setSelectedId(undefined); showToast('Sprint Purged', 'info'); } };

  const openCreateWithSlot = (slot: typeof quarterBlocks[0]) => {
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const start = fmt(slot.weekStart); const end = fmt(slot.weekEnd);
    setStartDate(start); setEndDate(end);
    setName(`Q2_SPRINT_0${slot.slot}`);
    setPrefillSlot({ start, end });
    setCreating(true);
  };

  const getSprintForBlock = (block: typeof quarterBlocks[0]) =>
    sprints.find(s => s.startDate <= block.weekEnd.getTime() && s.endDate >= block.weekStart.getTime());

  const isBlockCurrent = (block: typeof quarterBlocks[0]) =>
    block.weekStart.getTime() <= now && block.weekEnd.getTime() >= now;

  const statusLabel: Record<string, string> = { active: 'Active', planned: 'Planned', done: 'Done' };
  const statusColor: Record<string, string> = { active: '#00dbe9', planned: '#b9cacb', done: '#00e475' };

  return (
    <div className="pb-24">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-headline font-black text-2xl text-on-surface uppercase tracking-tight flex items-center gap-2">
            <Zap size={22} className="text-primary" /> Sector_Roadmap
          </h2>
          <p className="font-headline font-black text-[9px] text-on-surface-variant/30 uppercase tracking-[0.3em] mt-1">
            Dynamic_Execution_Engine · 6_tactical_phases_engaged
          </p>
        </div>
        <button onClick={() => setCreating(!creating)}
          className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl font-headline font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all">
          <Plus size={14} /> New Sprint
        </button>
      </div>



      {/* ═══════════════════════════════════════════════════
          ACTIVE PHASE (Redesigned Solid Command Block)
      ═══════════════════════════════════════════════════ */}
      {activeSprint && (
        <div
          className="relative mb-12 rounded-2xl p-8 overflow-hidden shadow-xl border border-white/5 bg-[#0a0c10]"
          style={{
            boxShadow: '0 30px 60px -20px rgba(0,0,0,0.8)',
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <p className="font-headline font-black text-[11px] uppercase tracking-[0.3em] text-primary/60">Phase_Execution_Interface</p>
               </div>
               <div className="flex items-center gap-3 px-4 py-1.5 rounded-lg font-headline font-black text-[10px] uppercase tracking-widest bg-primary/10 border border-primary/20 text-primary shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  Live_Ops
               </div>
            </div>

            <div className="flex items-end justify-between mb-2 gap-6">
               <div className="space-y-1">
                  <h3 className="font-headline font-black text-4xl text-on-surface uppercase tracking-tighter leading-none">
                    {activeSprint.name}
                  </h3>
                  {activeSprint.objective && (
                     <div className="flex items-center gap-2">
                        <Layers size={12} className="text-primary/40" />
                        <span className="font-headline font-black text-[8px] uppercase tracking-[0.2em] text-primary/40 leading-none">{activeSprint.objective}</span>
                     </div>
                  )}
               </div>
               <div className="flex items-center gap-6">
                  <div className="text-center">
                     <p className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/30 mb-1">Efficiency</p>
                     <p className="font-headline font-black text-2xl text-primary tabular-nums leading-none tracking-tighter">
                       {(() => {
                         const sTasks = allTasks.filter(t => t.sprintId === activeSprint.id);
                         const done = sTasks.filter(t => t.status === 'done').length;
                         return sTasks.length ? Math.round((done / sTasks.length) * 100) : 0;
                       })()}%
                     </p>
                  </div>
                  <div className="w-px h-8 bg-white/5" />
                  <div className="text-center">
                     <p className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/30 mb-1">Temporal</p>
                     <p className="font-headline font-black text-2xl text-secondary tabular-nums leading-none tracking-tighter">
                       {daysRemaining(activeSprint.endDate)}D
                     </p>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(0,219,233,0.3)]"
                    style={{ width: `${(() => { const sTasks = allTasks.filter(t => t.sprintId === activeSprint.id); const done = sTasks.filter(t => t.status === 'done').length; return sTasks.length ? Math.round((done / sTasks.length) * 100) : 0; })()}%` }} />
               </div>
               <button onClick={() => setSelectedId(activeSprint.id)}
                 className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-black font-headline font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl group">
                 Engage_Tactical
               </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          12-WEEK ROADMAP
      ═══════════════════════════════════════════════════ */}
      <div className="mb-8">
        <p className="font-body text-[9px] uppercase tracking-widest text-on-surface-variant/40 mb-3 ml-1">
          {currentQuarterStart().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} — Quarter Roadmap
        </p>
        <div ref={roadmapRef} className="overflow-x-auto no-scrollbar pb-2">
          <div className="flex gap-3 min-w-max relative">
            {/* Connector line */}
            <div className="absolute top-10 left-4 right-4 h-px bg-outline-variant/8 z-0" />

            {quarterBlocks.map(block => {
              const sprint      = getSprintForBlock(block);
              const isCurrent   = isBlockCurrent(block);
              const isActive    = sprint?.status === 'active';
              const isDone      = sprint?.status === 'done';
              const spTasks     = sprint ? allTasks.filter(t => t.sprintId === sprint.id) : [];
              const spDone      = spTasks.filter(t => t.status === 'done').length;
              const spPct       = spTasks.length ? Math.round((spDone / spTasks.length) * 100) : 0;
              const isSelected  = sprint?.id === selectedSprint?.id;

              return (
                <button
                  key={block.slot}
                  data-active={isActive || undefined}
                  onClick={() => sprint ? setSelectedId(sprint.id) : openCreateWithSlot(block)}
                  className={`relative flex flex-col w-48 shrink-0 rounded-2xl p-6 text-left transition-all duration-500 border ${
                    isActive
                      ? 'border-primary shadow-lg bg-[#0c1218]'
                      : isDone
                      ? 'border-secondary/20 bg-secondary/[0.03] opacity-60 hover:opacity-100 shadow-md'
                      : sprint && isSelected
                      ? 'border-primary/40 bg-[#161b22] shadow-xl'
                      : sprint
                      ? 'bg-[#11161d] border-white/5 hover:border-white/20'
                      : isCurrent
                      ? 'border-dashed border-primary/40 bg-primary/[0.04] hover:bg-primary/[0.08]'
                      : 'border-dashed border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Slot label */}
                  <span className={`font-headline font-black text-[9px] uppercase tracking-[0.25em] mb-4 ${isActive ? 'text-primary' : isDone ? 'text-secondary/50' : 'text-on-surface-variant/40'}`}>
                    PHASE_{block.slot.toString().padStart(2, '0')}
                    {isActive && (
                      <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse align-middle" />
                    )}
                    {isDone && <Check size={10} className="inline ml-2 text-secondary" />}
                  </span>

                  {sprint ? (
                    <>
                      <span className={`font-headline font-black text-sm uppercase tracking-tight truncate leading-tight mb-2 ${isActive ? 'text-on-surface' : 'text-on-surface-variant/70'}`}>
                        {sprint.name}
                      </span>
                      {/* Status pill */}
                      <div className="flex items-center gap-2 mb-4">
                         <div className="w-1 h-1 rounded-full bg-current" style={{ color: statusColor[sprint.status] }} />
                         <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: statusColor[sprint.status] }}>
                           {statusLabel[sprint.status].replace(' ', '_')}
                         </span>
                      </div>
                      {/* Mini progress */}
                      {spTasks.length > 0 && (
                        <div className="mt-auto">
                          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5 mb-2 shadow-inner">
                            <div className={spPct === 100 ? 'h-full progress-shimmer-green rounded-full' : 'h-full rounded-full transition-all'}
                              style={{ width: `${spPct}%`, background: spPct === 100 ? undefined : statusColor[sprint.status] }} />
                          </div>
                          <span className="font-headline font-black text-[8px] tabular-nums text-on-surface-variant/40">{spPct}% SYNCED</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 min-h-[80px] gap-3">
                      <div className={`w-8 h-8 rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${isCurrent ? 'border-primary/40 text-primary/40' : 'border-white/10 text-white/10'}`}>
                        <Plus size={16} />
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isCurrent ? 'text-primary/40' : 'text-on-surface-variant/20'}`}>RESERVE</span>
                    </div>
                  )}

                  {/* Date range footer */}
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <span className="font-headline font-black text-[8px] text-on-surface-variant/20 uppercase tracking-widest">
                      {block.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {block.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          CREATE SPRINT FORM
      ═══════════════════════════════════════════════════ */}
      {creating && (
        <div className="mb-8 glass-bright rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="sm:col-span-2 flex items-center gap-2 mb-1">
            <CalendarRange size={14} className="text-primary" />
            <span className="font-headline font-black text-sm uppercase tracking-wide text-on-surface">New Sprint</span>
            {prefillSlot && (
              <span className="text-[8px] text-primary/50 font-bold uppercase tracking-widest ml-1">
                · Dates prefilled from slot
              </span>
            )}
          </div>
          {[
            { label: 'Sprint Identifier', el: <input value={name} onChange={e => setName(e.target.value)} placeholder="PHASE_ALPHA..." className="bg-surface-container-highest rounded-xl font-headline font-bold text-sm text-primary uppercase outline-none px-4 py-3 placeholder:text-on-surface-variant/30 border border-outline-variant/10 focus:border-primary/40 transition-colors w-full" /> },
            { label: 'Key Objective', el: <input value={sprintObjective} onChange={e => setSprintObjective(e.target.value)} placeholder="ESTABLISH_MARKET_PRESENCE..." className="bg-surface-container-highest rounded-xl font-headline font-bold text-sm text-primary uppercase outline-none px-4 py-3 placeholder:text-on-surface-variant/30 border border-outline-variant/10 focus:border-primary/40 transition-colors w-full" /> },
            { label: 'Link to Mission', el: (
              <select value={qGoalId ?? ''} onChange={e => setQGoalId(Number(e.target.value) || undefined)} className="bg-surface-container-highest rounded-xl font-headline font-bold text-sm text-primary uppercase outline-none px-4 py-3 border border-outline-variant/10 w-full">
                <option value="">— Standalone —</option>
                {quarterlyGoals.map(g => <option key={g.id} value={g.id}>{g.title.slice(0, 32)}</option>)}
              </select>
            )},
            { label: 'Start Date', el: <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-surface-container-highest rounded-xl font-headline font-bold text-sm text-primary outline-none px-4 py-3 border border-outline-variant/10 focus:border-primary/40 transition-colors w-full" /> },
            { label: 'End Date',   el: <input type="date" value={endDate}   onChange={e => setEndDate(e.target.value)}   className="bg-surface-container-highest rounded-xl font-headline font-bold text-sm text-primary outline-none px-4 py-3 border border-outline-variant/10 focus:border-primary/40 transition-colors w-full" /> },
          ].map(({ label, el }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant ml-1">{label}</span>
              {el}
            </div>
          ))}
          <div className="sm:col-span-2 flex gap-3">
            <button onClick={createSprint} className="px-8 py-3 rounded-xl font-headline font-black text-[11px] uppercase tracking-widest text-black active:scale-95 shadow-[0_0_20px_rgba(0,219,233,0.2)]" style={{ background: '#00dbe9' }}>
              Save Sprint Plan
            </button>
            <button onClick={() => { setCreating(false); setPrefillSlot(null); }} className="px-8 py-3 rounded-xl font-headline font-bold text-[11px] uppercase text-on-surface-variant hover:text-primary transition-colors glass">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          ALL SPRINTS — Full List (click to manage)
      ═══════════════════════════════════════════════════ */}
      {sprints.length === 0 ? (
        <div className="py-12 text-center glass rounded-2xl">
          <Zap size={24} className="text-primary/20 mx-auto mb-3" />
          <div className="font-headline font-bold text-xs text-on-surface-variant/40 uppercase tracking-widest">No sprints yet — click a slot above or press New Sprint</div>
        </div>
      ) : (
        <div className="glass-bright rounded-2xl overflow-hidden">
          {/* Sprint Selector Strip */}
          <div className="flex items-center gap-2 p-4 border-b border-outline-variant/10 overflow-x-auto no-scrollbar">
            <span className="font-body text-[8px] uppercase tracking-widest text-on-surface-variant/30 shrink-0 mr-1">All Sprints</span>
            {sprints.map(s => {
              const isActive = s.status === 'active';
              const isDone   = s.status === 'done';
              const isSelected = selectedSprint?.id === s.id;
              return (
                <button key={s.id} onClick={() => setSelectedId(s.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-headline font-black text-[9px] uppercase tracking-widest transition-all ${
                    isSelected && isActive
                      ? 'bg-primary text-black badge-glow-cyan'
                      : isSelected
                      ? 'glass border border-primary/30 text-primary'
                      : isDone
                      ? 'text-secondary/50 hover:text-secondary border border-transparent hover:border-secondary/20'
                      : 'text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container-highest border border-transparent'
                  }`}>
                  {isActive && <Play size={9} fill="currentColor" />}
                  {isDone && <Check size={9} />}
                  {s.name}
                </button>
              );
            })}
          </div>

          {/* Sprint Detail Panel */}
          {selectedSprint && (
            <div className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Task panel */}
                <div className="lg:col-span-2">
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl glass mb-4">
                    <input value={newTaskLabel} onChange={e => setNewTaskLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTask()}
                      placeholder="Log task into sprint..."
                      className="flex-1 min-w-0 bg-transparent font-body font-medium text-sm text-on-surface placeholder:text-on-surface-variant/30 outline-none px-2" />
                    <div className="flex gap-1 bg-surface-container-lowest p-1 rounded-lg">
                      {PRIORITIES.map(p => (
                        <button key={p} onClick={() => setNewTaskPri(p)}
                          className={`px-2.5 py-1 font-body font-bold text-[8px] rounded uppercase transition-all ${newTaskPri === p ? PRI_COLORS[p] : 'text-on-surface-variant/30 hover:text-on-surface-variant'}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                    <button onClick={addTask} className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                     <div className="font-headline font-bold text-[10px] text-on-surface-variant/40 uppercase tracking-widest">Sprint Execution</div>
                     <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                        <button onClick={() => setTaskViewMode('list')} className={`px-4 py-1.5 rounded text-[9px] uppercase tracking-widest font-black transition-all ${taskViewMode === 'list' ? 'bg-primary text-black' : 'text-on-surface-variant/40 hover:text-on-surface'}`}>List</button>
                        <button onClick={() => setTaskViewMode('kanban')} className={`px-4 py-1.5 rounded text-[9px] uppercase tracking-widest font-black transition-all ${taskViewMode === 'kanban' ? 'bg-primary text-black' : 'text-on-surface-variant/40 hover:text-on-surface'}`}>Kanban</button>
                     </div>
                  </div>

                  <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                    {taskViewMode === 'list' ? (
                      <div className="flex flex-col divide-y divide-outline-variant/5 rounded-xl overflow-hidden glass">
                        {sprintTasks.length === 0 && (
                          <div className="py-10 text-center text-on-surface-variant/30 font-body text-xs uppercase tracking-widest">No tasks yet</div>
                        )}
                        <SortableContext items={sprintTasks.map(t => t.id!.toString())} strategy={verticalListSortingStrategy}>
                          {sprintTasks.map((task, index) => {
                            const isNextActive = task.status !== 'done' && sprintTasks.slice(0, index).every(t => t.status === 'done');
                            return <SortableTaskItem key={task.id} task={task} toggleTask={toggleTask} deleteTask={deleteTask} isNextActive={isNextActive} viewMode="list" />;
                          })}
                        </SortableContext>
                      </div>
                    ) : (
                      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        <KanbanColumn id="pending" title="To Do" tasks={sprintTasks.filter(t => t.status === 'pending')} toggleTask={toggleTask} deleteTask={deleteTask} />
                        <KanbanColumn id="active" title="In Progress" tasks={sprintTasks.filter(t => t.status === 'active')} toggleTask={toggleTask} deleteTask={deleteTask} />
                        <KanbanColumn id="done" title="Done" tasks={sprintTasks.filter(t => t.status === 'done')} toggleTask={toggleTask} deleteTask={deleteTask} />
                      </div>
                    )}
                  </DndContext>
                </div>

                {/* Sprint Info Sidebar */}
                <div className="flex flex-col gap-4">
                  {/* Progress */}
                  <div className="glass rounded-2xl p-5">
                    <div className="flex justify-between items-end mb-3">
                      <span className="font-headline font-black text-[10px] uppercase tracking-widest text-on-surface">Trajectory</span>
                      <span className="font-headline font-black text-3xl tabular-nums leading-none" style={{ color: statusColor[selectedSprint.status] }}>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-highest overflow-hidden rounded-full">
                      <div className={progress === 100 ? 'progress-shimmer-green h-full rounded-full' : 'progress-shimmer h-full rounded-full'} style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-2 text-[9px] text-on-surface-variant/40 font-body uppercase tracking-widest">{doneTasks.length}/{sprintTasks.length} done</div>
                  </div>

                  {/* Date + Goal */}
                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock size={11} className="text-on-surface-variant/40" />
                      <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant/40">Window</span>
                    </div>
                    <p className="font-body text-sm font-semibold text-on-surface">
                      {new Date(selectedSprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <span className="text-primary-fixed-dim/50 mx-2">→</span>
                      {new Date(selectedSprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {selectedSprint.status === 'active' && (
                      <p className="font-body text-[9px] text-primary/60 uppercase tracking-widest mt-1.5">
                        {daysRemaining(selectedSprint.endDate)} days remaining
                      </p>
                    )}
                    {selectedSprint.quarterlyGoalId && (() => {
                      const qg = quarterlyGoals.find(g => g.id === selectedSprint.quarterlyGoalId);
                      return qg ? (
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-outline-variant/8">
                          <Target size={9} className="text-primary-fixed-dim/40 shrink-0" />
                          <p className="font-body text-[8px] text-primary-fixed-dim/60 uppercase tracking-widest truncate">{qg.title}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Status controls */}
                  <div className="flex gap-2">
                    <button onClick={() => deleteSprint(selectedSprint.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl glass text-on-surface-variant/40 hover:text-error hover:border-error/20 font-headline font-bold text-[9px] uppercase tracking-widest transition-all">
                      <Trash2 size={12} /> Delete
                    </button>
                    {selectedSprint.status === 'planned' ? (
                       <button onClick={() => { if (selectedSprint.id) db.sprints.update(selectedSprint.id, { status: 'active', updatedAt: Date.now() }); }}
                         className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-black font-headline font-bold text-[9px] uppercase tracking-widest transition-all">
                         <Play size={12} /> Initialize
                       </button>
                    ) : (
                       <button onClick={() => { if (selectedSprint.id) db.sprints.update(selectedSprint.id, { status: selectedSprint.status === 'done' ? 'active' : 'done', updatedAt: Date.now() }); }}
                         className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-headline font-bold text-[9px] uppercase tracking-widest transition-all ${selectedSprint.status === 'done' ? 'glass text-secondary border-secondary/20' : 'bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20'}`}>
                         <CheckCircle2 size={12} /> {selectedSprint.status === 'done' ? 'Reopen' : 'Complete'}
                       </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ id, title, tasks, toggleTask, deleteTask }: { id: string, title: string, tasks: Task[], toggleTask: (t: Task)=>void, deleteTask: (id: number)=>void }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div className="flex flex-col flex-1 min-w-[250px] bg-black/20 rounded-xl border border-white/5 overflow-hidden">
       <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/40">
          <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/60">{title}</span>
          <span className="bg-white/5 px-2 py-0.5 rounded text-[8px] font-bold text-on-surface-variant/50">{tasks.length}</span>
       </div>
       <div ref={setNodeRef} className="p-2 flex-1 flex flex-col min-h-[150px]">
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

  if (viewMode === 'kanban') {
    return (
      <div ref={setNodeRef} style={style} className={`p-3 rounded-lg border bg-[#1a1c22] shadow-sm mb-2 group ${task.status === 'done' ? 'border-secondary/20 bg-surface-container-lowest/40' : 'border-outline-variant/10 hover:border-primary/40 hover:bg-surface-container-highest/30'} transition-all`}>
         <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
               <div {...attributes} {...listeners} className="cursor-grab text-on-surface-variant/30 hover:text-primary touch-none shrink-0"><GripVertical size={12}/></div>
               <span className={`font-body text-xs font-medium truncate ${task.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`}>{task.label}</span>
            </div>
         </div>
         <div className="flex justify-between items-center mt-2 pl-6">
            <span className={`text-[7px] rounded text-white px-1.5 py-0.5 border ${PRI_COLORS[task.priority]}`}>{task.priority}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => toggleTask(task)} className={`p-1 rounded ${task.status === 'done' ? 'text-secondary hover:bg-secondary/20' : 'text-primary hover:bg-primary/20'}`}><Check size={12}/></button>
               <button onClick={() => deleteTask(task.id!)} className="p-1 rounded text-error/60 hover:bg-error/20"><Trash2 size={12}/></button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center justify-between px-4 py-3.5 group transition-all duration-150 relative bg-[#1a1c22] ${task.status === 'done' ? 'bg-surface-container-lowest/40' : isNextActive ? 'bg-surface-container-highest/60 border-l-2 border-primary' : 'hover:bg-surface-container-highest/30'}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div {...attributes} {...listeners} className="cursor-grab text-on-surface-variant/20 hover:text-primary transition-colors touch-none">
           <GripVertical size={14} />
        </div>
        <div onClick={() => toggleTask(task)} className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${task.status === 'done' ? 'border-secondary bg-secondary/10' : isNextActive ? 'border-primary shadow-[0_0_10px_rgba(0,219,233,0.3)]' : 'border-outline-variant group-hover:border-primary/50'}`}>
          {task.status === 'done' ? <CheckCircle2 size={11} className="text-secondary" /> : isNextActive ? <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> : <Circle size={8} className="text-outline-variant" />}
        </div>
        <div className={`font-body font-medium text-sm truncate flex items-center gap-2 ${task.status === 'done' ? 'text-on-surface-variant/30 line-through' : isNextActive ? 'text-primary' : 'text-on-surface'}`}>
          {task.label}
          {isNextActive && <span className="text-[7px] px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary font-black tracking-widest uppercase">NEXT TARGET</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className={`text-[8px] rounded-lg font-black uppercase tracking-wider px-2 py-0.5 border ${PRI_COLORS[task.priority]}`}>{task.priority}</span>
        <button onClick={() => deleteTask(task.id!)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-outline/20 hover:bg-error/10 hover:text-error transition-colors opacity-0 group-hover:opacity-100">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};
