import { useState } from 'react';
import { MultiYearGoalsView } from './MultiYearGoalsView';
import { StrategyView as AnnualGoalsView } from './AnnualGoalsView';
import { QuarterlyGoalsView } from './QuarterlyGoalsView';
import { Globe, Target, Shield } from 'lucide-react';

export const GoalsHierarchyView = () => {
  const [level, setLevel] = useState<'multi' | 'annual' | 'quarterly'>('annual');

  return (
    <div className="pb-10 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 mb-10 flex justify-center">
        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md shadow-2xl">
          {[
            { id: 'multi', label: 'Multi-Year Vision', icon: Globe },
            { id: 'annual', label: 'Annual Strategy', icon: Shield },
            { id: 'quarterly', label: 'Quarterly Objectives', icon: Target }
          ].map(tab => {
            const active = level === tab.id;
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setLevel(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-headline font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${
                  active ? 'bg-primary text-black shadow-lg scale-105' : 'text-on-surface-variant/40 hover:text-on-surface hover:bg-white/5'
                }`}>
                <Icon size={14} className={active ? 'text-black' : 'opacity-60'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {level === 'multi' && <MultiYearGoalsView />}
        {level === 'annual' && <AnnualGoalsView />}
        {level === 'quarterly' && <QuarterlyGoalsView />}
      </div>
    </div>
  );
};
