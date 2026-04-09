import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Zap, ChevronRight, Target, Map } from 'lucide-react';
import { TodayTab }      from './goals/TodayTab';
import { SprintTab }     from './goals/SprintTab';
import { GoalsTab }      from './goals/GoalsTab';
import { MilestonesTab } from './goals/MilestonesTab';

type Tab = 'today' | 'sprint' | 'goals' | 'milestones';

const TABS: { id: Tab; icon: React.FC<any>; label: string }[] = [
  { id: 'today',      icon: Zap,          label: 'Today'      },
  { id: 'sprint',     icon: ChevronRight,  label: 'Sprint'     },
  { id: 'goals',      icon: Target,        label: 'Goals'      },
  { id: 'milestones', icon: Map,           label: 'Milestones' },
];

export const GoalsView = () => {
  const [tab, setTab] = useState<Tab>('today');

  const activeSprint = useLiveQuery(
    () => db.sprints.where('status').equals('active').first(),
    []
  );

  return (
    <div className="min-h-screen px-4 md:px-8 py-8">
      {/* Tab Bar */}
      <div className="flex mb-8" style={{ borderBottom: '1px solid rgba(0,219,233,0.08)' }}>
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 font-headline font-bold text-[10px] uppercase tracking-widest transition-all border-b-2 -mb-px ${
              tab === id
                ? 'border-primary-fixed-dim text-primary'
                : 'border-transparent text-on-surface-variant hover:text-primary/70'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content — each is its own component, easy to debug */}
      {tab === 'today'      && <TodayTab activeSprint={activeSprint ?? undefined} />}
      {tab === 'sprint'     && <SprintTab />}
      {tab === 'goals'      && <GoalsTab />}
      {tab === 'milestones' && <MilestonesTab />}
    </div>
  );
};
