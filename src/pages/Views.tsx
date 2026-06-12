import { Terminal, Activity, Cpu, Cloud, CloudOff, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthView } from './AuthView';
import { syncAllData } from '../lib/sync';
import { useState } from 'react';

const logs = [
  { time: '12:47:22', level: 'INFO',  msg: 'Focus session initialized — 25:00 duration' },
  { time: '12:22:01', level: 'SYS',   msg: 'Supabase client connected — latency 14ms' },
  { time: '12:22:00', level: 'INFO',  msg: 'Vector OS v1.3.0-stable booted' },
  { time: '12:21:59', level: 'DEBUG', msg: 'Service worker registered — offline ready' },
  { time: '12:21:58', level: 'INFO',  msg: 'IndexedDB initialized — schema v1' },
];

const levelStyle: Record<string, string> = {
  INFO:  'text-primary-fixed-dim border-primary/20',
  SYS:   'text-secondary border-secondary/20',
  DEBUG: 'text-outline border-outline-variant',
  WARN:  'text-tertiary-fixed-dim border-tertiary/30',
  ERROR: 'text-error border-error/30',
};

export const SettingsView = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const handleManualSync = async () => {
    if (!user) return;
    setSyncing(true);
    await syncAllData(user);
    setSyncing(false);
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-8">
      <div className="flex items-end justify-between gap-4 mb-8 pb-6" style={{ borderBottom: '1px solid rgba(0,219,233,0.08)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal size={20} className="text-on-surface-variant" />
            <h1 className="font-headline font-black text-2xl text-primary uppercase tracking-tight">Settings</h1>
          </div>
          <p className="font-body text-[11px] text-on-surface-variant uppercase tracking-widest">
            Vector_OS // Preferences & Cloud Sync
          </p>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-[9px] text-on-surface-variant uppercase font-bold tracking-widest">Connected_Operator</div>
              <div className="text-[11px] font-headline font-bold text-primary truncate max-w-[150px]">{user?.email ?? ''}</div>
            </div>
            <button 
              onClick={() => signOut()}
              className="p-2 hover:text-error transition-colors"
              title="Terminate Connection"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowAuth(true)}
            className="px-4 py-1.5 bg-primary/10 border border-primary/30 text-primary font-headline font-bold text-[10px] uppercase tracking-widest hover:bg-primary/20 transition-all"
          >
            Connect Cloud
          </button>
        )}
      </div>

      {showAuth && !isAuthenticated && (
        <div className="mb-12">
          <AuthView onSuccess={() => setShowAuth(false)} />
        </div>
      )}

      {/* Cloud Status Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-6" style={{ background: '#1a1c20', border: '1px solid rgba(0,219,233,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isAuthenticated ? <Cloud className="text-secondary" size={18} /> : <CloudOff className="text-on-surface-variant/40" size={18} />}
              <span className="font-headline font-bold text-xs uppercase tracking-widest">Auto-Sync Protocol</span>
            </div>
            {isAuthenticated && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-secondary/10 border border-secondary/20">
                <div className="w-1 h-1 bg-secondary rounded-full animate-pulse" />
                <span className="text-[8px] font-bold text-secondary uppercase tracking-widest">Automatic</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-on-surface-variant uppercase tracking-tighter">Sync Mode</span>
              <span className={`font-bold ${isAuthenticated ? 'text-secondary' : 'text-on-surface-variant'}`}>
                {isAuthenticated ? 'CONTINUOUS_BACKGROUND' : 'OFFLINE_ISOLATED'}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-on-surface-variant uppercase tracking-tighter">Diagnostic Override</span>
              {isAuthenticated ? (
                <button 
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="text-[9px] font-bold text-primary hover:underline uppercase flex items-center gap-1"
                >
                  {syncing ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                  Force Trigger
                </button>
              ) : <span className="text-on-surface-variant/30">—</span>}
            </div>
          </div>
          
          {!isAuthenticated && !showAuth && (
            <button 
              onClick={() => setShowAuth(true)}
              className="w-full mt-6 py-2 border border-dashed border-primary/30 text-primary text-[10px] uppercase font-black tracking-[0.2em] hover:bg-primary/5 transition-all"
            >
              Initialize Cloud Protocol
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Activity, label: 'System',  val: 'Operational', color: 'text-secondary' },
            { icon: Cpu,      label: 'Engine',  val: 'v1.3.0',      color: 'text-primary-fixed-dim' },
            { icon: Terminal, label: 'Offline', val: 'Ready',       color: 'text-secondary' },
            { icon: Activity, label: 'Sync',    val: isAuthenticated ? '14ms' : 'N/A', color: 'text-tertiary-fixed-dim' },
          ].map(({ icon: Icon, label, val, color }) => (
            <div key={label} className="p-4" style={{ background: '#1a1c20', border: '1px solid rgba(0,219,233,0.06)' }}>
              <Icon size={14} className="text-on-surface-variant mb-2" />
              <div className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">{label}</div>
              <div className={`font-headline font-bold text-sm uppercase ${color}`}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal log Toggle */}
      <div className="flex justify-center mb-4">
        <button 
          onClick={() => setShowLogs(!showLogs)}
          className="text-[10px] font-bold text-on-surface-variant hover:text-primary uppercase tracking-widest transition-colors flex items-center gap-2"
        >
          {showLogs ? 'Hide System Diagnostics' : 'View System Diagnostics'}
        </button>
      </div>

      {showLogs && (
        <div style={{ background: '#0c0e12', border: '1px solid rgba(0,219,233,0.06)' }}>
          <div className="px-6 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(0,219,233,0.06)' }}>
            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse shadow-[0_0_6px_#00e475]" />
            <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-on-surface-variant">
              Terminal Output
            </span>
          </div>
          <div className="p-6 space-y-3 font-body text-sm">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="font-body text-[10px] text-on-surface-variant/50 tabular-nums flex-shrink-0 mt-0.5">
                  {log.time}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 border uppercase flex-shrink-0 ${levelStyle[log.level]}`}
                  style={{ background: 'rgba(0,0,0,0.2)' }}>
                  {log.level}
                </span>
                <span className="text-on-surface-variant text-[11px]">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
