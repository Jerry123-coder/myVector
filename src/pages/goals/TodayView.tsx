import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { todayStr, type DailyTask, type Sprint, type Task } from '../../lib/db';
import { useDb, type DbInstance } from '../../lib/DbContext';
import {
  CheckCircle2, Plus, Trash2, Zap, Brain, Inbox, Star,
  ChevronDown, Edit3, ChevronRight, Activity, BookOpen
} from 'lucide-react';
import { useToast } from '../../components/ToastContext';
import { useXP, XP_WEIGHTS, isSunday } from '../../hooks/useXP';

interface Props { activeSprint?: Sprint; }

// Deep Work XP is handled by Focus Timer (TimerView). Skill/Workout/Admin are toggled here.
const XP = XP_WEIGHTS;

// ── Streak helpers ──────────────────────────────────────

async function markStreakForToday(database: DbInstance, allDone: boolean) {
  const today = todayStr();
  const existing = await database.dailyStreaks.where('date').equals(today).first();
  if (existing?.id) {
    if (existing.allDone !== allDone) {
      await database.dailyStreaks.update(existing.id, { allDone, updatedAt: Date.now() });
    }
  } else {
    await database.dailyStreaks.add({ date: today, allDone, updatedAt: Date.now() });
  }
}

export const TodayView = ({ activeSprint }: Props) => {
  const today = todayStr();
  const { db, isTestMode } = useDb();
  const { showToast } = useToast();
  const daily = useLiveQuery(
    () => db.dailyTasks.where('date').equals(today).sortBy('order'),
    [today, isTestMode]
  ) ?? [];

  const sprintTasks = useLiveQuery(
    () => activeSprint?.id
      ? db.tasks.where('sprintId').equals(activeSprint.id).toArray().then(a => a.sort((x,y) => (x.order ?? x.createdAt) - (y.order ?? y.createdAt)))
      : Promise.resolve([] as Task[]),
    [activeSprint?.id, isTestMode]
  ) ?? [];

  const { xpToday, currentStreak, canLogRelationship, relationshipCheckinsDone } = useXP();
  const todaySunday = isSunday(today);

  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<'deep-work' | 'skill' | 'workout' | 'admin'>('deep-work');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [showBacklog, setShowBacklog] = useState(false);

  const directives = daily.filter(t => t.category !== 'skill' && t.category !== 'workout');
  const skillTask = daily.find(t => t.category === 'skill');
  const workoutTask = daily.find(t => t.category === 'workout');
  
  const doneCount = daily.filter(t => t.done).length;
  const totalCount = daily.length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  
  const pendingSprint = sprintTasks.filter(t => t.status !== 'done');

  // Persist streak record whenever allDone changes
  useEffect(() => {
    if (totalCount > 0) void markStreakForToday(db, allDone);
  }, [db, allDone, totalCount]);

  const add = async () => {
    if (directives.length >= 3) {
      showToast('Maximum daily capacity reached (3)', 'error');
      return;
    }
    const clean = label.trim();
    if (!clean) return;
    await db.dailyTasks.add({
      date: today, label: clean, category,
      done: false, order: daily.length, updatedAt: Date.now(),
    });
    setLabel('');
    showToast('Directive Entry Synchronized', 'success');
  };

  const pullTask = async (t: Task) => {
    if (directives.length >= 3) {
      showToast('Maximum daily capacity reached (3)', 'error');
      return;
    }
    await db.dailyTasks.add({
      date: today, label: t.label, category: 'deep-work',
      taskId: t.id, done: false, order: daily.length, updatedAt: Date.now(),
    });
    setShowAdd(false);
    showToast('Sprint Node Tactical Deployment', 'success');
  };

  const autoFill = async () => {
    const slotsAvailable = 3 - directives.length;
    if (slotsAvailable <= 0) return;
    
    const tasksToPull = pendingSprint.slice(0, slotsAvailable);
    if (tasksToPull.length === 0) return;

    for (let i = 0; i < tasksToPull.length; i++) {
      await db.dailyTasks.add({
        date: today, label: tasksToPull[i].label, category: 'deep-work',
        taskId: tasksToPull[i].id, done: false, order: daily.length + i, updatedAt: Date.now(),
      });
    }
    showToast(`Auto-filled ${tasksToPull.length} directives from Sprint`, 'success');
  };

  const updateLabel = async (id: number) => {
    const clean = editLabel.trim();
    if (clean) await db.dailyTasks.update(id, { label: clean, updatedAt: Date.now() });
    setEditingId(null);
  };

  const toggle = async (task: DailyTask) => {
    if (task.id == null) return;
    if (todaySunday) { showToast('Sunday is a zero-XP rest day', 'info'); return; }
    const isDone = !task.done;
    await db.dailyTasks.update(task.id, { done: isDone, updatedAt: Date.now() });
    
    // Add XP if completed (deep-work XP is handled by the Focus timer, not here)
    if (isDone && task.category && task.category !== 'deep-work') {
      const xpAmount = XP[task.category as keyof typeof XP] || 2;
      await db.xpLogs.add({
        date: today,
        amount: xpAmount,
        reason: task.label,
        category: 'habit',
        createdAt: Date.now()
      });
    }
    
    if (isDone) showToast('Directive Accomplished', 'success');
  };

  const remove = async (id?: number) => {
    if (id != null) {
       await db.dailyTasks.delete(id);
       showToast('Directive Terminated', 'info');
    }
  };

  const handleBonusXP = async (amount: number, reason: string, cat: 'bonus' | 'project' | 'relationship') => {
    if (cat === 'relationship' && !canLogRelationship) {
      showToast('Weekly relationship XP cap reached (10 XP / 5 check-ins)', 'error');
      return;
    }
    await db.xpLogs.add({
      date: today,
      amount,
      reason,
      category: cat,
      createdAt: Date.now()
    });
    showToast(`+${amount} XP: ${reason}`, 'success');
  };

  const toggleHabit = async (cat: 'skill' | 'workout', defaultLabel: string) => {
    if (todaySunday) { showToast('Sunday is a zero-XP rest day', 'info'); return; }
    const existing = daily.find(t => t.category === cat);
    if (existing && existing.id) {
       await toggle(existing);
    } else {
       const id = await db.dailyTasks.add({
         date: today, label: defaultLabel, category: cat,
         done: true, order: daily.length, updatedAt: Date.now()
       });
       await toggle({ id, done: false, date: today, label: defaultLabel, category: cat, order: daily.length, updatedAt: Date.now() } as DailyTask);
    }
  };

  // ── Task row renderer ──────────────────────────────────
  const TaskRow = ({ task, accent }: { task: DailyTask; accent: string }) => (
    <div
      key={task.id}
      className={`group flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 border ${
        task.done
          ? 'border-transparent bg-black/20 opacity-50'
          : `border-white/5 bg-white/[0.03] hover:border-on-surface/10 hover:bg-white/[0.06] shadow-sm`
      }`}
    >
      <button
        onClick={() => toggle(task)}
        className={`w-6 h-6 shrink-0 rounded-xl flex items-center justify-center border-2 transition-all ${
          task.done
            ? 'border-secondary bg-secondary/20'
            : `border-${accent}/40 hover:border-${accent} hover:bg-${accent}/10`
        }`}
      >
        {task.done && <CheckCircle2 size={14} className="text-secondary" />}
      </button>

      {editingId === task.id ? (
        <input
          autoFocus
          value={editLabel}
          onChange={e => setEditLabel(e.target.value)}
          onBlur={() => updateLabel(task.id!)}
          onKeyDown={e => e.key === 'Enter' && updateLabel(task.id!)}
          className="flex-1 bg-transparent font-headline font-black text-sm text-primary outline-none border-b border-primary/30 py-0.5 uppercase tracking-tight"
        />
      ) : (
        <span
          onClick={() => toggle(task)}
          className={`flex-1 font-headline font-black text-sm cursor-pointer break-words tracking-tight uppercase ${
            task.done ? 'line-through text-on-surface-variant/30' : 'text-on-surface'
          }`}
        >
          {task.label}
        </span>
      )}

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-${accent}/10 text-${accent}/60 border border-${accent}/20`}>
          +{XP[task.category as keyof typeof XP] ?? 2} XP
        </span>
        {!task.done && editingId !== task.id && (
          <button
            onClick={() => { setEditingId(task.id!); setEditLabel(task.label); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-on-surface-variant/30 hover:text-primary transition-colors"
          >
            <Edit3 size={14} />
          </button>
        )}
        <button
          onClick={() => remove(task.id)}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-on-surface-variant/30 hover:text-error transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  // Removed CategorySection

  return (
    <div className="max-w-3xl mx-auto w-full pb-24">

      {/* ── Header Band ─────────────────────────────────── */}
      <div className="bg-[#1a1c22] rounded-2xl p-8 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-white/5 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 opacity-50" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-xl">
             <Zap size={28} className="text-primary" />
          </div>
          <div>
            <h2 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tight leading-none mb-1">
              Directives
            </h2>
            <p className="font-headline font-black text-[10px] text-on-surface-variant/40 uppercase tracking-[0.3em]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 relative z-10">
          {/* Streak Counter */}
          <div className="flex flex-col items-center px-6 py-3 bg-black/40 rounded-2xl border border-white/5 shadow-inner min-w-[100px]">
            <span className={`font-headline font-black text-3xl tabular-nums leading-none ${currentStreak > 0 ? 'streak-glow' : 'text-on-surface-variant/20'}`}
              style={{ color: currentStreak > 0 ? '#ff9620' : undefined }}>
               {currentStreak}
            </span>
            <span className="font-headline font-black text-[8px] uppercase tracking-widest text-[#ff9620]/60 mt-1.5">DRIVE_STREAK</span>
          </div>

          {/* XP Today */}
          <div className="flex flex-col items-center px-6 py-3 bg-black/40 rounded-2xl border border-white/5 shadow-inner min-w-[100px]">
            <span className="font-headline font-black text-3xl tabular-nums text-secondary leading-none">
              {xpToday}
            </span>
            <span className="font-headline font-black text-[8px] uppercase tracking-widest text-secondary/60 mt-1.5">GAINED_XP</span>
          </div>

          {/* Completion */}
          {totalCount > 0 && (
            <div className="flex flex-col items-center px-6 py-3 bg-black/40 rounded-2xl border border-white/5 shadow-inner min-w-[100px]">
              <span className={`font-headline font-black text-3xl tabular-nums leading-none ${allDone ? 'text-secondary' : 'text-primary'}`}>
                {doneCount} / {totalCount}
              </span>
              <span className="font-headline font-black text-[8px] uppercase tracking-widest text-on-surface-variant/40 mt-1.5">OPERATIONAL</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Max Capacity Banner ────────────────────────────── */}
      {directives.length >= 3 && (
        <div className="bg-error/10 border border-error/30 rounded-2xl p-4 mb-8 flex items-center justify-center gap-3">
          <Zap size={18} className="text-error" />
          <span className="font-headline font-black text-xs uppercase tracking-widest text-error">
            MAX CAPACITY REACHED: 3 DIRECTIVES
          </span>
        </div>
      )}

      {/* ── Add Task Card ──────────────────────────────────── */}
      {showAdd ? (
        <div className="bg-[#1a1c22] rounded-2xl p-8 mb-8 shadow-xl border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          {/* Category Toggle (Simplified) */}
          <div className="flex gap-4 mb-6 relative z-10">
            <button
              onClick={() => setCategory('deep-work')}
              className={`flex-1 flex items-center justify-center gap-3 p-3 rounded-2xl border font-headline font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                category === 'deep-work'
                  ? 'border-primary bg-primary/10 text-primary shadow-[0_0_30px_rgba(0,219,233,0.1)]'
                  : 'border-white/5 bg-white/5 text-on-surface-variant/40 hover:border-primary/40'
              }`}
            >
              <Brain size={16} /> Deep Work <span className="opacity-50">+10 XP</span>
            </button>
            <button
              onClick={() => setCategory('admin')}
              className={`flex-1 flex items-center justify-center gap-3 p-3 rounded-2xl border font-headline font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${
                category === 'admin'
                  ? 'border-tertiary-fixed-dim bg-tertiary-fixed-dim/10 text-tertiary-fixed-dim shadow-[0_0_30px_rgba(151,107,255,0.1)]'
                  : 'border-white/5 bg-white/5 text-on-surface-variant/40 hover:border-tertiary-fixed-dim/40'
              }`}
            >
              <Inbox size={16} /> Admin <span className="opacity-50">+2 XP</span>
            </button>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="What needs to get done?"
              className="flex-1 bg-black/20 rounded-2xl px-6 py-4 font-headline font-black text-lg text-on-surface placeholder:text-on-surface-variant/10 outline-none border border-white/5"
            />
            {pendingSprint.length > 0 && (
              <div className="relative group/pull">
                <button className="px-6 py-4 rounded-2xl border border-white/5 font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant/40 hover:border-primary/40 hover:text-primary transition-all whitespace-nowrap flex items-center gap-2">
                  Pull_Sprint <ChevronRight size={14} />
                </button>
                <div className="hidden group-hover/pull:block absolute top-[110%] right-0 z-50 w-72 max-h-64 overflow-y-auto rounded-3xl bg-[#1a1c22] border border-white/10 shadow-2xl p-2">
                  {pendingSprint.map(t => (
                    <button key={t.id} onClick={() => pullTask(t)}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 rounded-2xl transition-colors border-b border-white/5 last:border-none block group/item">
                      <span className="font-headline font-black text-xs text-on-surface-variant/70 group-hover:text-primary transition-colors truncate block">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={add}
              className="px-8 py-4 rounded-2xl font-headline font-black text-[11px] uppercase tracking-[0.2em] text-black active:scale-95 transition-all shadow-[0_20_40px_-10px_rgba(0,219,233,0.4)]"
              style={{ background: '#00dbe9' }}
            >
              Confirm
            </button>
          </div>
        </div>
      ) : directives.length < 3 ? (
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => setShowAdd(true)}
            className="flex-1 flex items-center justify-center gap-4 px-8 py-6 rounded-2xl bg-[#1a1c22] border-2 border-dashed border-white/5 hover:border-primary/40 hover:bg-primary/[0.02] transition-all text-on-surface-variant/20 group"
          >
            <div className="w-10 h-10 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary transition-all">
              <Plus size={20} />
            </div>
            <span className="font-headline font-black text-sm uppercase tracking-[0.3em] group-hover:text-primary transition-colors">
              Initialize_Directive
            </span>
          </button>
          
          {pendingSprint.length > 0 && (
            <button
              onClick={autoFill}
              className="flex-1 flex items-center justify-center gap-4 px-8 py-6 rounded-2xl bg-[#1a1c22] border-2 border-dashed border-white/5 hover:border-secondary/40 hover:bg-secondary/[0.02] transition-all text-on-surface-variant/20 group"
            >
              <div className="w-10 h-10 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center group-hover:border-secondary group-hover:bg-secondary/10 group-hover:text-secondary transition-all">
                <Zap size={20} />
              </div>
              <span className="font-headline font-black text-sm uppercase tracking-[0.3em] group-hover:text-secondary transition-colors">
                Auto_Fill_Sequence
              </span>
            </button>
          )}
        </div>
      ) : null}

      {/* ── Sprint Backlog Pulldown (Moved Up) ────────────────────────── */}
      {pendingSprint.length > 0 && directives.length < 3 && (
        <div className="mb-8">
          <button
            onClick={() => setShowBacklog(!showBacklog)}
            className="w-full flex items-center justify-between px-8 py-5 rounded-2xl bg-[#1a1c22] border border-white/5 transition-all hover:border-primary/20 shadow-xl group/bl"
          >
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-primary-fixed-dim" />
              <span className="font-headline font-black text-xs uppercase tracking-[0.2em] text-on-surface-variant/60 group-hover/bl:text-on-surface transition-colors">
                Sprint_Tactical_Reserve
              </span>
              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-primary-fixed-dim/10 text-primary-fixed-dim border border-primary-fixed-dim/20">
                {pendingSprint.length} UNITS
              </span>
            </div>
            <ChevronDown size={18} className={`text-on-surface-variant/20 transition-transform duration-500 ${showBacklog ? 'rotate-180' : ''}`} />
          </button>
          {showBacklog && (
            <div className="mt-4 bg-[#1a1c22] rounded-2xl p-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500 border border-white/5">
              {pendingSprint.map(t => (
                <button
                  key={t.id}
                  onClick={() => pullTask(t)}
                  className="flex items-center gap-4 px-6 py-4 rounded-2xl hover:bg-white/[0.03] transition-all text-left group/bt border border-transparent hover:border-white/5"
                >
                  <Plus size={16} className="text-primary-fixed-dim/40 group-hover/bt:text-primary-fixed-dim transition-colors shrink-0" />
                  <span className="font-headline font-black text-sm text-on-surface-variant/60 group-hover/bt:text-on-surface transition-colors flex-1 truncate uppercase tracking-tight">
                    {t.label}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${
                    t.priority === 'HIGH' ? 'text-error border-error/30 bg-error/5' :
                    t.priority === 'MED'  ? 'text-tertiary-fixed-dim border-tertiary-fixed-dim/30 bg-tertiary-fixed-dim/5' :
                    'text-on-surface-variant/30 border-white/5 bg-white/5'
                  }`}>{t.priority}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Directives List ──────────────────────────────────── */}
      {directives.length > 0 && (
        <div className="bg-[#1a1c22] rounded-2xl p-6 mb-8 border border-white/5 shadow-xl">
           <h3 className="font-headline font-black text-xs text-on-surface-variant/40 uppercase tracking-[0.3em] mb-4">Tactical Directives</h3>
           <div className="flex flex-col gap-3">
             {directives.map(t => <TaskRow key={t.id} task={t} accent={t.category === 'admin' ? 'tertiary-fixed-dim' : 'primary'} />)}
           </div>
        </div>
      )}

      {/* ── Daily Habits & XP Actions ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        
        {/* Habits */}
        <div className="bg-[#1a1c22] rounded-2xl p-6 border border-white/5 shadow-xl">
           <h3 className="font-headline font-black text-xs text-on-surface-variant/40 uppercase tracking-[0.3em] mb-4">Core Habits</h3>
           <div className="space-y-3">
             <button
               onClick={() => toggleHabit('skill', 'Skill Mastery (90m)')}
               className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                 skillTask?.done 
                   ? 'bg-secondary/10 border-secondary/20 text-secondary shadow-[0_0_15px_rgba(0,228,117,0.1)]' 
                   : 'bg-white/[0.03] border-white/5 hover:border-secondary/40 hover:bg-white/[0.06] text-on-surface'
               }`}
             >
               <div className="flex items-center gap-3">
                 <BookOpen size={16} />
                 <span className="font-headline font-black text-[11px] uppercase tracking-widest">Skill Mastery (90m)</span>
               </div>
               {skillTask?.done ? <CheckCircle2 size={16} /> : <span className="text-[9px] font-black opacity-50">+5 XP</span>}
             </button>
             
             <button
               onClick={() => toggleHabit('workout', '20/20/200 Workout')}
               className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                 workoutTask?.done 
                   ? 'bg-error/10 border-error/20 text-error shadow-[0_0_15px_rgba(255,82,82,0.1)]' 
                   : 'bg-white/[0.03] border-white/5 hover:border-error/40 hover:bg-white/[0.06] text-on-surface'
               }`}
             >
               <div className="flex items-center gap-3">
                 <Activity size={16} />
                 <span className="font-headline font-black text-[11px] uppercase tracking-widest">20/20/200 Workout</span>
               </div>
               {workoutTask?.done ? <CheckCircle2 size={16} /> : <span className="text-[9px] font-black opacity-50">+5 XP</span>}
             </button>
           </div>
        </div>

        {/* Manual Overrides */}
        <div className="bg-[#1a1c22] rounded-2xl p-6 border border-white/5 shadow-xl">
           <h3 className="font-headline font-black text-xs text-[#ffba38]/40 uppercase tracking-[0.3em] mb-4">Bonus XP Triggers</h3>
           {todaySunday && (
             <div className="mb-4 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-center">
               <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">☀️ Rest Day — Zero XP</span>
             </div>
           )}
           <div className="space-y-3">
             <button onClick={() => handleBonusXP(20, 'Project Deployment', 'project')}
                disabled={todaySunday}
                className="w-full p-4 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#ffba38]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-[#ffba38]/10 text-[#ffba38] flex items-center justify-center"><Zap size={14} /></div>
                   <div className="text-left">
                      <div className="font-headline font-black text-[11px] text-on-surface uppercase tracking-widest group-hover:text-[#ffba38] transition-colors">Deploy Project</div>
                      <div className="text-[8px] text-on-surface-variant/40 uppercase">Production Ship</div>
                   </div>
                </div>
                <span className="font-headline font-black text-[#ffba38] text-[10px]">+20 XP</span>
             </button>
             <button onClick={() => handleBonusXP(2, 'Relationship Check-in', 'relationship')}
                disabled={todaySunday || !canLogRelationship}
                className="w-full p-4 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-tertiary-fixed-dim/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-tertiary-fixed-dim/10 text-tertiary-fixed-dim flex items-center justify-center"><Star size={14} /></div>
                   <div className="text-left">
                      <div className="font-headline font-black text-[11px] text-on-surface uppercase tracking-widest group-hover:text-tertiary-fixed-dim transition-colors">Relationship</div>
                      <div className="text-[8px] text-on-surface-variant/40 uppercase">{relationshipCheckinsDone}/5 check-ins this week</div>
                   </div>
                </div>
                <span className={`font-headline font-black text-[10px] ${canLogRelationship ? 'text-tertiary-fixed-dim' : 'text-on-surface-variant/30'}`}>
                  {canLogRelationship ? '+2 XP' : 'CAPPED'}
                </span>
             </button>
           </div>
        </div>
      </div>



      {/* ── Victory State ────────────────────────────────────── */}
      {allDone && (
        <div className="mt-8 p-6 rounded-2xl border border-secondary/20 bg-secondary/5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 via-transparent to-secondary/5 pointer-events-none" />
          <Star size={32} className="text-secondary mx-auto mb-3" fill="currentColor" />
          <div className="font-headline font-black text-lg text-secondary uppercase tracking-widest">Total Victory</div>
          <div className="font-body text-sm text-secondary/70 mt-1">
            +{xpToday} XP earned today · {currentStreak > 1 ? `🔥 ${currentStreak}-Day Streak Active` : 'Streak started!'}
          </div>
        </div>
      )}
    </div>
  );
};
