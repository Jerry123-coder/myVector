import { useState, useEffect } from 'react';
import { Bell, Cloud, CloudOff, User, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { Route } from '../../App';

interface TopNavBarProps {
  currentRoute: Route;
  setRoute: (r: Route) => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
}

export const TopNavBar = ({ 
  currentRoute, 
  setRoute, 
  onOpenAuth, 
  onOpenProfile, 
  onOpenNotifications 
}: TopNavBarProps) => {
  const [time, setTime] = useState(new Date());
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = time.getHours().toString().padStart(2, '0');
  const mm = time.getMinutes().toString().padStart(2, '0');
  const ss = time.getSeconds().toString().padStart(2, '0');

  const routeLabel: Record<Route, string> = {
    timer: 'Focus',
    goals: 'Goals',
    wallet: 'Wallet',
    people: 'People',
    settings: 'Settings',
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
      <div className="flex items-center gap-2">
        
        {!isAuthenticated ? (
          <button
            onClick={onOpenAuth}
            className="group relative flex items-center gap-2 px-4 py-1.5 rounded-full overflow-hidden transition-all duration-300 border border-primary/30 hover:border-primary/60 bg-primary/5 active:scale-95"
          >
            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <LogIn size={14} className="text-primary relative z-10" />
            <span className="font-headline font-black text-[10px] uppercase tracking-widest text-primary relative z-10">Access System</span>
            <div className="absolute -inset-1 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
             {/* Profile Trigger */}
             <button
               onClick={onOpenProfile}
               className="group flex items-center gap-2 p-1.5 pr-3 rounded-full bg-surface-container-high/40 border border-outline-variant/10 hover:border-primary/40 hover:bg-surface-container-high transition-all"
               title={`Identity: ${user?.email}`}
             >
               <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
                 {user?.email?.[0].toUpperCase() ?? <User size={14} />}
               </div>
               <ShieldCheck size={12} className="text-secondary animate-pulse" />
               <span className="hidden sm:block font-headline font-black text-[9px] uppercase tracking-[0.2em] text-primary limit-1-line max-w-[80px]">{user?.email?.split('@')[0]}</span>
             </button>

             {/* Notifications Bell */}
             <button
               onClick={onOpenNotifications}
               className="relative w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all group"
             >
               <Bell size={18} className="group-hover:rotate-12 transition-transform" />
               <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full shadow-[0_0_8px_#00e475] animate-bounce" />
             </button>
          </div>
        )}

        <div className="ml-2 pl-2 border-l border-surface-container-highest">
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Cloud size={14} className="text-secondary opacity-60" />
            ) : (
              <CloudOff size={14} className="text-on-surface-variant/20" />
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
