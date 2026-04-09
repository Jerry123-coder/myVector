import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { Plus, Trash2, Target, ChevronDown, ChevronRight } from 'lucide-react';

const daysLeft = (ms?: number) => {
  if (!ms) return null;
  const d = Math.ceil((ms - Date.now()) / 86400000);
  return d > 0 ? `${d}d left` : d === 0 ? 'Today' : 'Overdue';
};

const fmtDate = (ms?: number) =>
  ms ? new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const GoalsTab = () => {
  const annualGoals     = useLiveQuery(() => db.annualGoals.toArray().then(a => a.sort((x,y) => y.createdAt - x.createdAt)), []) ?? [];
  const quarterlyGoals  = useLiveQuery(() => db.quarterlyGoals.toArray().then(a => a.sort((x,y) => x.createdAt - y.createdAt)), []) ?? [];
  const allTasks        = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const allSprints      = useLiveQuery(() => db.sprints.toArray(), []) ?? [];

  // UI state
  const [expandedAnnual, setExpandedAnnual]     = useState<Set<number>>(new Set());
  const [expandedQ, setExpandedQ]               = useState<Set<number>>(new Set());
  const [creatingAnnual, setCreatingAnnual]     = useState(false);
  const [creatingQ, setCreatingQ]               = useState<number | 'standalone' | null>(null); // annualGoalId or 'standalone'

  // Annual form
  const [aTitle, setATitle]       = useState('');
  const [aDesc, setADesc]         = useState('');
  const [aYear, setAYear]         = useState(String(new Date().getFullYear()));
  const [aDate, setADate]         = useState('');
  const [aTasks, setATasks]       = useState<string[]>([]);

  // Quarterly form
  const [qTitle, setQTitle]       = useState('');
  const [qDesc, setQDesc]         = useState('');
  const [qQuarter, setQQuarter]   = useState('');
  const [qDate, setQDate]         = useState('');
  const [qTasks, setQTasks]       = useState<string[]>([]);

  const toggleAnnual = (id: number) => setExpandedAnnual(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleQ      = (id: number) => setExpandedQ(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const createAnnual = async () => {
    if (!aTitle.trim()) return;
    const time = Date.now();
    const annualGoalId = await db.annualGoals.add({
      title: aTitle.trim().toUpperCase(), description: aDesc || undefined,
      year: Number(aYear) || new Date().getFullYear(),
      status: 'active',
      targetDate: aDate ? new Date(aDate).getTime() : undefined,
      createdAt: time,
    });
    
    if (aTasks.length > 0) {
      const taskObjects = aTasks.filter(t => t.trim() !== '').map(label => ({
        label: label.trim().toUpperCase(),
        status: 'pending' as const,
        priority: 'MED' as const,
        annualGoalId: annualGoalId as number,
        createdAt: time,
      }));
      if (taskObjects.length > 0) await db.tasks.bulkAdd(taskObjects);
    }
    
    setATitle(''); setADesc(''); setADate(''); setATasks([]); setCreatingAnnual(false);
  };

  const createQuarterly = async (annualGoalId?: number) => {
    if (!qTitle.trim()) return;
    const time = Date.now();
    const quarterlyGoalId = await db.quarterlyGoals.add({
      title: qTitle.trim().toUpperCase(), description: qDesc || undefined,
      quarter: qQuarter || `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
      annualGoalId,
      status: 'active',
      targetDate: qDate ? new Date(qDate).getTime() : undefined,
      createdAt: time,
    });
    
    if (qTasks.length > 0) {
      const taskObjects = qTasks.filter(t => t.trim() !== '').map(label => ({
        label: label.trim().toUpperCase(),
        status: 'pending' as const,
        priority: 'MED' as const,
        quarterlyGoalId: quarterlyGoalId as number,
        annualGoalId,
        createdAt: time,
      }));
      if (taskObjects.length > 0) await db.tasks.bulkAdd(taskObjects);
    }
    
    setQTitle(''); setQDesc(''); setQQuarter(''); setQDate(''); setQTasks([]); setCreatingQ(null);
  };

  const deleteAnnual     = async (id?: number) => { if (id) await db.annualGoals.delete(id); };
  const deleteQuarterly  = async (id?: number) => { if (id) await db.quarterlyGoals.delete(id); };

  const toggleTask = async (taskObj: import('../../lib/db').Task) => {
    if (!taskObj.id) return;
    await db.tasks.update(taskObj.id, taskObj.status === 'done'
      ? { status: 'pending', completedAt: undefined }
      : { status: 'done', completedAt: Date.now() });
  };

  // Compute progress for a quarterly goal
  const qProgress = (qId: number) => {
    const tasks = allTasks.filter(t => t.quarterlyGoalId === qId);
    if (!tasks.length) return 0;
    return Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100);
  };

  // Compute overall progress for an annual goal
  const annualProgress = (aId: number) => {
    const tasks = allTasks.filter(t => t.annualGoalId === aId);
    if (!tasks.length) return 0;
    return Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100);
  };

  const standaloneQ = quarterlyGoals.filter(q => !q.annualGoalId);

  const QForm = ({ annualId }: { annualId?: number }) => (
    <div className="mt-3 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
      style={{ background: '#161820', border: '1px solid rgba(0,219,233,0.1)', borderLeft: '2px solid #00dbe9' }}>
      {[
        { label: 'Goal Title', val: qTitle, set: setQTitle, ph: 'LAUNCH_VECTOR_V1' },
        { label: 'Quarter',    val: qQuarter, set: setQQuarter, ph: 'Q3 2025' },
        { label: 'Target Date (optional)', val: qDate, set: setQDate, ph: '', type: 'date' },
        { label: 'Description (optional)', val: qDesc, set: setQDesc, ph: 'Key outcome...' },
      ].map(f => (
        <div key={f.label} className="flex flex-col gap-1">
          <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant">{f.label}</span>
          <input type={f.type ?? 'text'} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
            className="bg-transparent border-b border-surface-container-highest font-headline font-bold text-sm text-primary placeholder:text-on-surface-variant/30 outline-none py-1.5 uppercase" />
        </div>
      ))}
      {/* Subtasks array input */}
      <div className="sm:col-span-2 flex flex-col gap-2 mt-2">
        <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">Breakdown / Steps</span>
        {qTasks.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-4 h-4 border border-outline-variant flex-shrink-0" />
            <input value={t} onChange={e => {
              const nt = [...qTasks]; nt[i] = e.target.value; setQTasks(nt);
            }} placeholder={`Step ${i+1}`} className="flex-1 bg-transparent border-b border-surface-container-highest font-headline font-bold text-xs text-primary placeholder:text-on-surface-variant/30 outline-none py-1 uppercase" />
            <button onClick={() => setQTasks(qTasks.filter((_, idx) => idx !== i))} className="w-6 h-6 flex items-center justify-center text-outline/30 hover:text-error transition"><Trash2 size={12}/></button>
          </div>
        ))}
        <button onClick={() => setQTasks([...qTasks, ''])} className="self-start flex items-center gap-1.5 mt-1 px-3 py-1 font-headline font-bold text-[9px] text-primary-fixed-dim uppercase tracking-widest focus:outline-none" style={{ border: '1px dashed rgba(0,219,233,0.3)' }}><Plus size={10}/> Add Step</button>
      </div>

      <div className="sm:col-span-2 flex gap-2 mt-4">
        <button onClick={() => createQuarterly(annualId)}
          className="px-5 py-2 font-headline font-black text-xs uppercase tracking-widest active:scale-95"
          style={{ background: '#00dbe9', color: '#002022' }}>Add Goal</button>
        <button onClick={() => { setCreatingQ(null); setQTasks([]); }}
          className="px-5 py-2 font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary"
          style={{ border: '1px solid #282a2e' }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-headline font-black text-xl text-primary uppercase tracking-tight">Goal Hierarchy</h2>
        <button onClick={() => setCreatingAnnual(!creatingAnnual)}
          className="flex items-center gap-1.5 px-3 py-2 font-headline font-bold text-[10px] text-primary-fixed-dim uppercase tracking-widest hover:bg-surface-container-high transition-all"
          style={{ border: '1px solid rgba(0,219,233,0.2)' }}>
          <Plus size={12} /> New Annual Goal
        </button>
      </div>

      {/* Annual goal form */}
      {creatingAnnual && (
        <div className="mb-6 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
          style={{ background: '#1e2024', border: '1px solid rgba(0,219,233,0.15)', borderLeft: '2px solid #00f0ff' }}>
          {[
            { label: 'Annual Goal Title', val: aTitle, set: setATitle, ph: 'BUILD_AND_SCALE_VECTOR_OS' },
            { label: 'Year', val: aYear, set: setAYear, ph: '2025' },
            { label: 'Target Date (optional)', val: aDate, set: setADate, ph: '', type: 'date' },
            { label: 'Description (optional)', val: aDesc, set: setADesc, ph: 'What does success look like?' },
          ].map(f => (
            <div key={f.label} className="flex flex-col gap-1">
              <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant">{f.label}</span>
              <input type={f.type ?? 'text'} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="bg-transparent border-b border-surface-container-highest font-headline font-bold text-sm text-primary placeholder:text-on-surface-variant/30 outline-none py-1.5 uppercase" />
            </div>
          ))}

          {/* Special Annual Level Tasks (Steps) */}
          <div className="sm:col-span-2 flex flex-col gap-2 mt-2">
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant mb-1">Direct Master Tasks / Steps</span>
            {aTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-4 h-4 border border-outline-variant flex-shrink-0" />
                <input value={t} onChange={e => {
                  const nt = [...aTasks]; nt[i] = e.target.value; setATasks(nt);
                }} placeholder={`Step ${i+1}`} className="flex-1 bg-transparent border-b border-surface-container-highest font-headline font-bold text-xs text-primary placeholder:text-on-surface-variant/30 outline-none py-1 uppercase" />
                <button onClick={() => setATasks(aTasks.filter((_, idx) => idx !== i))} className="w-6 h-6 flex items-center justify-center text-outline/30 hover:text-error transition"><Trash2 size={12}/></button>
              </div>
            ))}
            <button onClick={() => setATasks([...aTasks, ''])} className="self-start flex items-center gap-1.5 mt-1 px-3 py-1 font-headline font-bold text-[9px] text-primary-fixed-dim uppercase tracking-widest focus:outline-none" style={{ border: '1px dashed rgba(0,219,233,0.3)' }}><Plus size={10}/> Add Step</button>
          </div>

          <div className="sm:col-span-2 flex gap-2 mt-4">
            <button onClick={createAnnual}
              className="px-6 py-2.5 font-headline font-black text-xs uppercase tracking-widest active:scale-95"
              style={{ background: '#00f0ff', color: '#002022' }}>Create Goal</button>
            <button onClick={() => { setCreatingAnnual(false); setATasks([]); }}
              className="px-6 py-2.5 font-headline font-bold text-xs uppercase text-on-surface-variant hover:text-primary"
              style={{ border: '1px solid #282a2e' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Annual goals list */}
      <div className="space-y-4">
        {annualGoals.map(ag => {
          const prog   = annualProgress(ag.id!);
          const linked = quarterlyGoals.filter(q => q.annualGoalId === ag.id);
          const open   = expandedAnnual.has(ag.id!);
          const sprints = allSprints.filter(s => s.annualGoalId === ag.id);
          return (
            <div key={ag.id} style={{ background: '#1a1c20', border: '1px solid rgba(0,219,233,0.08)', borderLeft: '3px solid #00f0ff' }}>
              {/* Annual row */}
              <div className="p-5 group">
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleAnnual(ag.id!)} className="mt-1 text-primary-fixed-dim flex-shrink-0">
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-body text-[9px] font-bold text-primary-fixed-dim uppercase tracking-widest">{ag.year}</span>
                      {ag.targetDate && <span className="text-[8px] font-bold px-2 py-0.5 border text-primary-fixed-dim border-primary/20">{daysLeft(ag.targetDate)}</span>}
                      <span className={`text-[8px] font-bold px-2 py-0.5 border ${ag.status === 'done' ? 'text-secondary border-secondary/20' : ag.status === 'at-risk' ? 'text-error border-error/30' : 'text-outline border-outline-variant'}`}>{ag.status.toUpperCase()}</span>
                    </div>
                    <div className="font-headline font-bold text-lg text-on-surface uppercase tracking-tight">{ag.title}</div>
                    {ag.description && <div className="font-body text-xs text-on-surface-variant mt-0.5 leading-relaxed">{ag.description}</div>}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1 bg-surface-container-highest overflow-hidden">
                        <div className="h-full transition-all duration-700" style={{ width: `${prog}%`, background: prog >= 80 ? '#00e475' : '#00f0ff', boxShadow: '0 0 6px rgba(0,240,255,0.4)' }} />
                      </div>
                      <span className="font-headline font-bold text-xs text-primary-fixed-dim tabular-nums">{prog}%</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-on-surface-variant">
                      <span>{linked.length} quarterly goals</span>
                      <span>·</span>
                      <span>{sprints.length} sprints</span>
                      <span>·</span>
                      <span>{allTasks.filter(t => t.annualGoalId === ag.id).length} tasks</span>
                    </div>
                  </div>
                  <button onClick={() => deleteAnnual(ag.id)}
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-outline/30 hover:text-error/70 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Expanded view */}
              {open && (
                <div className="border-t border-surface-container-high/50 px-5 py-4 space-y-3">
                  
                  {/* Scope: Direct Annual Tasks */}
                  {(() => {
                    const aTasksList = allTasks.filter(t => t.annualGoalId === ag.id && !t.quarterlyGoalId && !t.sprintId);
                    if (aTasksList.length === 0) return null;
                    return (
                      <div className="mb-4">
                        <div className="font-headline font-bold text-[9px] text-primary-fixed-dim uppercase tracking-widest mb-2">Direct Master Tasks</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {aTasksList.map(t => (
                            <div key={t.id} className="flex items-center gap-2 py-1 group cursor-pointer" onClick={() => toggleTask(t)}>
                              <div className={`w-3 h-3 flex items-center justify-center border transition-all ${t.status === 'done' ? 'border-secondary bg-secondary/10 text-secondary' : 'border-outline-variant hover:border-primary'}`}>
                                {t.status === 'done' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2 h-2"><polyline points="20 6 9 17 4 12" /></svg>}
                              </div>
                              <span className={`font-headline font-bold text-[10px] uppercase tracking-tight truncate transition-colors ${t.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface-variant group-hover:text-primary'}`}>
                                {t.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Scope: Quarterly Goals */}
                  {linked.map(qg => {
                    const qProg    = qProgress(qg.id!);
                    const qOpen    = expandedQ.has(qg.id!);
                    const qTasks   = allTasks.filter(t => t.quarterlyGoalId === qg.id);
                    const qSprints = allSprints.filter(s => s.quarterlyGoalId === qg.id);
                    return (
                      <div key={qg.id} style={{ background: '#13151a', border: '1px solid rgba(0,219,233,0.05)', borderLeft: '2px solid #00dbe9' }}>
                        <div className="p-4 group">
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggleQ(qg.id!)} className="mt-0.5 text-primary flex-shrink-0">
                              {qOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <span className="font-body text-[9px] font-bold text-on-surface-variant uppercase">{qg.quarter}</span>
                                {qg.targetDate && <span className="text-[8px] font-bold text-on-surface-variant/60">{daysLeft(qg.targetDate)}</span>}
                              </div>
                              <div className={`font-headline font-bold text-sm uppercase tracking-tight ${qg.status === 'done' ? 'text-on-surface-variant/50 line-through' : 'text-on-surface'}`}>
                                {qg.title}
                              </div>
                              <div className="mt-2 flex items-center gap-3">
                                <div className="flex-1 h-0.5 bg-surface-container-highest overflow-hidden">
                                  <div className="h-full transition-all" style={{ width: `${qProg}%`, background: qProg >= 80 ? '#00e475' : '#00dbe9' }} />
                                </div>
                                <span className="font-headline font-bold text-[10px] text-primary tabular-nums">{qProg}%</span>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-2 text-[9px] text-on-surface-variant/60">
                                <span>{qTasks.filter(t => t.status === 'done').length}/{qTasks.length} tasks</span>
                                <span>·</span>
                                <span>{qSprints.length} sprint{qSprints.length !== 1 ? 's' : ''}</span>
                                {qg.targetDate && <><span>·</span><span>Target: {fmtDate(qg.targetDate)}</span></>}
                              </div>
                            </div>
                            <button onClick={() => deleteQuarterly(qg.id)}
                              className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-outline/30 hover:text-error/70 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* Task breakdown */}
                        {qOpen && qTasks.length > 0 && (
                          <div className="px-4 pb-4 border-t border-surface-container-highest/40">
                            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {qTasks.map(t => (
                                <div key={t.id} className="flex items-center gap-2 py-1 group cursor-pointer" onClick={() => toggleTask(t)}>
                                  <div className={`w-3 h-3 flex items-center justify-center border transition-all ${t.status === 'done' ? 'border-secondary bg-secondary/10 text-secondary' : 'border-outline-variant hover:border-primary'}`}>
                                    {t.status === 'done' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2 h-2"><polyline points="20 6 9 17 4 12" /></svg>}
                                  </div>
                                  <span className={`font-headline font-bold text-[10px] uppercase tracking-tight truncate transition-colors ${t.status === 'done' ? 'text-on-surface-variant/40 line-through' : 'text-on-surface-variant group-hover:text-primary'}`}>
                                    {t.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add quarterly goal button */}
                  {creatingQ === ag.id ? (
                    <QForm annualId={ag.id} />
                  ) : (
                    <button onClick={() => setCreatingQ(ag.id!)}
                      className="w-full py-2.5 flex items-center justify-center gap-1.5 font-headline font-bold text-[9px] text-primary/60 uppercase tracking-widest hover:text-primary transition-colors"
                      style={{ border: '1px dashed rgba(0,219,233,0.15)' }}>
                      <Plus size={10} /> Add Quarterly Goal
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Standalone quarterly goals */}
      {standaloneQ.length > 0 && (
        <div className="mt-8">
          <div className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
            Standalone Quarterly Goals
          </div>
          <div className="space-y-2">
            {standaloneQ.map(qg => (
              <div key={qg.id} className="flex items-center justify-between p-4 group"
                style={{ background: '#1a1c20', border: '1px solid rgba(0,219,233,0.06)', borderLeft: '2px solid #00dbe9' }}>
                <div className="flex-1 min-w-0">
                  <div className="font-headline font-bold text-sm text-on-surface uppercase tracking-tight">{qg.title}</div>
                  <div className="font-body text-[9px] text-on-surface-variant mt-0.5">{qg.quarter}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-headline font-bold text-xs text-primary tabular-nums">{qProgress(qg.id!)}%</span>
                  <button onClick={() => deleteQuarterly(qg.id)}
                    className="w-6 h-6 flex items-center justify-center text-outline/30 hover:text-error/70 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {annualGoals.length === 0 && standaloneQ.length === 0 && !creatingAnnual && (
        <div className="py-12 text-center" style={{ border: '1px dashed rgba(0,219,233,0.1)' }}>
          <Target size={24} className="text-primary/20 mx-auto mb-3" />
          <div className="font-headline font-bold text-xs text-on-surface-variant/50 uppercase tracking-widest">No goals yet</div>
          <div className="font-body text-[10px] text-on-surface-variant/30 mt-1">Create your first annual goal above — then break it down into quarters, sprints, and tasks.</div>
        </div>
      )}

      {/* Standalone quarterly add button */}
      {annualGoals.length > 0 && (
        <div className="mt-6">
          {creatingQ === 'standalone' ? (
            <QForm />
          ) : (
            <button onClick={() => setCreatingQ('standalone')}
              className="w-full py-3 flex items-center justify-center gap-1.5 font-headline font-bold text-[9px] text-on-surface-variant/50 uppercase tracking-widest hover:text-primary transition-colors"
              style={{ border: '1px dashed rgba(0,219,233,0.1)' }}>
              <Plus size={10} /> Add Standalone Quarterly Goal
            </button>
          )}
        </div>
      )}
    </div>
  );
};
