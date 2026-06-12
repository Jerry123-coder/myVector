import { X, LogOut, User, Activity, Cpu, Terminal, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { syncAllData } from '../../lib/sync';
import { useState } from 'react';

interface ProfileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const logs = [
  { time: '12:47:22', level: 'INFO',  msg: 'Focus session initialized — 25:00 duration' },
  { time: '12:22:01', level: 'SYS',   msg: 'Supabase client connected — latency 14ms' },
  { time: '12:22:00', level: 'INFO',  msg: 'Vector OS v1.3.0-stable booted' },
];

const levelStyle: Record<string, string> = {
  INFO:  'text-primary-fixed-dim border-primary/20',
  SYS:   'text-secondary border-secondary/20',
  DEBUG: 'text-outline border-outline-variant',
};

export const ProfileOverlay = ({ isOpen, onClose }: ProfileOverlayProps) => {
  const { user, isAuthenticated, signOut } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    if (!user) return;
    setSyncing(true);
    await syncAllData(user);
    setSyncing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in zoom-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0B0E12]/95 backdrop-blur-2xl" 
        onClick={onClose}
      />

      {/* Content Container */}
      <div className="relative w-full max-w-4xl max-h-full overflow-y-auto no-scrollbar bg-[#16181b] border border-outline-variant/10 rounded-3xl shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 z-10 p-6 border-b border-outline-variant/10 bg-[#16181b]/80 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/50 text-[9px] font-black uppercase tracking-widest transition-all md:hidden mr-2"
            >
              Back
            </button>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight">Operator Profile</h2>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{isAuthenticated ? 'System_Authenticated' : 'Offline_Status'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/50 text-[10px] font-black uppercase tracking-widest transition-all mr-2"
            >
              Back to Dashboard
            </button>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-primary"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Identity & Cloud Integration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-surface-container/30 border border-outline-variant/10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Connected Terminal</span>
                {isAuthenticated && (
                  <button onClick={signOut} className="flex items-center gap-2 text-error/60 hover:text-error transition-colors text-[10px] font-bold uppercase tracking-widest">
                    <LogOut size={12} /> Terminate
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-black text-primary">
                  {user?.email?.[0].toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-headline font-bold text-on-surface truncate">{user?.email ?? 'Unknown Identity'}</div>
                  <div className="text-[10px] text-on-surface-variant tracking-wider uppercase mt-1">
                    {isAuthenticated ? 'Protocol: CLOUD_SYNC_ACTIVE' : 'Protocol: LOCAL_STORAGE_ONLY'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-surface-container/30 border border-outline-variant/10 flex flex-col justify-between">
               <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                    {isAuthenticated ? <Cloud className="text-secondary" size={12} /> : <CloudOff className="text-error" size={12} />}
                    Sync Engine
                  </span>
                  {isAuthenticated && (
                    <div className="px-2 py-0.5 rounded-full bg-secondary/10 border border-secondary/20 text-[8px] font-bold text-secondary uppercase">Active</div>
                  )}
               </div>
               <div className="space-y-3">
                  <div className="flex justify-between text-[11px] font-bold tracking-tight">
                    <span className="text-on-surface-variant">SYNC_MODE</span>
                    <span className={isAuthenticated ? 'text-secondary' : 'text-on-surface-variant'}>{isAuthenticated ? 'CONTINUOUS' : 'DISABLED'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold tracking-tight">
                    <span className="text-on-surface-variant">LATENCY</span>
                    <span className="text-primary-fixed-dim">{isAuthenticated ? '14ms' : 'N/A'}</span>
                  </div>
               </div>
               {isAuthenticated && (
                 <button 
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="mt-6 w-full py-2.5 rounded-lg bg-surface-container-high border border-outline-variant/10 text-primary text-[10px] font-black uppercase tracking-widest hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                 >
                   {syncing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                   Manual Override
                 </button>
               )}
            </div>
          </div>

          {/* System Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Activity, label: 'Kernel',  val: 'Operational', color: 'text-secondary' },
              { icon: Cpu,      label: 'Vector',  val: 'v1.3.0',      color: 'text-primary' },
              { icon: Terminal, label: 'Runtime', val: 'Browser_TS',  color: 'text-on-surface' },
              { icon: Cpu,      label: 'Memory',  val: 'IndxD_DB',    color: 'text-on-surface-variant' },
            ].map(({ icon: Icon, label, val, color }) => (
              <div key={label} className="p-4 rounded-xl bg-surface-container/20 border border-outline-variant/5">
                <Icon size={14} className="text-on-surface-variant/40 mb-2" />
                <div className="text-[8px] text-on-surface-variant uppercase font-black tracking-widest">{label}</div>
                <div className={`font-headline font-bold text-xs uppercase ${color}`}>{val}</div>
              </div>
            ))}
          </div>

          {/* Diagnostics Section */}
          <div className="space-y-4">
               <button 
                onClick={() => setShowLogs(!showLogs)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-[#0c0e12] border border-outline-variant/5 hover:border-primary/20 transition-all"
               >
                 <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">System Diagnostics Log</span>
                 <span className="text-[10px] font-bold text-primary uppercase">{showLogs ? 'Collapse' : 'Expand_Data'}</span>
               </button>
               
               {showLogs && (
                 <div className="rounded-xl bg-[#0c0e12] border border-outline-variant/10 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                    <div className="p-4 space-y-3">
                      {logs.map((log, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <span className="font-body text-[9px] text-on-surface-variant/40 tabular-nums flex-shrink-0 mt-0.5">{log.time}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 border uppercase flex-shrink-0 ${levelStyle[log.level]}`}>{log.level}</span>
                          <span className="text-on-surface-variant/70 text-[10px] font-bold tracking-tight">{log.msg}</span>
                        </div>
                      ))}
                    </div>
                 </div>
               )}
          </div>

        </div>
        
        {/* Footer */}
        <div className="p-8 border-t border-outline-variant/10 bg-surface-container/20 text-center">
          <p className="text-[9px] text-on-surface-variant/30 uppercase font-black tracking-[0.4em]">Vector Operative System // Precision Focus</p>
        </div>
      </div>
    </div>
  );
};
