import { Timer, Rocket, Wallet, Users, BarChart3 } from 'lucide-react';
import type { Route } from '../../App';

interface BottomNavBarProps {
  currentRoute: Route;
  setRoute: (r: Route) => void;
}

const tabs = [
  { id: 'timer' as Route, icon: Timer, label: 'Focus' },
  { id: 'goals' as Route, icon: Rocket, label: 'Goals' },
  { id: 'wallet' as Route, icon: Wallet, label: 'Wallet' },
  { id: 'people' as Route, icon: Users, label: 'People' },
  { id: 'analytics' as Route, icon: BarChart3, label: 'Analytics' },
];

export const BottomNavBar = ({ currentRoute, setRoute }: BottomNavBarProps) => {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 flex"
      style={{
        background: 'rgba(11,14,18,0.97)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,219,233,0.08)',
        boxShadow: '0 -4px 24px rgba(0,240,255,0.04)',
      }}
    >
      {tabs.map(({ id, icon: Icon, label }) => {
        const active = currentRoute === id;
        return (
          <button
            key={id}
            onClick={() => setRoute(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-90 ${
              active ? 'text-primary-fixed-dim' : 'text-on-surface-variant/40'
            }`}
          >
            {active && (
              <div
                className="absolute top-0 w-8 h-px"
                style={{ background: 'linear-gradient(to right, transparent, #00dbe9, transparent)' }}
              />
            )}
            <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            <span className="font-headline font-bold text-[9px] uppercase tracking-widest">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
