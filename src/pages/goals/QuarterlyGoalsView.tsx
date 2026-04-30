import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../../lib/DbContext';
import { type QuarterlyGoal } from '../../lib/db';
import { Plus, Trash2, Activity, Target, Check } from 'lucide-react';
import { useToast } from '../../components/ToastContext';
import { nowMs } from '../../lib/time';

const PILLARS = ['CRAFT', 'FINANCE', 'HEALTH', 'SOCIAL', 'CHARACTER', 'OTHER'] as const;

export const QuarterlyGoalsView = () => {
  const { db, isTestMode } = useDb();
  const { showToast } = useToast();

  const quarterlyGoals = useLiveQuery(() => db.quarterlyGoals.toArray(), [isTestMode]) ?? [];
  const allTasks       = useLiveQuery(() => db.tasks.toArray(), [isTestMode]) ?? [];
  const annualGoals    = useLiveQuery(() => db.annualGoals.toArray(), [isTestMode]) ?? [];

  const [creatingGoal, setCreatingGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [goalTitle, setGoalTitle]       = useState('');
  const [goalIsPinned, setGoalIsPinned] = useState(false);
  const [goalCategory, setGoalCategory] = useState<QuarterlyGoal['category']>('CRAFT');
  const [goalAnnualId, setGoalAnnualId] = useState<number | undefined>();
  const [krInputs, setKrInputs]         = useState<Record<number, string>>({});

  const saveGoal = async () => {
    if (!goalTitle.trim()) return;
    const now = nowMs();
    if (editingGoalId) {
      await db.quarterlyGoals.update(editingGoalId, { 
        title: goalTitle.trim().toUpperCase(), 
        isPinned: goalIsPinned, 
        category: goalCategory,
        annualGoalId: goalAnnualId,
        updatedAt: Date.now() 
      });
      showToast('Objective Updated', 'success');
    } else {
      const activeCount = quarterlyGoals.filter(q => q.status === 'active').length;
      if (activeCount >= 3) {
        showToast('Max 3 active objectives allowed', 'error');
        return;
      }
      await db.quarterlyGoals.add({
        title: goalTitle.trim().toUpperCase(), status: 'active', isPinned: goalIsPinned,
        category: goalCategory, annualGoalId: goalAnnualId,
        quarter: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
        createdAt: now, updatedAt: now
      });
      showToast('Tactical Objective Established', 'success');
    }
    setGoalTitle(''); setGoalIsPinned(false); setEditingGoalId(null); setCreatingGoal(false);
  };

  const deleteGoal = async (id: number) => {
    if (confirm("Terminate this objective? Linked sprints will persist.")) {
      await db.quarterlyGoals.delete(id);
      showToast('Objective Terminated', 'info');
    }
  };

  const addKr = async (qgId: number) => {
    const text = (krInputs[qgId] || '').trim();
    if (!text) return;
    const qg = await db.quarterlyGoals.get(qgId);
    if (!qg) return;
    const keyResults = qg.keyResults || [];
    keyResults.push({ id: Date.now().toString(), title: text, done: false });
    await db.quarterlyGoals.update(qgId, { keyResults, updatedAt: Date.now() });
    setKrInputs({ ...krInputs, [qgId]: '' });
  };

  const toggleKr = async (qgId: number, krId: string) => {
    const qg = await db.quarterlyGoals.get(qgId);
    if (!qg) return;
    const keyResults = (qg.keyResults || []).map(kr => kr.id === krId ? { ...kr, done: !kr.done } : kr);
    await db.quarterlyGoals.update(qgId, { keyResults, updatedAt: Date.now() });
  };

  const deleteKr = async (qgId: number, krId: string) => {
    const qg = await db.quarterlyGoals.get(qgId);
    if (!qg) return;
    const keyResults = (qg.keyResults || []).filter(kr => kr.id !== krId);
    await db.quarterlyGoals.update(qgId, { keyResults, updatedAt: Date.now() });
  };

  return (
    <div className="pb-24 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-headline font-black text-2xl text-on-surface uppercase tracking-tight flex items-center gap-2">
            <Target size={22} className="text-primary" /> Quarterly Objectives
          </h2>
          <p className="font-body text-[10px] text-on-surface-variant/50 uppercase tracking-widest mt-0.5">
            12-Week Execution Directives
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
        {quarterlyGoals.map(qg => {
          const qgTasks = allTasks.filter(t => t.quarterlyGoalId === qg.id);
          const qgDone = qgTasks.filter(t => t.status === 'done').length;
          const qgPct = qgTasks.length ? Math.round((qgDone / qgTasks.length) * 100) : 0;
          const isPrimary = qg.isPinned;

          return (
            <div key={qg.id} className={`relative bg-[#1a1c22] rounded-2xl p-6 border transition-all duration-300 group ${isPrimary ? 'border-primary/40 shadow-[0_0_30px_rgba(0,219,233,0.05)]' : 'border-white/5 shadow-xl'}`}>
              <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[7px] font-black uppercase tracking-widest border border-primary/20">{qg.category ?? 'Life'}</span>
                      <span className={`font-headline font-black text-[9px] uppercase tracking-[0.2em] ${isPrimary ? 'text-primary' : 'text-on-surface-variant/30'}`}>
                        {isPrimary ? 'Primary_Objective' : 'Tactical_Target'}
                      </span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingGoalId(qg.id!); setGoalTitle(qg.title); setGoalIsPinned(!!qg.isPinned); setGoalCategory(qg.category ?? 'CRAFT'); setGoalAnnualId(qg.annualGoalId); setCreatingGoal(true); }} className="p-1.5 rounded-lg hover:bg-white/5 text-on-surface-variant/20 hover:text-primary transition-colors">
                        <Activity size={12} />
                      </button>
                      <button onClick={() => deleteGoal(qg.id!)} className="p-1.5 rounded-lg hover:bg-white/5 text-on-surface-variant/20 hover:text-error transition-colors">
                        <Trash2 size={12} />
                      </button>
                  </div>
              </div>
              <h3 className={`font-headline font-black text-lg uppercase tracking-tight leading-tight mb-4 ${isPrimary ? 'text-on-surface' : 'text-on-surface-variant/80'}`}>
                {qg.title}
              </h3>
              <div className="flex items-end justify-between mb-2">
                  <span className="font-headline font-black text-[10px] text-on-surface-variant/40 uppercase tracking-widest">{qgTasks.length} Directive_Nodes</span>
                  <span className={`font-headline font-black text-lg tabular-nums ${isPrimary ? 'text-primary' : 'text-secondary'}`}>{qgPct}%</span>
              </div>
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 mb-4">
                  <div className={`h-full transition-all duration-1000 ${isPrimary ? 'bg-primary shadow-[0_0_10px_rgba(0,219,233,0.2)]' : 'bg-secondary/60'}`} style={{ width: `${qgPct}%` }} />
              </div>

              {/* Key Results Section */}
              <div className="border-t border-white/5 pt-4">
                  <div className="font-headline font-black text-[9px] text-on-surface-variant/40 uppercase tracking-widest mb-3">Key Results / Action Steps</div>
                  <div className="space-y-2 mb-3">
                    {(qg.keyResults || []).map(kr => (
                      <div key={kr.id} className="flex items-start gap-2 group/kr">
                        <button onClick={() => toggleKr(qg.id!, kr.id)} className={`mt-0.5 w-3 h-3 rounded-sm flex items-center justify-center shrink-0 border transition-all ${kr.done ? 'bg-primary/20 border-primary text-primary' : 'border-on-surface-variant/30 text-transparent hover:border-primary/50'}`}>
                            <Check size={8} />
                        </button>
                        <span className={`font-body text-xs ${kr.done ? 'text-on-surface-variant/30 line-through' : 'text-on-surface-variant/80'} flex-1 leading-tight`}>{kr.title}</span>
                        <button onClick={() => deleteKr(qg.id!, kr.id)} className="opacity-0 group-hover/kr:opacity-100 transition-opacity text-on-surface-variant/30 hover:text-error shrink-0">
                            <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Plus size={10} className="text-on-surface-variant/30 shrink-0" />
                    <input 
                        value={krInputs[qg.id!] || ''} 
                        onChange={e => setKrInputs({...krInputs, [qg.id!]: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && addKr(qg.id!)}
                        placeholder="Add action step..."
                        className="bg-transparent text-xs font-body text-on-surface outline-none placeholder:text-on-surface-variant/30 flex-1"
                    />
                  </div>
              </div>
            </div>
          );
        })}

        {quarterlyGoals.length < 3 && !creatingGoal && (
            <button onClick={() => setCreatingGoal(true)} className="h-full min-h-[140px] rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-3 text-on-surface-variant/20 hover:text-primary hover:border-primary/20 hover:bg-primary/[0.02] transition-all group">
              <Plus size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-headline font-black text-[9px] uppercase tracking-[0.3em]">Establish_Directives</span>
            </button>
        )}

        {creatingGoal && (
            <div className="lg:col-span-3 bg-[#1a1c22] rounded-2xl p-8 border border-primary/30 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3 mb-6">
                  <Target size={20} className="text-primary" />
                  <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight">{editingGoalId ? 'Modify_Directive' : 'Establish_Tactical_Directive'}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="md:col-span-2">
                    <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Directive_Identifier</span>
                    <input autoFocus value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="MISSION_TITLE..." className="w-full mt-1 bg-black/20 rounded-xl px-6 py-4 font-headline font-black text-xl text-primary uppercase border border-white/5 outline-none focus:border-primary/40" />
                  </div>
                  <div>
                    <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Sector_Pillar</span>
                    <select value={goalCategory} onChange={e => setGoalCategory(e.target.value as any)} className="w-full mt-1 bg-black/20 rounded-xl px-6 py-4 font-headline font-black text-sm text-primary uppercase border border-white/5 outline-none">
                        {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Macro_Goal_Sync (Annual)</span>
                    <select value={goalAnnualId ?? ''} onChange={e => setGoalAnnualId(Number(e.target.value) || undefined)} className="w-full mt-1 bg-black/20 rounded-xl px-6 py-4 font-headline font-black text-sm text-primary uppercase border border-white/5 outline-none">
                        <option value="">Standalone</option>
                        {annualGoals.map(ag => <option key={ag.id} value={ag.id}>{ag.title}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-4 px-6 py-4 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                      <input type="checkbox" checked={goalIsPinned} onChange={e => setGoalIsPinned(e.target.checked)} className="w-5 h-5 accent-primary" />
                      <span className="font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant/60">Primary_Quarterly_Mission</span>
                    </label>
                  </div>
              </div>
              <div className="flex gap-4">
                  <button onClick={saveGoal} className="px-10 py-4 rounded-xl font-headline font-black text-xs uppercase tracking-widest text-black shadow-xl" style={{ background: '#00dbe9' }}>Confirm_Protocol</button>
                  <button onClick={() => { setCreatingGoal(false); setEditingGoalId(null); setGoalTitle(''); }} className="px-10 py-4 rounded-xl glass font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant/40">Abort</button>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};
