import { X, Bell, Target, Rocket, Zap, ShieldAlert } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockNotifications = [
  {
    id: 1,
    type: 'goal',
    title: 'Milestone Approaching',
    body: 'Phase 1 of Vector OS Launch is 3 days away. Initializing final sprint protocol.',
    time: '2h ago',
    icon: Target,
    color: 'text-primary',
    action: 'View Milestone'
  },
  {
    id: 2,
    type: 'streak',
    title: 'Focus Momentum High',
    body: 'You have maintained a 5-day focus streak. System performance is optimal.',
    time: '5h ago',
    icon: Zap,
    color: 'text-secondary',
  },
  {
    id: 3,
    type: 'session',
    title: 'Daily Goal Demolished',
    body: 'All 3 major priorities for today have been completed. System entering maintenance mode.',
    time: '8h ago',
    icon: Rocket,
    color: 'text-primary-fixed-dim',
    action: 'Go to Today'
  },
  {
    id: 4,
    type: 'system',
    title: 'Sync Protocol Complete',
    body: 'All local data has been successfully integrated with cloud terminal.',
    time: '12h ago',
    icon: ShieldAlert,
    color: 'text-on-surface-variant',
  }
];

export const NotificationCenter = ({ isOpen, onClose }: NotificationCenterProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="relative w-full max-w-sm h-full bg-[#111318] border-l border-outline-variant/10 shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/5 flex items-center justify-between bg-surface-container/20">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-primary" />
            <h2 className="font-headline font-black text-lg text-on-surface uppercase tracking-tight">System Alerts</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {mockNotifications.map((n) => (
            <div key={n.id} className="p-4 rounded-2xl bg-surface-container/30 border border-outline-variant/5 hover:border-outline-variant/20 transition-all group">
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${n.color}`}>
                  <n.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm font-headline font-bold text-on-surface uppercase tracking-tight truncate">{n.title}</h3>
                    <span className="text-[9px] text-on-surface-variant font-bold tabular-nums ml-2 underline underline-offset-4 decoration-primary/20">{n.time}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant/70 leading-relaxed mb-3 line-clamp-3">
                    {n.body}
                  </p>
                  {n.action && (
                    <button className="text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:opacity-80 transition-opacity flex items-center gap-1.5 underline decoration-primary/40">
                      {n.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/5 bg-surface-container/10 flex justify-between items-center px-6">
          <span className="text-[9px] text-on-surface-variant/40 font-bold uppercase tracking-widest">4 Active Notifications</span>
          <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline decoration-primary/30">Clear_All</button>
        </div>
      </div>
    </div>
  );
};
