import { useState } from 'react';
import { Target, Calendar, Trophy, type LucideIcon, FlaskConical } from 'lucide-react';
import { useDb } from '../lib/DbContext';
import { SprintsView }        from './goals/SprintsView';
import { GoalsHierarchyView } from './goals/GoalsHierarchyView';
import { MilestonesView }     from './goals/MilestonesView';
import type { Route } from '../App';

type Tab = 'sprints' | 'goals' | 'milestones';

interface TabDef {
  id: Tab;
  icon: LucideIcon;
  label: string;
  desc: string;
}

const TABS: TabDef[] = [
  { id: 'sprints',    icon: Calendar, label: 'Sprints',    desc: 'Tactical phases' },
  { id: 'goals',      icon: Target,   label: 'Goals',      desc: 'Master roadmap'  },
  { id: 'milestones', icon: Trophy,   label: 'Milestones', desc: 'XP & rewards'    },
];

// Inner component uses context
const GoalsViewInner = ({ setRoute }: { setRoute?: (r: Route) => void }) => {
  const [tab, setTab] = useState<Tab>('sprints');
  const { isTestMode } = useDb();



  const activeTab = TABS.find(t => t.id === tab)!;

  return (
    <div className="min-h-screen flex flex-col">

      {/* ══════════ HEADER + TAB BAR ═════════════════════════ */}
      <div
        className="sticky top-16 z-40 px-4 md:px-8 pt-5 pb-0"
        style={{
          background: 'rgba(17,19,24,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,219,233,0.07)',
        }}
      >
        {/* Section label row */}
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-body text-[8px] uppercase tracking-[0.35em] text-on-surface-variant/40 mb-0.5">
                Vector / Goals
              </p>
              <h1 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight leading-none flex items-center gap-2">
                <activeTab.icon size={18} className="text-primary" />
                {activeTab.label}
                <span className="hidden sm:inline font-body font-normal text-[10px] text-on-surface-variant/40 normal-case tracking-widest ml-1">
                  — {activeTab.desc}
                </span>
              </h1>
            </div>
            {/* Test Mode Badge */}
            {isTestMode && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-[rgba(180,100,255,0.35)] bg-[rgba(180,100,255,0.08)] text-[#b464ff]">
                <FlaskConical size={10} /> Test Mode
              </span>
            )}
          </div>
        </div>

        {/* Tab Rail — Desktop */}
        <nav className="hidden md:flex items-end gap-0">
          {TABS.map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative flex items-center gap-2 px-5 py-3 font-headline font-black text-[10px] uppercase tracking-widest transition-all duration-200 border-b-2 -mb-px group ${
                  active
                    ? 'text-primary border-primary'
                    : 'text-on-surface-variant/40 border-transparent hover:text-on-surface-variant hover:border-outline-variant/30'
                }`}
              >
                <Icon size={13} className={`transition-all duration-200 ${active ? 'text-primary drop-shadow-[0_0_6px_#00dbe9]' : 'group-hover:text-on-surface-variant'}`} />
                {label}
                {active && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-px rounded-t-full"
                    style={{ background: 'linear-gradient(to right, transparent, #00dbe9, transparent)', filter: 'blur(1px)' }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Tab Rail — Mobile */}
        <div className="flex md:hidden gap-1 pb-3 overflow-x-auto no-scrollbar">
          {TABS.map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex shrink-0 items-center gap-1.5 px-4 py-2 rounded-full font-headline font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 ${
                  active
                    ? 'bg-primary text-black badge-glow-cyan'
                    : 'glass text-on-surface-variant/50 hover:text-on-surface-variant'
                }`}
              >
                <Icon size={11} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════ TAB CONTENT ════════════════════════════════ */}
      {/* key={isTestMode} forces full remount when switching DBs so live queries rebind */}
      <div className="flex-1 px-4 md:px-8 py-6" key={String(isTestMode)}>
        <div className="animate-in fade-in duration-200">
          {tab === 'sprints'    && <SprintsView setRoute={setRoute} />}
          {tab === 'goals'      && <GoalsHierarchyView />}
          {tab === 'milestones' && <MilestonesView />}
        </div>
      </div>
    </div>
  );
};

// GoalsView reads DbContext provided by App.tsx
export const GoalsView = GoalsViewInner;
