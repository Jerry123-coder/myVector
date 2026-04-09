import { Terminal, Activity, Cpu } from 'lucide-react';

const logs = [
  { time: '12:47:22', level: 'INFO',  msg: 'Focus session initialized — 25:00 duration' },
  { time: '12:22:01', level: 'SYS',   msg: 'Supabase client connected — latency 14ms' },
  { time: '12:22:00', level: 'INFO',  msg: 'Vector OS v1.0.4-stable booted' },
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

export const SystemView = () => {
  return (
    <div className="min-h-screen px-4 md:px-8 py-8">
      <div className="flex items-end gap-4 mb-8 pb-6" style={{ borderBottom: '1px solid rgba(0,219,233,0.08)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal size={20} className="text-on-surface-variant" />
            <h1 className="font-headline font-black text-2xl text-primary uppercase tracking-tight">System Log</h1>
          </div>
          <p className="font-body text-[11px] text-on-surface-variant uppercase tracking-widest">
            Vector_OS // Runtime Diagnostics
          </p>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { icon: Activity, label: 'System',  val: 'Operational', color: 'text-secondary' },
          { icon: Cpu,      label: 'Engine',  val: 'v1.0.4',      color: 'text-primary-fixed-dim' },
          { icon: Terminal, label: 'Offline', val: 'Ready',       color: 'text-secondary' },
          { icon: Activity, label: 'Sync',    val: '14ms',        color: 'text-tertiary-fixed-dim' },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} className="p-4" style={{ background: '#1a1c20', border: '1px solid rgba(0,219,233,0.06)' }}>
            <Icon size={14} className="text-on-surface-variant mb-2" />
            <div className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">{label}</div>
            <div className={`font-headline font-bold text-sm uppercase ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Terminal log */}
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
    </div>
  );
};
