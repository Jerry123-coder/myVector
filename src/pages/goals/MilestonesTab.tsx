import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Milestone } from '../../lib/db';
import { getTMinus } from '../../lib/metrics';
import { nowMs } from '../../lib/time';
import { CheckCircle2, Plus, Trash2, Flag, AlertTriangle, CalendarDays } from 'lucide-react';

// Replaced custom daysLeft with unified getTMinus from metrics.ts

export const MilestonesTab = () => {
  const [now] = useState(() => Date.now());
  const milestones     = useLiveQuery(() => db.milestones.orderBy('targetDate').toArray(), []) ?? [];
  const annualGoals    = useLiveQuery(() => db.annualGoals.toArray(), []) ?? [];
  const quarterlyGoals = useLiveQuery(() => db.quarterlyGoals.toArray(), []) ?? [];
  const sprints        = useLiveQuery(() => db.sprints.toArray(), []) ?? [];

  const [creating, setCreating] = useState(false);
  const [title, setTitle]         = useState('');
  const [targetDate, setDate]     = useState('');
  const [annualId, setAnnualId]   = useState<number | undefined>();
  const [qId, setQId]             = useState<number | undefined>();
  const [sprintId, setSprintId]   = useState<number | undefined>();

  const create = async () => {
    if (!title.trim() || !targetDate) return;
    await db.milestones.add({
      title: title.trim().toUpperCase(),
      targetDate: new Date(targetDate).getTime(),
      annualGoalId: annualId, quarterlyGoalId: qId, sprintId,
      status: 'upcoming', createdAt: nowMs(), updatedAt: Date.now(),
    });
    setTitle(''); setDate(''); setAnnualId(undefined); setQId(undefined); setSprintId(undefined); setCreating(false);
  };

  const toggleDone    = async (m: Milestone) => { if (m.id) await db.milestones.update(m.id, { status: m.status === 'done' ? 'upcoming' : 'done', updatedAt: Date.now() }); };
  const toggleAtRisk  = async (m: Milestone) => { if (m.id) await db.milestones.update(m.id, { status: m.status === 'at-risk' ? 'upcoming' : 'at-risk', updatedAt: Date.now() }); };
  const del           = async (id?: number)  => { if (id) await db.milestones.delete(id); };

  const upcoming = milestones.filter(m => m.status !== 'done' && m.targetDate > now);
  const overdue  = milestones.filter(m => m.status !== 'done' && m.targetDate <= now);
  const done     = milestones.filter(m => m.status === 'done');

  const Row = ({ m }: { m: Milestone }) => {
    const isOverdue = m.targetDate < now && m.status !== 'done';
    const aGoal     = annualGoals.find(g => g.id === m.annualGoalId);
    const qGoal     = quarterlyGoals.find(g => g.id === m.quarterlyGoalId);
    const sprint    = sprints.find(s => s.id === m.sprintId);

    return (
      <div className={`group flex items-start justify-between p-4 rounded-sm border-l-4 shadow-sm mb-3 transition-all ${
        m.status === 'done' ? 'border-secondary/40 bg-[#121a14]' : isOverdue || m.status === 'at-risk' ? 'border-error/60 bg-[#1e2024]' : 'border-primary-fixed-dim/40 bg-[#16181b] hover:bg-[#1a1c20]'
      }`}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button onClick={() => toggleDone(m)}
            className={`mt-0.5 w-7 h-7 flex-shrink-0 flex items-center justify-center border-2 transition-all ${
              m.status === 'done' ? 'border-secondary bg-secondary/10' : 'border-primary/50 hover:border-primary'
            }`}>
            {m.status === 'done' && <CheckCircle2 size={14} className="text-secondary" />}
          </button>
          <div className="min-w-0">
            <div className={`font-headline font-bold text-sm uppercase tracking-tight ${m.status === 'done' ? 'line-through text-on-surface-variant/40' : 'text-on-surface'}`}>
              {m.title}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className={`font-body text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${isOverdue && m.status !== 'done' ? 'bg-error text-black' : m.status === 'done' ? 'bg-secondary text-black' : 'bg-surface-container-high text-primary'}`}>
                {m.status === 'done' ? '✓ DONE' : `${getTMinus(m.targetDate)}`}
              </span>
              {aGoal && <span className="text-[8px] text-primary/60 border border-primary/10 px-1.5 py-0.5">{aGoal.title}</span>}
              {qGoal && <span className="text-[8px] text-primary/40 border border-primary/10 px-1.5 py-0.5">{qGoal.title}</span>}
              {sprint && <span className="text-[8px] text-on-surface-variant/40 border border-outline-variant/30 px-1.5 py-0.5">{sprint.name}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {m.status !== 'done' && (
            <button onClick={() => toggleAtRisk(m)} title="Toggle At-Risk"
              className={`w-7 h-7 flex items-center justify-center transition-colors ${m.status === 'at-risk' ? 'text-error' : 'text-outline/30 hover:text-tertiary-fixed-dim opacity-0 group-hover:opacity-100'}`}>
              <AlertTriangle size={12} />
            </button>
          )}
          <button onClick={() => del(m.id)}
            className="w-7 h-7 flex items-center justify-center text-outline/30 hover:text-error/70 transition-colors opacity-0 group-hover:opacity-100">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-headline font-black text-xl text-primary uppercase tracking-tight">Milestones</h2>
        <button onClick={() => setCreating(!creating)}
          className="flex items-center gap-1.5 px-3 py-2 font-headline font-bold text-[10px] text-primary-fixed-dim uppercase tracking-widest hover:bg-surface-container-high transition-all"
          style={{ border: '1px solid rgba(0,219,233,0.2)' }}>
          <Plus size={12} /> New Milestone
        </button>
      </div>

      {creating && (
        <div className="mb-6 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ background: '#1e2024', border: '1px solid rgba(255,186,56,0.2)', borderLeft: '2px solid #ffba38' }}>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant">Title</span>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="BETA_LAUNCH"
              className="bg-transparent border-b border-surface-container-highest font-headline font-bold text-sm text-primary uppercase placeholder:text-on-surface-variant/30 outline-none py-1.5" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant">Target Date</span>
            <input type="date" value={targetDate} onChange={e => setDate(e.target.value)}
              className="bg-transparent border-b border-surface-container-highest font-headline font-bold text-sm text-primary outline-none py-1.5" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant">Annual Goal (optional)</span>
            <select value={annualId ?? ''} onChange={e => setAnnualId(Number(e.target.value) || undefined)}
              className="bg-transparent border-b border-surface-container-highest font-headline font-bold text-sm text-primary uppercase outline-none py-1.5">
              <option value="">— None —</option>
              {annualGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant">Quarterly Goal (optional)</span>
            <select value={qId ?? ''} onChange={e => setQId(Number(e.target.value) || undefined)}
              className="bg-transparent border-b border-surface-container-highest font-headline font-bold text-sm text-primary uppercase outline-none py-1.5">
              <option value="">— None —</option>
              {quarterlyGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant">Sprint (optional)</span>
            <select value={sprintId ?? ''} onChange={e => setSprintId(Number(e.target.value) || undefined)}
              className="bg-transparent border-b border-surface-container-highest font-headline font-bold text-sm text-primary uppercase outline-none py-1.5">
              <option value="">— None —</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={create}
              className="px-6 py-2.5 font-headline font-black text-xs uppercase tracking-widest active:scale-95"
              style={{ background: '#ffba38', color: '#281900' }}>Add Milestone</button>
            <button onClick={() => setCreating(false)}
              className="px-6 py-2.5 font-headline font-bold text-xs uppercase text-on-surface-variant hover:text-primary"
              style={{ border: '1px solid #282a2e' }}>Cancel</button>
          </div>
        </div>
      )}

      {milestones.length === 0 && !creating && (
        <div className="py-12 text-center" style={{ border: '1px dashed rgba(0,219,233,0.1)' }}>
          <Flag size={24} className="text-primary/20 mx-auto mb-3" />
          <div className="font-headline font-bold text-xs text-on-surface-variant/50 uppercase tracking-widest">No milestones yet</div>
          <div className="font-body text-[10px] text-on-surface-variant/30 mt-1">Track key events and deadlines linked to your goals.</div>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle size={12} className="text-error"/><span className="font-headline font-bold text-[10px] uppercase tracking-widest text-error">Overdue</span></div>
          <div className="space-y-2">{overdue.map(m => <Row key={m.id} m={m} />)}</div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3"><CalendarDays size={12} className="text-primary-fixed-dim"/><span className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">Upcoming</span></div>
          <div className="space-y-2">{upcoming.map(m => <Row key={m.id} m={m} />)}</div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3"><CheckCircle2 size={12} className="text-secondary"/><span className="font-headline font-bold text-[10px] uppercase tracking-widest text-secondary">Completed</span></div>
          <div className="space-y-2 opacity-60">{done.map(m => <Row key={m.id} m={m} />)}</div>
        </div>
      )}
    </div>
  );
};
