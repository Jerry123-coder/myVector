import { useState, useEffect } from 'react';
import { Settings, Bell, Wallet } from 'lucide-react';
import type { Route } from '../../App';

interface TopNavBarProps {
  currentRoute: Route;
}

export const TopNavBar = ({ currentRoute }: TopNavBarProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = time.getHours().toString().padStart(2, '0');
  const mm = time.getMinutes().toString().padStart(2, '0');
  const ss = time.getSeconds().toString().padStart(2, '0');

  const routeLabel: Record<Route, string> = {
    timer: 'Focus Engine',
    goals: 'Goals & Direction',
    metrics: 'Velocity Audit',
    system: 'System Log',
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 md:px-6"
      style={{
        background: 'rgba(11, 14, 18, 0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,219,233,0.08)',
        boxShadow: '0 1px 0 rgba(0,219,233,0.05), 0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Left: Brand */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {/* <div className="w-2 h-2 bg-primary-fixed-dim shadow-[0_0_8px_#00dbe9] animate-pulse" /> */}
          <span className="font-headline font-black text-xl tracking-[0.15em] text-primary uppercase">
            My<span className='text-primary-fixed-dim'>Vector</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-surface-container-highest">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {routeLabel[currentRoute]}
          </span>
        </div>
      </div>

      {/* Center: Live clock (desktop) */}
      <div className="hidden md:flex items-center gap-1 tabular-nums">
        <span className="font-headline font-bold text-sm text-primary-fixed-dim tracking-widest">
          {hh}:{mm}
        </span>
        <span className="font-headline text-sm text-on-surface-variant">:{ss}</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {[
          { Icon: Wallet, label: 'wallet' },
          { Icon: Settings, label: 'settings' },
        ].map(({ Icon, label }) => (
          <button
            key={label}
            className="w-9 h-9 flex items-center justify-center text-on-surface-variant/50 hover:text-primary hover:bg-surface-container-high transition-all duration-150"
          >
            <Icon size={18} />
          </button>
        ))}
        <button className="relative w-9 h-9 flex items-center justify-center text-on-surface-variant/50 hover:text-primary hover:bg-surface-container-high transition-all duration-150">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-secondary rounded-full shadow-[0_0_6px_#00e475]" />
        </button>
      </div>
    </header>
  );
};
