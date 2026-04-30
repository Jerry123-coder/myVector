import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../../lib/DbContext';
import { GoalDetailOverlay } from '../../components/layout/GoalDetailOverlay';
import {
  Plus, Target, Clock, Circle, Rocket, Globe,
  Trophy, AlertTriangle, TrendingUp, TrendingDown,
  Activity, BarChart3, Flame, Minus, ArrowRight, Edit3, ListChecks,
} from 'lucide-react';
import { useToast } from '../../components/ToastContext';
import { nowMs } from '../../lib/time';
import type { AnnualGoal } from '../../lib/db';

const daysLeft = (ms: number | undefined, ref: number) => {
  if (!ms) return null;
  const d = Math.ceil((ms - ref) / 86400000);
  if (d > 0) return { label: `${d}d left`, color: d < 14 ? 'text-error' : 'text-on-surface-variant/50', urgent: d < 14 };
  if (d === 0) return { label: 'Due Today', color: 'text-tertiary-fixed-dim', urgent: true };
  return { label: 'Overdue', color: 'text-error', urgent: true };
};

const CAT_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  CRAFT:     { bg: 'bg-primary/10',              text: 'text-primary',           border: 'border-primary/30',             glow: 'rgba(0,219,233,0.2)' },
  FINANCE:   { bg: 'bg-secondary/10',            text: 'text-secondary',         border: 'border-secondary/30',           glow: 'rgba(0,228,117,0.2)' },
  HEALTH:    { bg: 'bg-[rgba(0,255,120,0.08)]',  text: 'text-[#00ff78]',         border: 'border-[rgba(0,255,120,0.25)]', glow: 'rgba(0,255,120,0.2)' },
  SOCIAL:    { bg: 'bg-tertiary-fixed-dim/10',   text: 'text-tertiary-fixed-dim',border: 'border-tertiary-fixed-dim/30',  glow: 'rgba(255,186,56,0.2)' },
  CHARACTER: { bg: 'bg-[rgba(180,100,255,0.08)]',text: 'text-[#b464ff]',         border: 'border-[rgba(180,100,255,0.25)]',glow:'rgba(180,100,255,0.2)' },
  OTHER:     { bg: 'bg-surface-container-high',  text: 'text-on-surface-variant',border: 'border-outline-variant/30',     glow: 'rgba(100,100,100,0.1)' },
};

const ProgressRing = ({ pct, color }: { pct: number; color: string }) => {
  const r = 34; const circ = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" className="-rotate-90" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
      <circle cx="44" cy="44" r={r} fill="none" strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={circ - (circ * pct) / 100}
        strokeLinecap="round"
        style={{ stroke: color, filter: `drop-shadow(0 0 6px ${color}aa)`, transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
      />
    </svg>
  );
};

export const StrategyView = () => {
  const [now] = useState(() => Date.now());
  const { db, isTestMode } = useDb();
  const { showToast } = useToast();

  const annualGoals    = useLiveQuery(() => db.annualGoals.where('status').equals('active').toArray(), [isTestMode]) ?? [];
  const allTasks       = useLiveQuery(() => db.tasks.toArray(), [isTestMode]) ?? [];
  const activeSprints  = useLiveQuery(() => db.sprints.where('status').equals('active').toArray(), [isTestMode]) ?? [];
  const quarterlyGoals = useLiveQuery(() => db.quarterlyGoals.toArray(), [isTestMode]) ?? [];
  const multiYearGoals = useLiveQuery(() => db.multiYearGoals.toArray(), [isTestMode]) ?? [];

  const [selectedGoal, setSelectedGoal] = useState<{ id: number; type: 'annual' | 'quarterly' } | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [aCategory, setACategory] = useState<AnnualGoal['category']>('CRAFT');
  const [goalMultiYearId, setGoalMultiYearId] = useState<number | undefined>();
  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);

  const createGoal = async () => {
    if (!title.trim()) return;
    await db.annualGoals.add({ title: title.trim().toUpperCase(), category: aCategory, multiYearGoalId: goalMultiYearId, year: new Date().getFullYear(), status: 'active', createdAt: nowMs(), updatedAt: Date.now() });
    setTitle(''); setGoalMultiYearId(undefined); setCreating(false);
    showToast('Major Goal Synchronized', 'success');
  };

  const strategyGoals = annualGoals.slice(0, 4);

  const getGoalStats = (g: AnnualGoal) => {
    const tasks   = allTasks.filter(t => t.annualGoalId === g.id);
    const done    = tasks.filter(t => t.status === 'done').length;
    const pct     = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    const objLeft = tasks.length - done;
    const dl      = daysLeft(g.targetDate, now);
    const linkedQ = quarterlyGoals.find(q => q.annualGoalId === g.id);
    const linkedSprint = activeSprints.find(s => (linkedQ && s.quarterlyGoalId === linkedQ.id) || s.annualGoalId === g.id);
    const isDone  = g.status === 'done' || pct === 100;
    const health  = isDone ? 'done' : pct >= 60 ? 'on-track' : pct >= 30 ? 'caution' : 'at-risk';
    return { tasks, done, pct, objLeft, dl, linkedSprint, isDone, health };
  };

  // ── Dashboard Metrics ───────────────────────────────────
  const allStats = strategyGoals.map(g => ({ g, ...getGoalStats(g) }));
  const onTrack  = allStats.filter(s => s.health === 'on-track' || s.health === 'done').length;
  const atRisk   = allStats.filter(s => s.health === 'at-risk').length;
  const totalPct = strategyGoals.length ? Math.round(allStats.reduce((acc, s) => acc + s.pct, 0) / strategyGoals.length) : 0;
  const nextDeadline = strategyGoals
    .filter(g => g.targetDate && g.targetDate > now)
    .sort((a, b) => (a.targetDate ?? Infinity) - (b.targetDate ?? Infinity))[0];
  const nextDL = nextDeadline ? Math.ceil(((nextDeadline.targetDate ?? 0) - now) / 86400000) : null;

  const HEALTH_COLORS: Record<string, string> = {
    done:     '#00e475',
    'on-track': '#00dbe9',
    caution:  '#ffba38',
    'at-risk':'#ffb4ab',
  };

  return (
    <div className="pb-24 max-w-6xl mx-auto">

      {/* ═══════════════════════════════════════════════════
          SECTION HEADER
      ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-headline font-black text-2xl text-on-surface uppercase tracking-tight flex items-center gap-2">
            <Target size={22} className="text-primary" /> Major Goals
          </h2>
          <p className="font-body text-[10px] text-on-surface-variant/50 uppercase tracking-widest mt-0.5">
            Your 4 anchor objectives — full strategy dashboard
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="w-10 h-10 rounded-xl glass flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all">
          <Plus size={20} />
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════
          DASHBOARD METRICS BAND (only when goals exist)
      ═══════════════════════════════════════════════════ */}
      {strategyGoals.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Goals Health */}
          <div className="bg-[#1a1c22] rounded-2xl p-5 shadow-xl flex flex-col border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center">
                  <Activity size={16} className="text-secondary" />
                </div>
                <span className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40">Status_Check</span>
              </div>
              <div className="flex items-end gap-2 mt-auto">
                <span className="font-headline font-black text-4xl text-secondary leading-none">{onTrack}</span>
                <span className="font-body text-[11px] text-on-surface-variant/40 pb-0.5 font-bold uppercase tracking-widest">/ {strategyGoals.length} Peak</span>
              </div>
              {atRisk > 0 && (
                <div className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg bg-error/10 w-fit border border-error/20">
                  <AlertTriangle size={12} className="text-error" />
                  <span className="font-headline font-bold text-[10px] text-error uppercase tracking-widest">{atRisk} at risk</span>
                </div>
              )}
            </div>
          </div>

          {/* Overall Completion */}
          <div className="bg-[#1a1c22] rounded-2xl p-5 shadow-xl flex flex-col border border-white/5 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BarChart3 size={16} className="text-primary" />
                </div>
                <span className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40">Macro_Progress</span>
              </div>
              <span className="font-headline font-black text-4xl text-primary leading-none mt-auto tabular-nums">{totalPct}%</span>
              <div className="mt-4 h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
                <div className={`h-full rounded-full transition-all duration-1000 ${totalPct === 100 ? 'progress-shimmer-green' : 'bg-primary'}`} style={{ width: `${totalPct}%` }} />
              </div>
            </div>
          </div>

          {/* Momentum */}
          <div className="bg-[#1a1c22] rounded-2xl p-5 shadow-xl flex flex-col border border-white/5 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff9620]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-tertiary-fixed-dim/20 flex items-center justify-center">
                  {totalPct >= 50 ? <TrendingUp size={16} className="text-tertiary-fixed-dim" /> : <TrendingDown size={16} className="text-error" />}
                </div>
                <span className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40">Kinetic_Flow</span>
              </div>
              <div className="flex items-center gap-3 mt-auto">
                <Flame size={24} className={totalPct >= 60 ? 'text-[#ff9620]' : 'text-on-surface-variant/20'} />
                <span className={`font-headline font-black text-lg uppercase tracking-tight ${totalPct >= 60 ? 'text-[#ff9620]' : 'text-on-surface-variant/30'}`}>
                  {totalPct >= 75 ? 'Peak' : totalPct >= 50 ? 'Steady' : totalPct >= 25 ? 'Low' : 'Idle'}
                </span>
              </div>
            </div>
          </div>

          {/* Next Deadline */}
          <div className="bg-[#1a1c22] rounded-2xl p-5 shadow-xl flex flex-col border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-error/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-error/20 flex items-center justify-center">
                  <Clock size={16} className="text-error" />
                </div>
                <span className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40">Critical_Path</span>
              </div>
              {nextDL != null ? (
                <>
                  <span className={`font-headline font-black text-4xl leading-none mt-auto tabular-nums ${nextDL <= 14 ? 'text-error' : 'text-on-surface'}`}>{nextDL}d</span>
                  <span className="font-headline font-black text-[9px] text-on-surface-variant/40 mt-2 uppercase tracking-widest truncate block">{nextDeadline?.title?.slice(0, 20)}…</span>
                </>
              ) : (
                <span className="font-headline font-black text-lg text-on-surface-variant/20 mt-auto uppercase tracking-widest">Locked</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div className="mb-8 bg-[#1a1c22] rounded-2xl p-10 shadow-xl border border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Target size={20} className="text-primary" />
             </div>
             <h3 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight">Deploy New Objective</h3>
          </div>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createGoal()}
            placeholder="Goal_Directive_Identifier..."
            className="w-full bg-black/20 rounded-xl border border-white/5 px-6 py-4 font-headline font-black text-xl text-primary uppercase placeholder:text-primary/10 outline-none mb-8" />
          <div className="flex flex-wrap gap-3 mb-10">
            {(['CRAFT', 'FINANCE', 'HEALTH', 'SOCIAL', 'CHARACTER', 'OTHER'] as const).map(cat => {
              const c = CAT_COLORS[cat];
              const active = aCategory === cat;
              return (
                <button key={cat} onClick={() => setACategory(cat)}
                  className={`px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${active ? `bg-${c.text.replace('text-', '')} text-black border-transparent shadow-lg` : 'bg-white/5 border-white/5 text-on-surface-variant/40 hover:border-white/20'}`}>
                  {cat}
                </button>
              );
            })}
          </div>
          <div className="mb-10">
             <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/40 ml-1">Vision_Sync (Multi-Year)</span>
             <select value={goalMultiYearId ?? ''} onChange={e => setGoalMultiYearId(Number(e.target.value) || undefined)} className="w-full mt-2 bg-black/20 rounded-xl px-6 py-4 font-headline font-black text-sm text-primary uppercase border border-white/5 outline-none focus:border-primary/40 transition-colors">
                <option value="">Standalone Strategy</option>
                {multiYearGoals.map(mg => <option key={mg.id} value={mg.id}>{mg.title}</option>)}
             </select>
          </div>
          <div className="flex gap-4">
            <button onClick={createGoal} className="px-10 py-4 rounded-xl font-headline font-black text-xs uppercase tracking-[0.2em] text-black active:scale-95 transition-all shadow-xl" style={{ background: '#00dbe9' }}>
              Confirm_Deployment
            </button>
            <button onClick={() => setCreating(false)} className="px-10 py-4 rounded-xl font-headline font-black text-xs uppercase tracking-[0.2em] text-on-surface-variant/40 hover:text-on-surface transition-colors bg-white/5 border border-white/5">
              Abort
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          4-GOAL DASHBOARD GRID
      ═══════════════════════════════════════════════════ */}
      {strategyGoals.length === 0 && !creating ? (
        <div className="py-20 text-center border-2 border-dashed border-outline-variant/10 rounded-2xl">
          <Target size={40} className="mx-auto text-on-surface-variant/10 mb-4" />
          <div className="font-headline font-bold text-xs text-on-surface-variant/30 uppercase tracking-[0.4em]">No major goals yet</div>
          <button onClick={() => setCreating(true)} className="mt-4 px-6 py-2.5 rounded-xl font-headline font-black text-xs uppercase tracking-widest text-black active:scale-95" style={{ background: '#00dbe9' }}>
            Set First Goal
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 mb-10">
          {allStats.map(({ g, pct, dl, linkedSprint, isDone, health, tasks, done }) => {
            const cat    = g.category ?? 'OTHER';
            const colors = CAT_COLORS[cat] ?? CAT_COLORS.OTHER;
            const progressColor = HEALTH_COLORS[health];
            const isExpanded = expandedGoalId === g.id;

            return (
              <div key={g.id}
                className={`group relative bg-[#1a1c22] rounded-[2rem] border transition-all duration-500 overflow-hidden ${isExpanded ? 'border-primary/40 shadow-[0_0_40px_rgba(0,219,233,0.1)]' : 'border-white/5 shadow-xl hover:border-white/20'}`}
              >
                <div className="p-8">
                   <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                      {/* Left side: Category + Title */}
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-3 mb-4">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-md border-transparent ${colors.bg.replace('/10', '/100')} ${colors.text.replace('text-', 'text-black')}`}>
                              {cat}
                            </span>
                            {isDone && <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary text-black text-[8px] font-black uppercase tracking-widest shadow-md"><Trophy size={9} /> PEAK</span>}
                            {health === 'at-risk' && !isDone && <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-error text-black text-[8px] font-black uppercase tracking-widest shadow-md"><AlertTriangle size={9} /> AT_RISK</span>}
                         </div>
                         <h3 className={`font-headline font-black text-2xl lg:text-3xl uppercase tracking-tighter leading-none mb-3 ${isDone ? 'text-secondary/80' : 'text-on-surface'}`}>
                           {g.title}
                         </h3>
                         <div className="flex items-center gap-3 text-on-surface-variant/40">
                             {g.targetDate && dl && (
                               <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${dl.color}`}>
                                 <Clock size={12} />
                                 <span>{dl.label}</span>
                               </div>
                             )}
                             <span className="w-1 h-1 rounded-full bg-white/10" />
                             <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                               <Rocket size={12} className="text-secondary/60" />
                               <span>{linkedSprint ? linkedSprint.name : 'Phase_Idle'}</span>
                             </div>
                             {g.multiYearGoalId && (() => {
                               const mg = multiYearGoals.find(m => m.id === g.multiYearGoalId);
                               return mg ? (
                                 <>
                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary/60">
                                      <Globe size={12} />
                                      <span className="truncate max-w-[100px]">{mg.title}</span>
                                    </div>
                                 </>
                               ) : null;
                             })()}
                         </div>
                      </div>

                      {/* Right side: Sparkline + Progress */}
                      <div className="flex items-center gap-8 lg:gap-12">
                         {/* Sparkline Visual */}
                         <div className="hidden sm:block w-32 h-12 relative overflow-hidden">
                            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full opacity-40">
                               <path d={`M 0 30 Q 25 ${30 - 10}, 50 ${30 - 30} T 100 ${30 - pct / 3}`} 
                                     fill="none" stroke={progressColor} strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 bg-gradient-to-r from-[#1a1c22] via-transparent to-[#1a1c22]/20 pointer-events-none" />
                            <div className="text-[8px] font-black text-on-surface-variant/20 uppercase tracking-widest mt-1">Velocity_Feed</div>
                         </div>

                         <div className="flex items-center gap-6">
                            <div className="relative shrink-0 flex items-center justify-center w-[92px] h-[92px] bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                              <ProgressRing pct={pct} color={progressColor} />
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="font-headline font-black text-2xl tabular-nums leading-none tracking-tighter" style={{ color: progressColor }}>{pct}</span>
                                <span className="font-headline font-black text-[8px] uppercase tracking-widest text-on-surface-variant/30 mt-0.5">%</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                               <button onClick={() => setExpandedGoalId(isExpanded ? null : g.id!)}
                                 className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all ${isExpanded ? 'bg-primary text-black border-primary' : 'bg-white/5 border-white/5 text-on-surface-variant hover:border-primary/40 hover:text-primary'}`}>
                                  {isExpanded ? <Minus size={20} /> : <ArrowRight size={20} />}
                               </button>
                               <button onClick={() => setSelectedGoal({ id: g.id!, type: 'annual' })}
                                 className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#00dbe9]/10 border border-[#00dbe9]/20 text-[#00dbe9] hover:bg-[#00dbe9] hover:text-black transition-all">
                                  <Edit3 size={18} />
                               </button>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Expandable Details */}
                   {isExpanded && (
                      <div className="mt-10 pt-10 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div>
                               <h4 className="font-headline font-black text-[10px] uppercase tracking-[0.3em] text-on-surface-variant/40 mb-6 flex items-center gap-2">
                                  <ListChecks size={14} className="text-secondary" /> Active_Directives
                               </h4>
                               <div className="space-y-3">
                                  {tasks.filter(t => t.status !== 'done').slice(0, 4).map(t => (
                                     <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                                        <Circle size={10} className="text-on-surface-variant/20" />
                                        <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">{t.label}</span>
                                     </div>
                                  ))}
                                  {tasks.filter(t => t.status !== 'done').length === 0 && (
                                     <div className="p-6 text-center border border-dashed border-white/5 rounded-xl">
                                        <p className="text-[10px] font-bold text-on-surface-variant/20 uppercase tracking-widest">Standby_Mode</p>
                                     </div>
                                  )}
                               </div>
                            </div>

                            <div>
                               <h4 className="font-headline font-black text-[10px] uppercase tracking-[0.3em] text-on-surface-variant/40 mb-6 flex items-center gap-2">
                                  <Flame size={14} className="text-[#ff9620]" /> Momentum_Metrics
                               </h4>
                               <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5">
                                  <div className="flex justify-between items-center mb-6">
                                     <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase">Efficiency</span>
                                     <span className="text-xl font-headline font-black text-secondary tabular-nums">+{Math.round(pct * 0.8)}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden mb-6">
                                     <div className="h-full bg-secondary" style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="flex flex-col gap-3">
                                     <div className="flex justify-between items-center py-2 border-b border-white/5">
                                        <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase">Total Items</span>
                                        <span className="text-[11px] font-headline font-black text-on-surface uppercase tabular-nums">{tasks.length}</span>
                                     </div>
                                     <div className="flex justify-between items-center py-2">
                                        <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase">Completed</span>
                                        <span className="text-[11px] font-headline font-black text-secondary uppercase tabular-nums">{done}</span>
                                     </div>
                                  </div>
                               </div>
                            </div>

                            <div className="flex flex-col gap-6">
                               <h4 className="font-headline font-black text-[10px] uppercase tracking-[0.3em] text-on-surface-variant/40 mb-0 flex items-center gap-2">
                                  <Rocket size={14} className="text-primary" /> Integrated_Sync
                               </h4>
                               <div className="flex-1 rounded-2xl p-6 bg-primary/5 border border-primary/20 flex flex-col items-center justify-center text-center">
                                  <Activity size={24} className="text-primary mb-3" />
                                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase leading-relaxed mb-4">
                                     Execution remains steady. Sync with active sprint for peak efficiency.
                                  </p>
                                  <button onClick={() => setSelectedGoal({ id: g.id!, type: 'annual' })}
                                    className="w-full py-2.5 rounded-lg bg-primary text-black font-headline font-black text-[9px] uppercase tracking-widest shadow-lg">
                                    Deep_Manage
                                  </button>
                               </div>
                            </div>
                         </div>
                      </div>
                   )}
                </div>
              </div>
            );
          })}

          {/* Empty slot placeholders */}
          {Array.from({ length: Math.max(0, 4 - strategyGoals.length) }).map((_, i) => (
            <button key={`empty-${i}`} onClick={() => setCreating(true)}
              className="h-64 rounded-2xl border-2 border-dashed border-white/5 hover:border-primary/20 hover:bg-primary/[0.02] transition-all flex flex-col items-center justify-center gap-4 text-on-surface-variant/20 group">
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center group-hover:border-primary/40 group-hover:bg-primary/10 transition-all">
                <Plus size={24} className="group-hover:text-primary transition-colors" />
              </div>
              <span className="font-headline font-black text-[10px] uppercase tracking-[0.3em] group-hover:text-primary transition-colors">ESTABLISH_WINDOW</span>
            </button>
          ))}
        </div>
      )}

      {/* Detail Overlay */}
      <GoalDetailOverlay goalId={selectedGoal?.id ?? null} type={selectedGoal?.type ?? null} onClose={() => setSelectedGoal(null)} />
    </div>
  );
};
