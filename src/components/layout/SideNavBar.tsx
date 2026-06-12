import { Timer, Zap, BarChart3, Rocket, Wallet, Users } from 'lucide-react';
import type { Route } from '../../App';

interface SideNavBarProps {
  currentRoute: Route;
  setRoute: (r: Route) => void;
}

const navGroups = [
  {
    label: 'Execution',
    items: [
      { id: 'timer' as Route, icon: Timer, label: 'Focus' },
      { id: 'goals' as Route, icon: Rocket, label: 'Goals' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'wallet' as Route, icon: Wallet, label: 'Wallet' },
      { id: 'people' as Route, icon: Users, label: 'People' },
      { id: 'analytics' as Route, icon: BarChart3, label: 'Analytics' },
    ],
  },
];

export const SideNavBar = ({ currentRoute, setRoute }: SideNavBarProps) => {
  return (
    <aside
      className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-64px)] w-64 flex-col z-40"
      style={{
        background: 'rgba(11,14,18,0.95)',
        borderRight: '1px solid rgba(0,219,233,0.06)',
      }}
    >
      {/* System status tag */}
      <div className="px-5 py-4 border-b border-surface-container-high/60">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-secondary rounded-full shadow-[0_0_6px_#00e475] animate-pulse" />
          <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-secondary">
            System: Operational
          </span>
        </div>
        <div className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-widest mt-1">
          v1.3.0-stable
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="px-5 mb-2">
              <span className="text-[9px] font-headline font-black uppercase tracking-[0.2em] text-on-surface-variant/30">
                {group.label}
              </span>
            </div>
            {group.items.map(({ id, icon: Icon, label }) => {
              const active = currentRoute === id;
              return (
                <button
                  key={id}
                  onClick={() => setRoute(id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all duration-150 border-l-2 ${
                    active
                      ? 'border-primary-fixed-dim bg-surface-container-high text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-primary hover:bg-surface-container-high/50'
                  }`}
                >
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                  <span className="font-headline font-bold text-xs uppercase tracking-widest">
                    {label}
                  </span>
                  {active && (
                    <div className="ml-auto w-1 h-1 bg-primary-fixed-dim rounded-full shadow-[0_0_6px_#00dbe9]" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Operator profile footer */}
      <div
        className="px-5 py-4 border-t"
        style={{ borderColor: 'rgba(0,219,233,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center text-[10px] font-headline font-black text-primary-fixed-dim border"
            style={{
              background: 'rgba(0,219,233,0.08)',
              borderColor: 'rgba(0,219,233,0.2)',
            }}
          >
            <Zap size={14} />
          </div>
          <div>
            <div className="text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-widest">Operator</div>
            <div className="text-[11px] text-primary font-headline font-bold uppercase tracking-widest">
              CMD-01
            </div>
          </div>
          <div className="ml-auto">
            <BarChart3 size={14} className="text-secondary" />
          </div>
        </div>
      </div>
    </aside>
  );
};
