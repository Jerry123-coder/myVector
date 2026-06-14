import { useState } from 'react';
import { MultiYearGoalsView } from './MultiYearGoalsView';
import { StrategyView as AnnualGoalsView } from './AnnualGoalsView';
import { QuarterlyGoalsView } from './QuarterlyGoalsView';
import { CommandDashboard } from './CommandDashboard';
import { Globe, Target, Shield, LayoutGrid, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

export const GoalsHierarchyView = ({ setTab }: { setTab?: (tab: 'sprints' | 'goals' | 'milestones') => void }) => {
  const [level, setLevel] = useState<'deck' | 'quarterly' | 'annual' | 'multi'>('deck');

  const TABS = [
    { id: 'deck',      label: 'Dashboard',      icon: Terminal,   desc: 'Current Overview' },
    { id: 'quarterly', label: 'Quarterly',      icon: Target,     desc: 'Quarterly Goals' },
    { id: 'annual',    label: 'Yearly',         icon: Shield,     desc: 'Annual Goals' },
    { id: 'multi',     label: 'Long Term',      icon: Globe,      desc: 'Big Picture Targets' }
  ] as const;

  return (
    <div className="pb-10 min-h-screen">
      
      <div className="max-w-7xl mx-auto px-4 mb-12">
         <div className="flex flex-col items-center">
             <div className="flex bg-[#0a0c10]/60 p-1.5 rounded-[18px] border border-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              {TABS.map(tab => {
                const active = level === tab.id;
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setLevel(tab.id as any)}
                    className={`relative flex items-center gap-2 px-6 py-3 rounded-[14px] font-headline font-black text-[9px] uppercase tracking-widest transition-all duration-300 z-10 ${
                      active ? 'text-black' : 'text-on-surface-variant/40 hover:text-on-surface hover:bg-white/5'
                    }`}>
                    {active && (
                       <motion.div layoutId="goalTab" className="absolute inset-0 bg-primary rounded-[14px] shadow-[0_0_20px_rgba(0,219,233,0.3)]" />
                    )}
                    <Icon size={14} className={`relative z-10 ${active ? 'text-black' : 'opacity-60'}`} />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5">
               <LayoutGrid size={10} className="text-primary/40" />
               <span className="text-[8px] font-headline font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                  {TABS.find(t => t.id === level)?.desc}
               </span>
            </div>
         </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
        {level === 'deck'      && <CommandDashboard setTab={setTab} />}
        {level === 'quarterly' && <QuarterlyGoalsView />}
        {level === 'annual'    && <AnnualGoalsView />}
        {level === 'multi'     && <MultiYearGoalsView />}
      </div>
    </div>
  );
};
