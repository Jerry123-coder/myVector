import { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../../lib/DbContext';
import { type Task, type Sprint, type FocusSession, type QuarterlyGoal } from '../../lib/db';
import { nowMs } from '../../lib/time';
import {
  Plus, Trash2, Zap,
  CalendarRange, Check, Target, GripVertical, Lock, Play, X
} from 'lucide-react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { useToast } from '../../components/ToastContext';
import type { Route } from '../../App';
import { useTimerStore } from '../../store/timerStore';
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


function CreateSprintModal({ 
  slot, 
  quarterlyGoals, 
  onClose, 
  onSave 
}: { 
  slot: { slot: number, weekStart: Date, weekEnd: Date }, 
  quarterlyGoals: QuarterlyGoal[], 
  onClose: () => void, 
  onSave: (sprint: Partial<Sprint>, tasks: Partial<Task>[]) => void 
}) {
  const [name, setName] = useState(`SPRINT_0${slot.slot}`);
  const [objective, setObjective] = useState('');
  const [qGoalId, setQGoalId] = useState<number | undefined>();
    
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(fmt(slot.weekStart));
  const [endDate, setEndDate] = useState(fmt(slot.weekEnd));

  const [stagedTasks, setStagedTasks] = useState<{label: string, priority: Priority}[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [taskPri, setTaskPri] = useState<Priority>('MED');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    setStagedTasks([...stagedTasks, { label: taskInput.trim().toUpperCase(), priority: taskPri }]);
    setTaskInput('');
  };

  const handleSave = () => {
    onSave({
      name,
      objective,
      startDate: new Date(startDate).getTime(),
      endDate: new Date(endDate).getTime(),
      quarterlyGoalId: qGoalId,
      status: 'planned'
    }, stagedTasks.map(t => ({
      label: t.label,
      priority: t.priority,
      status: 'pending',
      quarterlyGoalId: qGoalId
    })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111318] border border-white/10 rounded-[14px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
             <h2 className="text-xl font-headline font-black uppercase text-on-surface tracking-widest">Plan Sprint {slot.slot}</h2>
             <p className="text-xs text-on-surface-variant/40 uppercase tracking-widest mt-1">Define horizon objective & tasks</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Sprint Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors" />
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Quarterly Goal Link</label>
                <select value={qGoalId || ''} onChange={e => setQGoalId(e.target.value ? Number(e.target.value) : undefined)} className="w-full bg-black/40 border border-white/10 rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none">
                   <option value="">-- No linked goal --</option>
                   {quarterlyGoals.filter(g => g.status === 'active').map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                   ))}
                </select>
             </div>
          </div>

          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Sprint Objective</label>
             <textarea value={objective} onChange={e => setObjective(e.target.value)} rows={3} placeholder="What is the primary objective of this sprint?" className="w-full bg-black/40 border border-white/10 rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]" />
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors [color-scheme:dark]" />
             </div>
          </div>

          {/* Staged Tasks Area */}
          <div className="space-y-4 pt-6 border-t border-white/5">
             <h3 className="text-xs font-black text-on-surface-variant/40 uppercase tracking-widest">Sprint Pipeline ({stagedTasks.length})</h3>
             
             <form onSubmit={handleAddTask} className="flex gap-2">
                <input value={taskInput} onChange={e => setTaskInput(e.target.value)} placeholder="Add a task..." className="flex-1 bg-black/40 border border-white/10 rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors" />
                <select value={taskPri} onChange={e => setTaskPri(e.target.value as Priority)} className="bg-black/40 border border-white/10 rounded-[8px] px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors appearance-none">
                   <option value="HIGH">HIGH</option>
                   <option value="MED">MED</option>
                   <option value="LOW">LOW</option>
                </select>
                <button type="submit" className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-[8px] border border-white/10 text-xs font-black uppercase tracking-widest transition-all">Add</button>
             </form>

             <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 no-scrollbar">
                {stagedTasks.map((t, i) => (
                   <div key={i} className="flex items-center justify-between bg-black/20 border border-white/5 p-2.5 rounded-[6px]">
                      <span className="text-xs font-headline font-semibold text-on-surface">{t.label}</span>
                      <div className="flex items-center gap-2">
                         <span className={`text-[9px] px-1.5 py-0.5 rounded-[2px] font-black uppercase border tracking-wider ${PRI_COLORS[t.priority]}`}>{t.priority}</span>
                         <button onClick={() => setStagedTasks(stagedTasks.filter((_, idx) => idx !== i))} className="text-error/60 hover:text-error transition-colors p-1"><Trash2 size={12} /></button>
                      </div>
                   </div>
                ))}
             </div>
          </div>

        </div>

        <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-black/20">
          <button onClick={onClose} className="px-5 py-2.5 rounded-[8px] border border-white/10 text-white hover:bg-white/5 text-xs font-black uppercase tracking-widest transition-all">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2.5 rounded-[8px] bg-primary text-black hover:bg-[#00c4d1] shadow-[0_0_15px_rgba(0,219,233,0.3)] text-xs font-black uppercase tracking-widest transition-all">Launch Sprint</button>
        </div>
      </div>
    </div>
  );
}


export const SprintsView = ({ setRoute }: { setRoute?: (r: Route) => void }) => {
  const { db, isTestMode } = useDb();
  const sprints        = useLiveQuery(() => db.sprints.orderBy('startDate').toArray(), [isTestMode]) ?? [];
  const quarterlyGoals = useLiveQuery(() => db.quarterlyGoals.toArray(), [isTestMode]) ?? [];
  const allTasks       = useLiveQuery(() => db.tasks.toArray(), [isTestMode]) ?? [];
  const rewards        = useLiveQuery(() => db.rewards.toArray(), [isTestMode]) ?? [];
  const sideQuests     = useLiveQuery(() => db.sideQuests.toArray(), [isTestMode]) ?? [];
  const sessions       = useLiveQuery(() => db.sessions.toArray(), [isTestMode]) ?? [];

  const [creatingSlot, setCreatingSlot] = useState<typeof quarterBlocks[0] | null>(null);

  const [selectedId, setSelectedId]     = useState<number | undefined>();
            const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskPri, setNewTaskPri]     = useState<Priority>('MED');
  const [newTaskStatus, setNewTaskStatus] = useState<Task['status']>('pending');
  const [newTaskQGoalId, setNewTaskQGoalId] = useState<number | undefined>();
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'kanban'>('list');
  const [focusMode, setFocusMode]       = useState(false);
  const [isRoadmapExpanded, setIsRoadmapExpanded] = useState(true);

  const [isCarouselDragging, setIsCarouselDragging] = useState(false);
  const [carouselStartX, setCarouselStartX] = useState(0);
  const [carouselScrollLeft, setCarouselScrollLeft] = useState(0);
  const roadmapRef = useRef<HTMLDivElement>(null);

  const handleCarouselMouseDown = (e: React.MouseEvent) => {
    if (!roadmapRef.current) return;
    setIsCarouselDragging(true);
    setCarouselStartX(e.pageX - roadmapRef.current.offsetLeft);
    setCarouselScrollLeft(roadmapRef.current.scrollLeft);
  };
  const handleCarouselMouseMove = (e: React.MouseEvent) => {
    if (!isCarouselDragging || !roadmapRef.current) return;
    e.preventDefault();
    const x = e.pageX - roadmapRef.current.offsetLeft;
    const walk = (x - carouselStartX) * 2;
    roadmapRef.current.scrollLeft = carouselScrollLeft - walk;
  };
  const handleCarouselMouseUpOrLeave = () => {
    setIsCarouselDragging(false);
  };

  const handleCardClick = (e: React.MouseEvent, onClick: () => void) => {
    if (isCarouselDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const [activeId, setActiveId]         = useState<number | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const { showToast } = useToast();

  const quarterBlocks = buildQuarterBlocks();
  const now = Date.now();

  const activeSprint = sprints.find(s => s.status === 'active' && s.startDate <= now && s.endDate >= now)
    ?? sprints.find(s => s.status === 'active');





  const selectedSprint: Sprint | undefined = sprints.find(s => s.id === selectedId) ?? activeSprint ?? sprints[0];

  const linkedQGoal = useMemo(() => {
    return selectedSprint ? quarterlyGoals.find(qg => qg.id === selectedSprint.quarterlyGoalId) : undefined;
  }, [quarterlyGoals, selectedSprint]);

  const linkedQGoalProgress = useMemo(() => {
    if (!linkedQGoal) return null;
    const qgTasks = allTasks.filter(t => t.quarterlyGoalId === linkedQGoal.id);
    const qgDone = qgTasks.filter(t => t.status === 'done').length;
    const qgQuests = sideQuests.filter(sq => sq.quarterlyGoalId === linkedQGoal.id);

    const taskPct = qgTasks.length ? (qgDone / qgTasks.length) * 100 : 0;
    const questPct = qgQuests.length ? qgQuests.reduce((acc, q) => acc + (q.currentCount / q.targetCount), 0) / qgQuests.length * 100 : 0;
    const overallPct = Math.round((taskPct + (qgQuests.length ? questPct : taskPct)) / (qgQuests.length ? 2 : 1));
    return { title: linkedQGoal.title, pct: overallPct, tasksCount: qgTasks.length, questsCount: qgQuests.length, doneTasksCount: qgDone };
  }, [allTasks, sideQuests, linkedQGoal]);

  const quarterRewardsSecured = useMemo(() => {
    const qStartMs = currentQuarterStart().getTime();
    return rewards.filter(r => r.isUnlocked && r.unlockedAt && r.unlockedAt >= qStartMs).length;
  }, [rewards]);



  // Calculate total hours done for the quarterly goal
  const totalHoursDone = useMemo(() => {
    if (!linkedQGoal) return 0;
    const qgTaskIds = allTasks.filter(t => t.quarterlyGoalId === linkedQGoal.id).map(t => t.id);
    const qgSessions = sessions.filter(s => qgTaskIds.includes(s.taskId));
    const totalSecs = qgSessions.reduce((acc, s) => acc + s.actualSecs, 0);
    return Math.round(totalSecs / 3600);
  }, [sessions, allTasks, linkedQGoal]);

  // Calculate sprints metrics
  const sprintsMetric = useMemo(() => {
    const done = sprints.filter(s => s.status === 'done').length;
    return { done, total: sprints.length };
  }, [sprints]);


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
    const resolvedQGoalId = newTaskQGoalId ?? selectedSprint.quarterlyGoalId;
    const qGoal = quarterlyGoals.find(g => g.id === resolvedQGoalId);
    await db.tasks.add({
      label: newTaskLabel.trim().toUpperCase(), status: newTaskStatus, priority: newTaskPri,
      sprintId: selectedSprint.id, quarterlyGoalId: resolvedQGoalId,
      annualGoalId: qGoal?.annualGoalId, order: sprintTasks.length, createdAt: nowMs(), updatedAt: Date.now(),
    });
    setNewTaskLabel('');
    setNewTaskStatus('pending');
    setNewTaskQGoalId(undefined);
    showToast('Task Added', 'success');
  };

  const startFocus = (t: Task) => {
    useTimerStore.getState().setActiveTask({ id: t.id!, label: t.label, isDaily: false });
    if (setRoute) setRoute('timer');
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
  
  const handleCreateSprint = async (sprintData: Partial<Sprint>, tasks: Partial<Task>[]) => {
    const sprintId = await db.sprints.add({ ...sprintData, createdAt: nowMs(), updatedAt: Date.now() } as Sprint);
    if (tasks.length > 0) {
      const dbTasks = tasks.map((t, i) => ({
        ...t,
        sprintId,
        order: i,
        createdAt: nowMs(),
        updatedAt: Date.now()
      })) as Task[];
      await db.tasks.bulkAdd(dbTasks);
    }
    setCreatingSlot(null);
    showToast('Sprint Launched', 'success');
  };

  const deleteSprint = async (id?: number) => { if (id) { await db.sprints.delete(id); setSelectedId(undefined); showToast('Sprint Deleted', 'info'); } };

  const openCreateWithSlot = (slot: typeof quarterBlocks[0]) => {
    setCreatingSlot(slot);
  };

  const statusColor: Record<string, string> = { active: '#00dbe9', planned: '#646464', done: '#00e475' };

  return (
    <div className="pb-24 max-w-7xl mx-auto px-4">
      
      <StatusRibbon />

      {/* ── ROADMAP STRIP TOGGLE ─────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-4 mt-8">
         <h2 className="font-headline font-black text-sm uppercase tracking-widest text-on-surface-variant/50">Roadmap Overview</h2>
         <button 
            onClick={() => setIsRoadmapExpanded(!isRoadmapExpanded)}
            className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 hover:text-primary transition-colors flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full"
         >
            {isRoadmapExpanded ? 'Hide Roadmap' : 'Show Roadmap'}
         </button>
      </div>


      {creatingSlot && (
         <CreateSprintModal
            slot={creatingSlot}
            quarterlyGoals={quarterlyGoals}
            onClose={() => setCreatingSlot(null)}
            onSave={handleCreateSprint}
         />
      )}

      {isRoadmapExpanded && (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Column 1: Quarter Progress details (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-[#0f1115]/80 backdrop-blur-md p-6 rounded-[14px] border border-white/5 flex flex-col justify-between min-h-[250px] relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Top Row: Left: Title info, Right: Progress Circle */}
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0 flex-1 flex flex-col justify-start pt-1">
                <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.25em] block mb-1.5">
                   Q{Math.floor(new Date().getMonth() / 3) + 1} Horizon
                </span>
                <h3 className="font-headline font-black text-[18px] text-on-surface uppercase tracking-tight line-clamp-1 mb-1.5">
                   {linkedQGoalProgress?.title || 'No Active Goal'}
                </h3>
                <div className="mt-2 flex-1 overflow-y-auto pr-2 no-scrollbar space-y-1.5">
                   {linkedQGoal?.description ? (
                      linkedQGoal.description.split('\n').filter(Boolean).map((line, idx) => (
                         <div key={idx} className="flex items-start gap-2">
                            <div className="mt-[6px] shrink-0 w-1.5 h-1.5 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(0,219,233,0.3)]" />
                            <span className="text-[13px] font-medium text-on-surface-variant/70 leading-snug">
                               {line}
                            </span>
                         </div>
                      ))
                   ) : (
                      <p className="text-[13px] font-medium text-on-surface-variant/50 leading-relaxed italic">
                         No strategic directive established for the current operational window.
                      </p>
                   )}
                </div>
              </div>

              {/* Progress Circle Top Right */}
              <div className="shrink-0 flex items-center justify-center">
                {(() => {
                  const pct = linkedQGoalProgress?.pct ?? 0;
                  const radius = 38;
                  const stroke = 4.5;
                  const normalizedRadius = radius - stroke * 2;
                  const circumference = normalizedRadius * 2 * Math.PI;
                  const strokeDashoffset = circumference - (pct / 100) * circumference;
                  return (
                    <div className="relative flex flex-col items-center justify-center bg-black/40 rounded-full p-1 border border-white/5">
                      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
                        <circle
                          stroke="rgba(255,255,255,0.03)"
                          fill="transparent"
                          strokeWidth={stroke}
                          r={normalizedRadius}
                          cx={radius}
                          cy={radius}
                        />
                        <circle
                          stroke="#00dbe9"
                          fill="transparent"
                          strokeWidth={stroke}
                          strokeDasharray={`${circumference} ${circumference}`}
                          style={{ strokeDashoffset }}
                          r={normalizedRadius}
                          cx={radius}
                          cy={radius}
                          className="transition-all duration-1000 ease-out shadow-[0_0_8px_#00dbe9]"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center leading-none">
                        <span className="text-xs font-headline font-black text-primary tabular-nums">{pct}%</span>
                        <span className="text-[11px] font-black text-on-surface-variant/40 lowercase tracking-widest mt-0.5">done</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Bottom List Content */}
            <div className="space-y-2 pt-4 border-t border-white/5 mt-3 font-headline">
              <div className="flex items-center justify-between text-[11px] font-black tracking-wider text-on-surface-variant/40">
                <span className="lowercase">total tasks completed:</span>
                <span className="text-on-surface font-black tabular-nums">
                  {linkedQGoalProgress ? `${linkedQGoalProgress.doneTasksCount}/${linkedQGoalProgress.tasksCount}` : '0/0'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-black tracking-wider text-on-surface-variant/40">
                <span className="lowercase">total hours done:</span>
                <span className="text-primary font-black tabular-nums">{totalHoursDone}hrs</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-black tracking-wider text-on-surface-variant/40">
                <span className="lowercase">rewards secured:</span>
                <span className="text-[#ffba38] font-black tabular-nums">
                  {quarterRewardsSecured.toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-black tracking-wider text-on-surface-variant/40">
                <span className="lowercase">sprints:</span>
                <span className="text-secondary font-black tabular-nums">{sprintsMetric.done}/6</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Sprint Cards Pipeline (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-5 px-1">
             <div className="flex items-center gap-4">
                <h2 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight flex items-center gap-3">
                   <CalendarRange size={20} className="text-primary" /> Sprint Pipeline
                </h2>
                <div className="h-px w-16 bg-white/5" />
                <span className="text-[11px] font-black text-on-surface-variant/20 uppercase tracking-[0.3em]">Execution Workflow</span>
             </div>
             {activeSprint && (
                <button onClick={() => setSelectedId(activeSprint.id)} 
                        className="px-4 py-1.5 rounded-[14px] bg-primary/5 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all">
                   Jump_To_Live
                </button>
             )}
          </div>

          <div 
             ref={roadmapRef}
             onMouseDown={handleCarouselMouseDown}
             onMouseMove={handleCarouselMouseMove}
             onMouseUp={handleCarouselMouseUpOrLeave}
             onMouseLeave={handleCarouselMouseUpOrLeave}
             className={`overflow-x-auto no-scrollbar pb-6 select-none ${isCarouselDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
             <div className="flex gap-3 min-w-max px-1">
                {quarterBlocks.map((block) => {
                   const sprint = sprints.find(s => s.startDate <= block.weekEnd.getTime() && s.endDate >= block.weekStart.getTime());
                   const isCurrent = block.weekStart.getTime() <= now && block.weekEnd.getTime() >= now;
                   const isActive = sprint?.status === 'active';
                   const isSelected = selectedSprint?.id === sprint?.id || (!sprint && selectedId === undefined && isCurrent);
                   const isPast = block.weekEnd.getTime() < now && !isActive;
                   const isFuture = block.weekStart.getTime() > now && !isActive;
                   
                   return (
                      <button key={block.slot} 
                              data-active={isCurrent ? "true" : undefined}
                              disabled={isFuture && !sprint}
                              onClick={(e) => handleCardClick(e, () => {
                                 if (sprint) {
                                    setSelectedId(sprint.id);
                                 } else {
                                    openCreateWithSlot(block);
                                 }
                              })}
                              className={`group relative w-[240px] p-5 rounded-[14px] border transition-all duration-500 text-left flex flex-col justify-between shrink-0 h-[250px] pointer-events-auto overflow-hidden ${
                                 isActive 
                                    ? 'bg-[#1a1c22] border-primary shadow-[0_0_25px_rgba(0,219,233,0.3)] ring-2 ring-primary/20 scale-[1.02] z-10' 
                                    : isSelected && sprint 
                                    ? 'bg-[#1e2026] border-primary/40 font-bold' 
                                    : isPast 
                                    ? 'bg-[#090b0e] border-white/5 opacity-30 hover:opacity-50 grayscale' 
                                    : isFuture 
                                    ? 'bg-[#06080b]/50 border-white/5 opacity-40 cursor-not-allowed' 
                                    : sprint 
                                    ? 'bg-[#111318] border-white/10 hover:border-white/20' 
                                    : isCurrent 
                                    ? 'bg-primary/5 border-dashed border-primary/30 border-2 hover:bg-primary/10' 
                                    : 'bg-[#0a0c10] border-dashed border-white/5 opacity-40 hover:opacity-100 hover:border-white/10'
                              }`}
                      >
                         {isActive && <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-[14px] pointer-events-none" />}
                         <div className="relative z-10 flex flex-col flex-1 w-full h-full justify-between">
                            {isFuture && !sprint ? (
                                <>
                                   <div className="flex items-center justify-between mb-3">
                                      <span className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                                         Sprint {block.slot}
                                      </span>
                                   </div>
                                   <div className="flex flex-col items-center justify-center flex-1 text-on-surface-variant/20 min-h-[100px]">
                                      <Lock size={16} className="text-on-surface-variant/30 mb-1" />
                                      <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Locked</span>
                                   </div>
                                </>
                             ) : sprint ? (
                                <>
                                    <div className="flex justify-between items-start mb-auto">
                                       <div className="min-w-0 flex-1 pr-14">
                                          <div className="flex items-center gap-2 mb-1">
                                             <span className={`text-[13px] font-black uppercase tracking-[0.25em] ${isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(0,219,233,0.3)]' : 'text-on-surface-variant/40'}`}>
                                                Sprint {block.slot}
                                             </span>
                                             {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#00dbe9] animate-pulse" />}
                                          </div>
                                          <div className="">
                                             <span className="text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em] block">Objective</span>
                                             <p className="text-[14px] uppercase font-headline font-semibold text-on-surface/90 line-clamp-3 leading-relaxed">
                                                {sprint.objective || 'No objective specified.'}
                                             </p>
                                          </div>
                                       </div>
                                     
                                       {/* Sprint score circle */}
                                       {(() => {
                                          const tasks = allTasks.filter(t => t.sprintId === sprint.id);
                                          const done = tasks.filter(t => t.status === 'done').length;
                                          const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
                                          const radius = 26;
                                          const stroke = 3;
                                          const normalizedRadius = radius - stroke * 2;
                                          const circumference = normalizedRadius * 2 * Math.PI;
                                          const strokeDashoffset = circumference - (pct / 100) * circumference;
                                          return (
                                             <div className="absolute -top-[5px] -right-[5px] flex flex-col items-center justify-center shrink-0 z-20">
                                                <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
                                                   <circle
                                                      stroke="rgba(255,255,255,0.05)"
                                                      fill="transparent"
                                                      strokeWidth={stroke}
                                                      r={normalizedRadius}
                                                      cx={radius}
                                                      cy={radius}
                                                   />
                                                   <circle
                                                      stroke={statusColor[sprint.status] || '#00dbe9'}
                                                      fill="transparent"
                                                      strokeWidth={stroke}
                                                      strokeDasharray={`${circumference} ${circumference}`}
                                                      style={{ strokeDashoffset }}
                                                      r={normalizedRadius}
                                                      cx={radius}
                                                      cy={radius}
                                                      className="transition-all duration-1000 ease-out"
                                                   />
                                                </svg>
                                                <div className="absolute flex flex-col items-center justify-center leading-none">
                                                   <span className="text-[11px] font-headline font-black text-on-surface tabular-nums">{pct}%</span>
                                                </div>
                                                {/* <span className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-[0.1em] mt-2 whitespace-nowrap">Score</span> */}
                                             </div>
                                          );
                                       })()}
                                    </div>

                                   {(() => {
                                      const tasks = allTasks.filter(t => t.sprintId === sprint.id);
                                      const done = tasks.filter(t => t.status === 'done').length;
                                      const tIds = tasks.map(t => t.id);
                                      const sSessions = sessions.filter(s => tIds.includes(s.taskId));
                                      const sSecs = sSessions.reduce((acc, s) => acc + s.actualSecs, 0);
                                      const sHrs = Math.round(sSecs / 3600);
                                      const startFmt = new Date(sprint.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                      const endFmt = new Date(sprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                      return (
                                         <div className="space-y-1 mt-6 pt-4 border-t border-white/5 w-full">
                                            <div className="flex justify-between items-center">
                                               <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.15em]">Tasks Completed</span>
                                               <span className="text-[11px] text-on-surface font-black tabular-nums">{done}/{tasks.length}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                               <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.15em]">Focus Hours</span>
                                               <span className="text-[11px] text-on-surface font-black tabular-nums">{sHrs}h</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 mt-1 border-t border-white/[0.02]">
                                               <span className="text-[9px] font-black text-primary/40 uppercase tracking-[0.2em]">{startFmt} — {endFmt}</span>
                                            </div>
                                         </div>
                                      );
                                   })()}
                                </>
                             ) : (
                                <div className="flex flex-col items-center justify-center flex-1 text-on-surface-variant/10 group-hover:text-primary/40 transition-all duration-300 w-full h-full">
                                   <Plus size={16} strokeWidth={3} />
                                   <span className="text-[11px] font-black lowercase tracking-widest opacity-60 mt-2">establish sprint</span>
                                </div>
                             )}
                          </div>

                      </button>
                   );
                })}
             </div>
          </div>
        </div>
        </div>
      )}

      {/* ── TACTICAL COMMAND CENTER ─────────────────────────────── */}
      {selectedSprint ? (
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0f1115]/20 border border-white/5 rounded-[14px] overflow-hidden">
               {/* TOP HEADER / STATUS */}
               <div className="p-6 md:p-8 border-b border-white/5 relative overflow-hidden bg-black/20">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                  
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                     {/* Left side: Current Sprint and Sprint Goal */}
                     <div className="space-y-2">
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-headline font-bold text-on-surface-variant/40 tracking-wider block lowercase">
                              current sprint / {selectedSprint.name}
                           </span>
                           <span className={`px-1.5 py-0.5 rounded-[2px] bg-white/5 border border-white/5 text-[11px] font-headline font-bold uppercase tracking-wider ${selectedSprint.status === 'active' ? 'text-primary border-primary/20 bg-primary/5' : 'text-on-surface-variant/50'}`}>
                              {selectedSprint.status}
                           </span>
                        </div>
                        <h2 className="font-headline font-black text-base text-on-surface-variant/90 tracking-wide uppercase">
                           {selectedSprint.objective || 'No goal set'}
                        </h2>
                     </div>
                     
                     {/* Right side: Sprint Completion progress bar, days left and toggle switcher */}
                     <div className="space-y-4">
                        <div className="space-y-1.5">
                           <div className="flex justify-between items-end">
                              <span className="text-xs font-headline font-bold text-on-surface-variant/40 tracking-wider block lowercase">sprint completion</span>
                              <span className="text-xs font-semibold text-primary tabular-nums">{progress}%</span>
                           </div>
                           <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-700 shadow-[0_0_8px_rgba(0,219,233,0.3)]" style={{ width: `${progress}%` }} />
                           </div>
                        </div>
                        
                        <div className="flex justify-between items-center gap-4">
                           {/* Days left and Action buttons */}
                           <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-secondary lowercase">
                                 {daysRemaining(selectedSprint.endDate)} days left
                              </span>
                              
                              {/* Status action */}
                              {selectedSprint.status === 'planned' ? (
                                 <button onClick={() => db.sprints.update(selectedSprint.id!, { status: 'active', updatedAt: Date.now() })}
                                         className="px-2.5 py-0.5 rounded-[3px] bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-black transition-all">
                                    initialize
                                 </button>
                              ) : (
                                 <button onClick={() => db.sprints.update(selectedSprint.id!, { status: selectedSprint.status === 'done' ? 'active' : 'done', updatedAt: Date.now() })}
                                         className={`px-2.5 py-0.5 rounded-[3px] text-xs font-bold uppercase tracking-wider transition-all ${selectedSprint.status === 'done' ? 'bg-secondary/15 border border-secondary/30 text-secondary' : 'bg-secondary text-black hover:scale-[1.02]'}`}>
                                    {selectedSprint.status === 'done' ? 'reopen' : 'complete'}
                                 </button>
                              )}
                              
                              <button onClick={() => deleteSprint(selectedSprint.id)}
                                      className="px-2.5 py-0.5 rounded-[3px] bg-error/15 border border-error/30 text-error text-xs font-bold uppercase tracking-wider hover:bg-error hover:text-white transition-all">
                                 purge
                              </button>
                           </div>
                           
                           {/* list | kanban switcher */}
                           <div className="flex bg-black/60 p-0.5 rounded-[4px] border border-white/5">
                              <button 
                                 onClick={() => setTaskViewMode('list')} 
                                 className={`px-3 py-1.5 rounded-[3px] text-[11px] font-bold lowercase transition-all ${taskViewMode === 'list' ? 'bg-primary text-black' : 'text-on-surface-variant/50 hover:text-on-surface'}`}
                              >
                                 list
                              </button>
                              <button 
                                 onClick={() => setTaskViewMode('kanban')} 
                                 className={`px-3 py-1.5 rounded-[3px] text-[11px] font-bold lowercase transition-all ${taskViewMode === 'kanban' ? 'bg-primary text-black' : 'text-on-surface-variant/50 hover:text-on-surface'}`}
                              >
                                 kanban
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* TASK CONTROL AREA */}
               <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                     <div className="flex items-center gap-3">
                        <h3 className="font-headline font-black text-xs text-on-surface/40 uppercase tracking-[0.2em]">sprint backlog</h3>
                        
                        {/* Filter Buttons */}
                        <button 
                           onClick={() => setFocusMode(!focusMode)}
                           className={`px-3 py-1 rounded-full border text-xs font-headline font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${focusMode ? 'bg-primary border-primary text-black font-black' : 'bg-[#242730] border-white/5 text-on-surface-variant/60 hover:text-on-surface'}`}
                        >
                           {focusMode ? 'focus on' : 'filter focus'}
                        </button>
                        
                        <button className="px-3 py-1 rounded-full border text-xs font-headline font-bold uppercase tracking-wider bg-[#242730] border-white/5 text-on-surface-variant/40 hover:text-on-surface">
                           all priorities
                        </button>
                     </div>
                     {!isAddingTask ? (
                        <button 
                           onClick={() => setIsAddingTask(true)} 
                           className="w-7 h-7 rounded-[4px] bg-[#242730] border border-white/5 hover:border-primary/30 hover:text-primary flex items-center justify-center transition-all cursor-pointer shrink-0"
                           title="Add Task Directive"
                        >
                           <Plus size={14} />
                        </button>
                     ) : (
                        <div className="flex items-center gap-2 bg-[#242730] border border-white/5 rounded-[6px] p-1 shadow-inner max-w-md w-full animate-in fade-in slide-in-from-right-2 duration-200">
                           <div className="flex gap-0.5 p-0.5 bg-black/60 rounded-[4px] border border-white/5">
                              {PRIORITIES.map(p => (
                                 <button key={p} type="button" onClick={() => setNewTaskPri(p)}
                                         className={`px-2 py-1 rounded-[3px] text-xs font-headline font-black uppercase tracking-[0.1em] transition-all ${newTaskPri === p ? PRI_COLORS[p] : 'text-on-surface-variant/20 hover:text-on-surface-variant'}`}>
                                    {p[0]}
                                 </button>
                              ))}
                           </div>
                           <input 
                              autoFocus
                              value={newTaskLabel} 
                              onChange={e => setNewTaskLabel(e.target.value)} 
                              onKeyDown={async (e) => {
                                 if (e.key === 'Enter') {
                                    await addTask();
                                    setIsAddingTask(false);
                                 }
                              }}
                              placeholder="Directive identifier..."
                              className="flex-1 bg-transparent border-none outline-none font-headline font-black text-xs text-primary placeholder:text-on-surface-variant/15 px-2 uppercase tracking-wider min-w-0" 
                           />
                           <button 
                              onClick={async () => {
                                 await addTask();
                                 setIsAddingTask(false);
                              }} 
                              className="w-7 h-7 rounded-[4px] bg-primary text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
                           >
                              <Check size={12} />
                           </button>
                           <button 
                              onClick={() => {
                                 setNewTaskLabel('');
                                 setIsAddingTask(false);
                              }} 
                              className="text-xs font-headline font-black text-on-surface-variant/40 hover:text-error uppercase tracking-wider px-1 cursor-pointer shrink-0"
                           >
                              Cancel
                           </button>
                        </div>
                     )}
                  </div>


                    <DndContext 
                      sensors={sensors} 
                      collisionDetection={closestCorners} 
                      onDragStart={(e) => setActiveId(Number(e.active.id))}
                      onDragEnd={handleDragEnd}
                    >
                       {taskViewMode === 'list' ? (
                          <div className="space-y-1.5">
                             <SortableContext items={displayTasks.map(t => t.id!.toString())} strategy={verticalListSortingStrategy}>
                                {displayTasks.map((task, index) => {
                                   const isNextActive = task.status !== 'done' && displayTasks.slice(0, index).every(t => t.status === 'done');
                                   const tSessions = sessions.filter(s => s.taskId === task.id);
                                   const tSecs = tSessions.reduce((acc, s) => acc + s.actualSecs, 0);
                                   const hoursStr = tSecs > 0 ? `${(tSecs / 3600).toFixed(1)} hrs` : '0.0 hrs';
                                   const qg = quarterlyGoals.find(g => g.id === task.quarterlyGoalId);
                                   const tagStr = qg ? qg.title : undefined;
                                   return (
                                      <SortableTaskItem 
                                         key={task.id} 
                                         task={task} 
                                         toggleTask={toggleTask} 
                                         deleteTask={deleteTask} 
                                         isNextActive={isNextActive} 
                                         viewMode="list" 
                                         hoursSpent={hoursStr}
                                         goalTag={tagStr}
                                         toggleFocus={toggleFocus}
                                         startFocus={startFocus}
                                      />
                                   );
                                })}
                             </SortableContext>
                             {displayTasks.length === 0 && (
                                <div className="py-16 text-center border border-dashed border-white/5 rounded-[14px]">
                                   <p className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/20">Empty</p>
                                 </div>
                             )}
                          </div>
                       ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-4 min-h-[500px]">
                             <KanbanColumn id="pending" title="to do" tasks={displayTasks.filter(t => t.status === 'pending')} toggleTask={toggleTask} deleteTask={deleteTask} sessions={sessions} quarterlyGoals={quarterlyGoals} toggleFocus={toggleFocus} startFocus={startFocus} />
                             <KanbanColumn id="active" title="in progress" tasks={displayTasks.filter(t => t.status === 'active')} toggleTask={toggleTask} deleteTask={deleteTask} sessions={sessions} quarterlyGoals={quarterlyGoals} toggleFocus={toggleFocus} startFocus={startFocus} />
                             <KanbanColumn id="done" title="done" tasks={displayTasks.filter(t => t.status === 'done')} toggleTask={toggleTask} deleteTask={deleteTask} sessions={sessions} quarterlyGoals={quarterlyGoals} toggleFocus={toggleFocus} startFocus={startFocus} />
                          </div>
                       )}
                       
                       <DragOverlay>
                          {activeId ? (() => {
                             const activeTask = sprintTasks.find(t => t.id === activeId);
                             if (!activeTask) return null;
                             const tSessions = sessions.filter(s => s.taskId === activeId);
                             const tSecs = tSessions.reduce((acc, s) => acc + s.actualSecs, 0);
                             const hoursStr = tSecs > 0 ? `${(tSecs / 3600).toFixed(1)} hrs` : '0.0 hrs';
                             const qg = quarterlyGoals.find(g => g.id === activeTask.quarterlyGoalId);
                             const tagStr = qg ? qg.title : undefined;
                             return (
                                <div className="w-[300px]">
                                   <TaskItem 
                                      task={activeTask}
                                      toggleTask={toggleTask}
                                      deleteTask={deleteTask}
                                      isNextActive={false}
                                      viewMode={taskViewMode}
                                      hoursSpent={hoursStr}
                                      goalTag={tagStr}
                                      isOverlay
                                      toggleFocus={toggleFocus}
                                   />
                                </div>
                             );
                          })() : null}
                       </DragOverlay>
                    </DndContext>
                </div>
             </div>
          </div>
      ) : null}


    </div>
  );
}

function KanbanColumn({ id, title, tasks, toggleTask, deleteTask, sessions, quarterlyGoals, toggleFocus, startFocus }: { id: string, title: string, tasks: Task[], toggleTask: (t: Task)=>void, deleteTask: (id: number)=>void, sessions: FocusSession[], quarterlyGoals: QuarterlyGoal[], toggleFocus: (t: Task)=>void, startFocus?: (t: Task)=>void }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div className="flex flex-col w-full bg-[#111318]/40 border border-white/5 rounded-[8px] overflow-hidden">
       <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1a1c22]/40 backdrop-blur-md">
          <span className="font-headline font-black text-[11px] uppercase tracking-[0.35em] text-primary/60">{title.toLowerCase()}</span>
          <span className="bg-primary/10 px-2 py-0.5 rounded-[2px] text-xs font-headline font-black text-primary border border-primary/20">{tasks.length}</span>
       </div>
       <div ref={setNodeRef} className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto no-scrollbar min-h-[150px]">
          <SortableContext items={tasks.map(t => t.id!.toString())} strategy={verticalListSortingStrategy}>
            {tasks.map(t => {
               const tSessions = sessions.filter(s => s.taskId === t.id);
               const tSecs = tSessions.reduce((acc, s) => acc + s.actualSecs, 0);
               const hoursStr = tSecs > 0 ? `${(tSecs / 3600).toFixed(1)} hrs` : '0.0 hrs';

               const qg = quarterlyGoals.find(g => g.id === t.quarterlyGoalId);
               const tagStr = qg ? qg.title : undefined;

               return (
                  <SortableTaskItem 
                     key={t.id} 
                     task={t} 
                     toggleTask={toggleTask} 
                     deleteTask={deleteTask} 
                     viewMode="kanban" 
                     isNextActive={false} 
                     hoursSpent={hoursStr}
                     goalTag={tagStr}
                     toggleFocus={toggleFocus} startFocus={startFocus}
                  />
               );
            })}
          </SortableContext>
       </div>
    </div>
  )
}

function TaskItem({
  task,
  toggleTask,
  deleteTask,
  isNextActive,
  viewMode,
  hoursSpent,
  goalTag,
  dragHandleProps,
  innerRef,
  style,
  isOverlay,
  toggleFocus,
  startFocus,
}: {
  task: Task;
  toggleTask: (t: Task) => void;
  deleteTask: (id: number) => void;
  isNextActive: boolean;
  viewMode: 'list' | 'kanban';
  hoursSpent: string;
  goalTag?: string;
  dragHandleProps?: any;
  innerRef?: any;
  style?: any;
  isOverlay?: boolean;
  toggleFocus?: (t: Task) => void;
  startFocus?: (t: Task) => void;
}) {
  const priorityColor = PRI_COLORS[task.priority] ?? PRI_COLORS.LOW;

  if (viewMode === 'kanban') {
    return (
      <div ref={innerRef} style={style}
           className={`p-3.5 rounded-[6px] border bg-[#1a1c22]/50 shadow-md group transition-all relative ${isOverlay ? 'border-primary/60 scale-[1.02] shadow-primary/10 bg-[#1a1c22]' : 'border-white/5 hover:border-primary/30 hover:bg-[#1a1c22]/70'} ${task.status === 'done' ? 'border-secondary/20 opacity-60 bg-[#111318]/20' : ''}`}>
        
        {/* Top row: Grip handle, Check toggle, Label, and Hours spent */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
             <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-on-surface-variant/20 hover:text-primary transition-colors touch-none py-0.5 flex-shrink-0">
                <GripVertical size={12} />
             </div>
             <button onClick={() => toggleTask(task)} className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center border transition-all cursor-pointer ${task.status === 'done' ? 'border-secondary bg-secondary' : 'border-white/20 group-hover:border-primary/50'}`}>
                {task.status === 'done' ? <Check size={8} className="text-black" /> : null}
             </button>
             <span className={`font-headline font-black text-xs uppercase tracking-[0.2em] truncate ${task.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface'}`} title={task.label}>
                {task.label}
             </span>
          </div>
          <span className="text-xs font-headline font-black text-on-surface-variant/40 uppercase tracking-[0.15em] tabular-nums mt-0.5 shrink-0">
             {hoursSpent}
          </span>
        </div>

        {/* Bottom row: Goal tag and Priority + buttons on hover */}
        <div className="flex justify-between items-center gap-2 mt-4 pt-3 border-t border-white/5">
          {goalTag ? (
             <span className="text-[11px] font-headline font-black text-primary/60 uppercase tracking-[0.2em] bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded-[2px] truncate max-w-[120px]" title={goalTag}>
                {goalTag}
             </span>
          ) : (
             <div />
          )}

          <div className="flex items-center gap-1.5">
             {/* Start Focus button */}
             <button onClick={(e) => { e.stopPropagation(); startFocus?.(task); }}
                     className="w-6 h-6 rounded-[2px] bg-primary/10 text-primary flex items-center justify-center border border-primary/20 hover:bg-primary hover:text-black hover:border-primary transition-all opacity-0 group-hover:opacity-100" title="Start Focus Timer">
                <Play size={10} fill="currentColor" />
             </button>

             {/* Target Focus button */}
             <button onClick={(e) => { e.stopPropagation(); toggleFocus?.(task); }}
                     className={`w-6 h-6 rounded-[2px] flex items-center justify-center transition-all border ${task.dailyFocus ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(0,219,233,0.3)] animate-pulse' : 'bg-[#242730] border-transparent text-on-surface-variant/30 hover:border-white/10 hover:text-on-surface opacity-0 group-hover:opacity-100'}`}>
                <Target size={10} />
             </button>
             
             {/* Priority indicator */}
             <span className={`text-[11px] rounded-[2px] font-black uppercase tracking-[0.25em] px-2 py-0.5 border ${priorityColor}`}>{task.priority}</span>
             
             {/* Delete button (hover only) */}
             <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id!); }}
                     className="w-6 h-6 rounded-[2px] bg-error/10 text-error flex items-center justify-center border border-error/20 hover:bg-error hover:text-white transition-all opacity-0 group-hover:opacity-100">
                <Trash2 size={10} />
             </button>
          </div>
        </div>
     </div>
    );
  }

  return (
    <div ref={innerRef} style={style} className={`flex items-center justify-between px-4 py-3 rounded-[6px] group transition-all duration-300 relative bg-[#111318]/30 border border-white/5 ${task.status === 'done' ? 'opacity-40 border-dashed bg-[#111318]/10' : isNextActive ? 'border-primary/40 bg-primary/5' : 'hover:border-white/10'} ${isOverlay ? 'scale-[1.01] border-primary/60 shadow-lg bg-[#111318]' : ''}`}>
      {/* Left side: Grip, Check, Task Label + Goal tag below it */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div {...dragHandleProps} className="cursor-grab text-on-surface-variant/10 hover:text-primary transition-colors touch-none">
           <GripVertical size={12} />
        </div>
        <div onClick={() => toggleTask(task)} className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all cursor-pointer ${task.status === 'done' ? 'border-secondary bg-secondary' : isNextActive ? 'border-primary shadow-[0_0_8px_rgba(0,219,233,0.4)]' : 'border-white/10 group-hover:border-primary/50'}`}>
          {task.status === 'done' ? <Check size={10} className="text-black" /> : isNextActive ? <div className="w-1 h-1 rounded-full bg-primary animate-pulse" /> : null}
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className={`font-headline font-black text-xs uppercase tracking-[0.2em] truncate flex items-center gap-2 ${task.status === 'done' ? 'text-on-surface-variant/40 line-through' : isNextActive ? 'text-primary' : 'text-on-surface'}`}>
            {task.label}
            {isNextActive && <span className="text-[6px] px-1.5 py-0.5 rounded-[1px] bg-primary text-black font-black tracking-[0.15em] uppercase">Target</span>}
          </div>
          {goalTag && (
            <span className="text-[11px] font-headline font-bold text-primary/50 uppercase tracking-[0.15em] mt-0.5 truncate block" title={goalTag}>
              {goalTag}
            </span>
          )}
        </div>
      </div>

      {/* Right side: Priority, Hours, Focus toggles, Delete button */}
      <div className="flex items-center gap-2.5 shrink-0 ml-4">
        <span className="text-xs font-headline font-black text-on-surface-variant/40 uppercase tracking-[0.15em] tabular-nums mr-1.5">{hoursSpent}</span>
        
        {/* Start Focus */}
        <button onClick={(e) => { e.stopPropagation(); startFocus?.(task); }}
                className="w-7 h-7 rounded-[2px] flex items-center justify-center transition-all border border-transparent hover:border-primary hover:bg-primary hover:text-black text-primary opacity-0 group-hover:opacity-100" title="Start Focus Timer">
           <Play size={12} fill="currentColor" />
        </button>
        
        {/* Focus Toggle */}
        <button onClick={(e) => { e.stopPropagation(); toggleFocus?.(task); }}
                className={`w-7 h-7 rounded-[2px] flex items-center justify-center transition-all border ${task.dailyFocus ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(0,219,233,0.3)] animate-pulse' : 'bg-[#242730] border-transparent text-on-surface-variant/30 hover:border-white/10 hover:text-on-surface opacity-0 group-hover:opacity-100'}`}>
           <Target size={10} />
        </button>
        
        {/* Priority */}
        <span className={`text-[11px] rounded-[2px] font-black uppercase tracking-[0.25em] px-2 py-0.5 border ${priorityColor}`}>{task.priority}</span>
        
        {/* Delete */}
        <button onClick={() => deleteTask(task.id!)}
          className="w-7 h-7 rounded-[4px] flex items-center justify-center text-on-surface-variant/10 hover:bg-error/10 hover:text-error transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-error/20">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}


function SortableTaskItem({ task, toggleTask, deleteTask, isNextActive, viewMode, hoursSpent, goalTag, toggleFocus, startFocus }: { task: Task, toggleTask: (t: Task)=>void, deleteTask: (id: number)=>void, isNextActive: boolean, viewMode: 'list' | 'kanban', hoursSpent: string, goalTag?: string, toggleFocus: (t: Task)=>void, startFocus?: (t: Task)=>void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id!.toString() });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };

  return (
    <TaskItem
      task={task}
      toggleTask={toggleTask}
      deleteTask={deleteTask}
      isNextActive={isNextActive}
      viewMode={viewMode}
      hoursSpent={hoursSpent}
      goalTag={goalTag}
      dragHandleProps={{ ...attributes, ...listeners }}
      innerRef={setNodeRef}
      style={style}
      toggleFocus={toggleFocus} startFocus={startFocus}
    />
  );
}
