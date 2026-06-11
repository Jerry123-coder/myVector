import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDb } from '../lib/DbContext';
import { Activity, Target, Zap, Shield, Heart, DollarSign, Cpu, Users, Timer, RefreshCw, RotateCcw } from 'lucide-react';
import { MetricsView } from './MetricsView';
import { useXP, ECONOMY_TIERS } from '../hooks/useXP';
import { useToast } from '../components/ToastContext';
import type { Route } from '../App';

const CATEGORIES = [
  { id: 'CRAFT',     label: 'Craft & Skills',     icon: Cpu,         color: 'text-primary',      bg: 'bg-primary'      },
  { id: 'FINANCE',   label: 'Financial Freedom',   icon: DollarSign,  color: 'text-emerald-400',  bg: 'bg-emerald-400'  },
  { id: 'HEALTH',    label: 'Vitality & Health',   icon: Heart,       color: 'text-error',         bg: 'bg-error'        },
  { id: 'SOCIAL',    label: 'Social & Family',     icon: Users,       color: 'text-[#00e475]',     bg: 'bg-[#00e475]'   },
  { id: 'CHARACTER', label: 'Character & Brand',   icon: Shield,      color: 'text-[#FFBA38]',     bg: 'bg-[#FFBA38]'   },
] as const;

interface Props { setRoute: (r: Route) => void; }

export const AnalyticsView = ({ setRoute }: Props) => {
  const { db, isTestMode } = useDb();
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'focus' | 'xp'>('xp');
  const [resetting, setResetting] = useState(false);

  const { totalXP, xpToday, currentTier, nextTier, currentStreak, last7DaysDoneCount } = useXP();

  // XP logs (real source of truth)
  const xpLogs = useLiveQuery(() => db.xpLogs.toArray(), [isTestMode]) ?? [];

  // Annual/quarterly for pillar health
  const quarterlyGoals = useLiveQuery(() => db.quarterlyGoals.toArray(), [isTestMode]) ?? [];
  const annualGoals    = useLiveQuery(() => db.annualGoals.toArray(),    [isTestMode]) ?? [];
  const allTasks       = useLiveQuery(() => db.tasks.toArray(),          [isTestMode]) ?? [];

  // ── 14-day XP chart from xpLogs ───────────────────────────────────────────
  const xpHistory = useMemo(() => {
    const history = [];
    const now = new Date();
    let maxXP = 1;
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const xp = xpLogs.filter(l => l.date === dateStr).reduce((s, l) => s + l.amount, 0);
      if (xp > maxXP) maxXP = xp;
      history.push({ date: d.toLocaleDateString('en-US', { weekday: 'short' }), fullDate: dateStr, xp });
    }
    return { history, maxXP };
  }, [xpLogs]);

  // ── XP breakdown by category ──────────────────────────────────────────────
  const breakdown = useMemo(() => {
    const habit       = xpLogs.filter(l => l.category === 'habit').reduce((s, l) => s + l.amount, 0);
    const bonus       = xpLogs.filter(l => l.category === 'bonus').reduce((s, l) => s + l.amount, 0);
    const project     = xpLogs.filter(l => l.category === 'project').reduce((s, l) => s + l.amount, 0);
    const relationship= xpLogs.filter(l => l.category === 'relationship').reduce((s, l) => s + l.amount, 0);
    return { habit, bonus, project, relationship };
  }, [xpLogs]);

  // ── Next tier progress ────────────────────────────────────────────────────
  const prevTierXp  = currentTier?.xp ?? 0;
  const nextTierXp  = nextTier?.xp ?? ECONOMY_TIERS[0].xp;
  const tierPct     = Math.min(100, Math.round(((totalXP - prevTierXp) / Math.max(1, nextTierXp - prevTierXp)) * 100));
  const xpToNext    = Math.max(0, nextTierXp - totalXP);

  // ── Pillar health ─────────────────────────────────────────────────────────
  const pillars = useMemo(() => {
    return CATEGORIES.map(cat => {
      const goal = annualGoals.find(g => g.category === cat.id && g.status !== 'done');
      let progress = 0;
      if (goal) {
        const subQIds = quarterlyGoals.filter(q => q.annualGoalId === goal.id).map(q => q.id);
        const related = allTasks.filter(t => t.annualGoalId === goal.id || (t.quarterlyGoalId && subQIds.includes(t.quarterlyGoalId)));
        progress = related.length ? Math.round((related.filter(t => t.status === 'done').length / related.length) * 100) : 0;
      }
      return { ...cat, goal, progress };
    });
  }, [annualGoals, quarterlyGoals, allTasks]);

  // ── Reset XP ─────────────────────────────────────────────────────────────
  const resetXP = async () => {
    if (!confirm('Reset all XP data to 0? This cannot be undone.')) return;
    setResetting(true);
    await db.xpLogs.clear();
    // Also clear dailyStreaks so streak starts fresh
    await db.dailyStreaks.clear();
    // Clear ace streak localStorage keys
    Object.keys(localStorage).filter(k => k.startsWith('vector_ace_streak_awarded_')).forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('vector_last_tier_notified');
    setResetting(false);
    showToast('XP reset to 0 — Day One starts now', 'success');
  };

  return (
    <div className="pb-24 max-w-6xl mx-auto space-y-10 px-4 md:px-8 pt-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="font-headline font-black text-3xl text-on-surface uppercase tracking-tight flex items-center gap-3">
            <Activity size={28} className="text-primary" /> Analytics Hub
          </h2>
          <p className="font-body text-[11px] text-on-surface-variant/50 uppercase tracking-widest mt-1">
            System Performance Metrics
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-surface-container rounded-full p-1 border border-white/5">
            <button onClick={() => setViewMode('focus')}
               className={`flex items-center gap-2 px-5 py-2 rounded-full font-headline font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'focus' ? 'bg-[#212328] text-primary shadow-lg' : 'text-on-surface-variant/40 hover:text-on-surface-variant'}`}>
               <Timer size={13}/> Focus
            </button>
            <button onClick={() => setViewMode('xp')}
               className={`flex items-center gap-2 px-5 py-2 rounded-full font-headline font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'xp' ? 'bg-[#212328] text-[#ffba38] shadow-lg' : 'text-on-surface-variant/40 hover:text-on-surface-variant'}`}>
               <Zap size={13}/> XP
            </button>
          </div>

          {/* Reset XP */}
          <button onClick={resetXP} disabled={resetting}
             className="flex items-center gap-2 px-4 py-2 rounded-full border border-error/20 text-error/60 hover:bg-error/10 hover:border-error/40 hover:text-error disabled:opacity-30 transition-all font-headline font-black text-[9px] uppercase tracking-widest">
            <RotateCcw size={12} className={resetting ? 'animate-spin' : ''} /> Reset XP
          </button>

          <button onClick={() => setRoute('timer')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors bg-primary/5">
             <Timer size={15}/> <span className="text-[11px] uppercase font-bold tracking-widest">Focus</span>
          </button>
        </div>
      </div>

      <div>
        {viewMode === 'focus' ? (
          <MetricsView isEmbedded />
        ) : (
          <div className="space-y-10">

            {/* ── XP Status Cards ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total XP',     value: totalXP,             color: 'text-[#ffba38]',  sub: currentTier ? `Tier: ${currentTier.label}` : 'No tier yet' },
                { label: 'XP Today',     value: xpToday,             color: 'text-primary',    sub: 'Habit + Bonus + Project' },
                { label: 'Day Streak',   value: currentStreak,        color: 'text-secondary',  sub: `${last7DaysDoneCount}/6 days this week` },
                { label: 'Next Reward',  value: `${xpToNext} XP`,    color: 'text-error',      sub: nextTier?.label ?? '—' },
              ].map(card => (
                <div key={card.label} className="bg-[#1a1c22] rounded-2xl p-5 border border-white/5">
                  <div className={`font-headline font-black text-2xl tabular-nums ${card.color}`}>{card.value}</div>
                  <div className="font-headline font-black text-[8px] uppercase tracking-widest text-on-surface-variant/40 mt-1">{card.label}</div>
                  <div className="text-[7px] text-on-surface-variant/30 uppercase tracking-widest mt-1 truncate">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Next Reward Progress ──────────────────────────────────── */}
            {nextTier && (
              <section className="bg-[#1a1c22] rounded-2xl p-6 border border-[#ffba38]/10">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-headline font-black text-[10px] uppercase tracking-widest text-[#ffba38]">{nextTier.label}</span>
                  <span className="font-headline font-black text-[10px] text-on-surface-variant/40">{totalXP} / {nextTier.xp} XP</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-[#ffba38] rounded-full transition-all duration-700" style={{ width: `${tierPct}%` }} />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/30">{currentTier?.label ?? 'Start'}</span>
                  <span className="text-[7px] font-black uppercase tracking-widest text-[#ffba38]/60">{xpToNext} XP to go</span>
                </div>
              </section>
            )}

            {/* ── 14-Day XP Velocity Chart ──────────────────────────────── */}
            <section className="bg-[#1a1c22] rounded-[2rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Zap size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight">XP Velocity</h3>
                    <p className="font-headline font-black text-[9px] uppercase tracking-widest text-primary/60">Last 14 Days</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-headline font-black text-4xl text-primary tabular-nums">{xpHistory.history.reduce((s, d) => s + d.xp, 0)}</div>
                  <div className="font-headline font-black text-[8px] uppercase tracking-widest text-on-surface-variant/40 mt-1">XP This Period</div>
                </div>
              </div>

              {totalXP === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center">
                  <RefreshCw size={32} className="text-on-surface-variant/20 mb-4" />
                  <p className="font-headline font-black text-[11px] uppercase tracking-widest text-on-surface-variant/30">No XP logged yet</p>
                  <p className="text-[9px] text-on-surface-variant/20 uppercase tracking-widest mt-1">Complete habits in Today to earn XP</p>
                </div>
              ) : (
                <div className="h-48 flex items-end justify-between gap-2 relative z-10">
                  {xpHistory.history.map(day => {
                    const heightPct = (day.xp / xpHistory.maxXP) * 100;
                    return (
                      <div key={day.fullDate} className="flex flex-col items-center flex-1 min-w-[24px] gap-2 group/bar">
                        <div className="text-[9px] font-black text-[#ffba38] opacity-0 group-hover/bar:opacity-100 transition-opacity tabular-nums">{day.xp || ''}</div>
                        <div className="w-full bg-black/40 rounded-t-md relative overflow-hidden flex flex-col justify-end" style={{ height: '100%' }}>
                          <div className="w-full bg-[#ffba38]/70 group-hover/bar:bg-[#ffba38] transition-all duration-700 rounded-t-sm" style={{ height: `${Math.max(heightPct, day.xp > 0 ? 4 : 0)}%` }} />
                        </div>
                        <div className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/30 group-hover/bar:text-on-surface transition-colors">{day.date}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── XP Breakdown ──────────────────────────────────────────── */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Habit XP',        value: breakdown.habit,        color: '#00dbe9', desc: 'Deep Work + Study + Workout' },
                { label: 'Bonus XP',         value: breakdown.bonus,        color: '#ffba38', desc: 'Ace Streak rewards' },
                { label: 'Project XP',       value: breakdown.project,      color: '#00e475', desc: 'Production deployments' },
                { label: 'Relationship XP',  value: breakdown.relationship,  color: '#ff6bff', desc: 'Intentional check-ins' },
              ].map(b => (
                <div key={b.label} className="bg-[#111318] rounded-2xl p-5 border border-white/5">
                  <div className="font-headline font-black text-2xl tabular-nums" style={{ color: b.color }}>{b.value}</div>
                  <div className="font-headline font-black text-[8px] uppercase tracking-widest text-on-surface-variant/40 mt-1">{b.label}</div>
                  <div className="text-[7px] text-on-surface-variant/20 uppercase mt-1">{b.desc}</div>
                </div>
              ))}
            </section>

            {/* ── Recent XP Log ─────────────────────────────────────────── */}
            <section className="bg-[#1a1c22] rounded-2xl p-6 border border-white/5">
              <h3 className="font-headline font-black text-xs text-on-surface-variant/40 uppercase tracking-[0.3em] mb-4">Recent XP Log</h3>
              {xpLogs.length === 0 ? (
                <p className="text-[9px] text-on-surface-variant/20 uppercase tracking-widest text-center py-6">No XP earned yet — complete your daily habits</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                  {[...xpLogs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30).map(log => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div>
                        <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface">{log.reason}</span>
                        <span className="ml-2 text-[7px] text-on-surface-variant/30 uppercase">{log.date}</span>
                      </div>
                      <span className="font-headline font-black text-[10px] text-[#ffba38]">+{log.amount} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Pillar Health ─────────────────────────────────────────── */}
            <section className="space-y-6">
              <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight flex items-center gap-3">
                <Target size={20} className="text-secondary" /> Pillar Health
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                {pillars.map(pillar => {
                  const Icon = pillar.icon;
                  return (
                    <div key={pillar.id} className="bg-[#111318] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-3 mb-5">
                        <div className={`p-2.5 rounded-xl bg-black/40 ${pillar.color} border border-white/5`}><Icon size={14} /></div>
                        <span className="font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant/60">{pillar.label}</span>
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <span className={`font-headline font-black text-2xl tabular-nums ${pillar.color}`}>{pillar.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div className={`h-full rounded-full transition-all duration-1000 ${pillar.bg}`} style={{ width: `${pillar.progress}%` }} />
                      </div>
                      {pillar.goal ? (
                        <p className="mt-3 font-headline font-bold text-[8px] uppercase tracking-widest text-on-surface-variant/40 truncate">{pillar.goal.title}</p>
                      ) : (
                        <p className="mt-3 font-headline font-bold text-[8px] uppercase tracking-widest text-on-surface-variant/20 italic">No active directive</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
};
