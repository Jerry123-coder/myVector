import { useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
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

  const canAdd = daily.length < 3;
  const done   = daily.filter(t => t.done).length;

  const add = async (lbl: string, taskId?: number) => {
    const clean = lbl.trim().toUpperCase();
    if (!clean || !canAdd) return;
    await db.dailyTasks.add({ date: today, label: clean, taskId, done: false, order: daily.length });
    setLabel(''); setShowAdd(false);
  };

  const toggle = async (id?: number, cur?: boolean) => {
    if (id != null) await db.dailyTasks.update(id, { done: !cur });
  };

  const remove = async (id?: number) => {
    if (id != null) await db.dailyTasks.delete(id);
  };

  const pending = sprintTasks.filter(t => t.status !== 'done');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-headline font-black text-xl text-primary uppercase tracking-tight">Today's Focus</h2>
          <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="px-4 py-2 border-l-2 border-secondary" style={{ background: '#1a1c20' }}>
          <div className="text-[9px] font-bold text-on-surface-variant uppercase">Done</div>
          <div className="font-headline font-black text-xl text-secondary">{done}/{daily.length}</div>
        </div>
      </div>

      {/* 3 slots */}
      <div className="space-y-2 mb-6">
        {[0, 1, 2].map(slot => {
          const task = daily.find(t => t.order === slot);
          return (
            <div key={slot}
              className={`flex items-center gap-4 p-4 border-l-2 transition-all ${task ? (task.done ? 'border-secondary/40' : 'border-primary/60') : 'border-outline/20'}`}
              style={{ background: task ? (task.done ? '#121a14' : '#1a1c20') : '#0f1014' }}>
              {task ? (
                <>
                  <button onClick={() => toggle(task.id, task.done)}
                    className={`w-7 h-7 flex-shrink-0 flex items-center justify-center border-2 transition-all ${task.done ? 'border-secondary bg-secondary/10' : 'border-primary hover:bg-surface-container-high'}`}>
                    {task.done && <CheckCircle2 size={14} className="text-secondary" />}
                  </button>
                  <span className={`flex-1 font-headline font-bold text-sm uppercase tracking-tight ${task.done ? 'line-through text-on-surface-variant/40' : 'text-on-surface'}`}>
                    {task.label}
                  </span>
                  <button onClick={() => remove(task.id)}
                    className="w-7 h-7 flex items-center justify-center text-outline/30 hover:text-error/70 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3 w-full text-on-surface-variant/30">
                  <div className="w-7 h-7 border-2 border-dashed border-outline/20 flex-shrink-0" />
                  <span className="font-headline font-bold text-xs uppercase tracking-widest">Key Task {slot + 1}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add area */}
      {canAdd && (
        <div className="flex gap-2 mb-4">
          <button onClick={() => setShowAdd(true)}
            className="flex-1 py-3 flex items-center justify-center gap-2 font-headline font-bold text-[10px] uppercase tracking-widest text-primary-fixed-dim transition-all hover:bg-surface-container-high"
            style={{ border: '1px solid rgba(0,219,233,0.2)' }}>
            <Plus size={12} /> Add Custom Task
          </button>
          {pending.length > 0 && (
            <div className="relative group">
              <button className="h-full px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-all"
                style={{ border: '1px solid #282a2e' }}>
                Pull from Sprint
              </button>
              <div className="hidden group-hover:block absolute bottom-full right-0 mb-1 w-60 z-20 max-h-52 overflow-y-auto no-scrollbar"
                style={{ background: '#1e2024', border: '1px solid rgba(0,219,233,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                {pending.map(t => (
                  <button key={t.id} onClick={() => add(t.label, t.id)}
                    className="w-full px-4 py-3 text-left hover:bg-surface-container-high transition-colors">
                    <span className="font-headline font-bold text-xs text-on-surface uppercase tracking-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="flex items-center gap-2 p-3 mb-4"
          style={{ background: '#1e2024', border: '1px solid rgba(0,219,233,0.15)' }}>
          <input autoFocus value={label} onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add(label)}
            placeholder="KEY TASK FOR TODAY..."
            className="flex-1 bg-transparent font-headline font-bold text-sm text-primary uppercase tracking-tight placeholder:text-on-surface-variant/30 outline-none" />
          <button onClick={() => add(label)}
            className="px-4 py-1.5 font-headline font-bold text-[10px] uppercase tracking-wider active:scale-95"
            style={{ background: '#00dbe9', color: '#002022' }}>Add</button>
          <button onClick={() => { setShowAdd(false); setLabel(''); }}
            className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors text-lg">✕</button>
        </div>
      )}

      {daily.length === 3 && done === 3 && (
        <div className="p-4 text-center border border-secondary/20" style={{ background: 'rgba(0,228,117,0.04)' }}>
          <div className="font-headline font-black text-sm text-secondary uppercase tracking-widest">🎯 All 3 Key Tasks Complete</div>
          <div className="font-body text-[10px] text-secondary/60 mt-1">Outstanding execution. Sprint velocity maintained.</div>
        </div>
      )}
    </div>
  );
};
