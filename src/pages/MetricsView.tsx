import { TrendingUp, Activity, Clock } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

const minsFromSecs = (s: number) => Math.round(s / 60);
const hoursFromSecs = (s: number) => (s / 3600).toFixed(1);
const dayLabel = (msAgo: number) => {
  const d = new Date(Date.now() - msAgo);
  return ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()];
};

export const MetricsView = () => {
  const allSessions = useLiveQuery(() => db.sessions.orderBy('completedAt').reverse().toArray(), []);
  const allTasks    = useLiveQuery(() => db.tasks.toArray(), []);

  const totalSecs  = allSessions?.reduce((s, x) => s + x.actualSecs, 0) ?? 0;
  const todaySecs  = allSessions?.filter(s => s.completedAt >= new Date().setHours(0,0,0,0))
    .reduce((s, x) => s + x.actualSecs, 0) ?? 0;
  const weekSecs   = allSessions?.filter(s => s.completedAt > Date.now() - 7*86400000).reduce((s,x)=>s+x.actualSecs,0) ?? 0;
  const monthSecs  = allSessions?.filter(s => s.completedAt > Date.now() - 30*86400000).reduce((s,x)=>s+x.actualSecs,0) ?? 0;

  const doneTasks    = allTasks?.filter(t => t.status === 'done').length ?? 0;
  const totalTasks   = allTasks?.length ?? 0;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0;
  const completedSessions = allSessions?.filter(s => s.actualSecs >= s.durationSecs * 0.9) ?? [];
  const efficiencyRate = allSessions?.length ? Math.round((completedSessions.length / allSessions.length) * 100) : 0;

  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const msAgo = (6-i)*86400000;
    const dayStart = new Date(Date.now()-msAgo).setHours(0,0,0,0);
    const secs = allSessions?.filter(s => s.completedAt >= dayStart && s.completedAt < dayStart+86400000)
      .reduce((s,x)=>s+x.actualSecs,0) ?? 0;
    return { day: dayLabel(msAgo), secs, isToday: i===6 };
  });
  const maxSecs = Math.max(...weekBars.map(b=>b.secs), 1);
  const recent = allSessions?.slice(0,6) ?? [];

  return (
    <div className="min-h-screen px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6"
        style={{ borderBottom:'1px solid rgba(0,219,233,0.08)' }}>
        <div>
          <h1 className="font-headline font-black text-3xl text-primary uppercase tracking-tight">Velocity Audit</h1>
          <p className="font-body text-[11px] text-on-surface-variant tracking-widest uppercase mt-1">
            Sub_System: Focus_Translation // {allSessions?.length ?? 0} Sessions Logged
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 border-l-2 border-secondary" style={{ background:'#1a1c20' }}>
            <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Today</div>
            <div className="font-headline font-bold text-secondary">{minsFromSecs(todaySecs)}m</div>
          </div>
          <div className="px-4 py-2 border-l-2 border-primary-fixed-dim" style={{ background:'#1a1c20' }}>
            <div className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Sessions</div>
            <div className="font-headline font-bold text-primary">{allSessions?.length ?? 0}</div>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label:'Total Hours', val:hoursFromSecs(totalSecs)+'h', color:'text-primary', border:'#00dbe9' },
          { label:'This Week',   val:hoursFromSecs(weekSecs)+'h',  color:'text-secondary', border:'#00e475' },
          { label:'Completion',  val:completionRate+'%',           color:'text-tertiary-fixed-dim', border:'#ffba38' },
          { label:'Efficiency',  val:efficiencyRate+'%',           color:'text-primary-fixed-dim', border:'#00dbe9' },
        ].map(({label,val,color,border})=>(
          <div key={label} className="p-5" style={{background:'#1e2024',borderLeft:`2px solid ${border}`}}>
            <div className="font-body text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">{label}</div>
            <div className={`font-headline font-black text-3xl tabular-nums ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        {/* Velocity card */}
        <div className="lg:col-span-4 p-8 flex flex-col" style={{background:'#1e2024',borderLeft:'2px solid #00dbe9',boxShadow:'inset 0 0 20px rgba(0,219,233,0.03)'}}>
          <div className="font-body text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">Velocity Score</div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline font-black text-7xl text-primary italic tabular-nums terminal-glow" style={{letterSpacing:'-0.04em'}}>{efficiencyRate}</span>
            <span className="text-primary-fixed-dim text-xl font-headline">VQ</span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-surface-container-highest overflow-hidden">
            <div className="h-full transition-all duration-700" style={{width:`${efficiencyRate}%`,background:'#00dbe9',boxShadow:'0 0 8px rgba(0,219,233,0.5)'}}/>
          </div>
          <p className="mt-4 text-sm text-on-surface-variant leading-relaxed">
            {allSessions?.length ? `${completedSessions.length} of ${allSessions.length} sessions ran to full completion.` : 'Start your first focus session to begin tracking.'}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {[{label:'Sessions',val:String(allSessions?.length??0)},{label:'Sync Rate',val:efficiencyRate+'%'}].map(({label,val})=>(
              <div key={label} className="p-3" style={{background:'#282a2e'}}>
                <div className="text-[9px] text-on-surface-variant font-bold uppercase tracking-widest">{label}</div>
                <div className="font-headline font-bold text-on-surface tabular-nums">{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 7-day chart */}
        <div className="lg:col-span-8 p-6 flex flex-col" style={{background:'#1a1c20'}}>
          <div className="flex justify-between items-start gap-3 mb-8">
            <div>
              <div className="font-body text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">7-Day Focus Volume</div>
              <h2 className="font-headline font-bold text-lg text-on-surface">Daily Accumulation</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity size={12} className="text-secondary"/>
              <span className="font-body text-[9px] font-bold text-secondary uppercase tracking-widest">Live Feed</span>
            </div>
          </div>
          <div className="flex-1 flex items-end gap-2 min-h-[140px]">
            {weekBars.map(({day,secs,isToday})=>{
              const pct = Math.round((secs/maxSecs)*100);
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex items-end justify-center h-36">
                    {secs>0 && <div className="absolute -top-6 text-[9px] font-bold text-primary-fixed-dim opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">{minsFromSecs(secs)}m</div>}
                    <div className="w-full transition-all duration-700" style={{height:`${pct}%`,background:isToday?'linear-gradient(to top, #00dbe9, #00f0ff)':'#282a2e',minHeight:secs>0?'4px':'0',boxShadow:isToday&&secs>0?'0 0 12px rgba(0,219,233,0.4)':'none'}}/>
                  </div>
                  <span className={`font-body text-[9px] font-bold uppercase tracking-wider ${isToday?'text-primary':'text-on-surface-variant/50'}`}>{day}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 flex justify-between" style={{borderTop:'1px solid rgba(59,73,75,0.4)'}}>
            <span className="font-body text-[9px] text-on-surface-variant uppercase tracking-widest">Weekly total: {hoursFromSecs(weekSecs)}h</span>
            <span className="font-body text-[9px] text-secondary uppercase tracking-widest font-bold">{doneTasks} tasks done</span>
          </div>
        </div>
      </div>

      {/* Accumulation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          {label:'Weekly',  val:hoursFromSecs(weekSecs),  color:'#00e475',  badge:'Sprint_Active'},
          {label:'Monthly', val:hoursFromSecs(monthSecs), color:'#ffba38',  badge:'Steady_Velocity'},
          {label:'All-Time',val:hoursFromSecs(totalSecs), color:'#00dbe9',  badge:'Macro_Growth'},
        ].map(({label,val,color,badge})=>(
          <div key={label} className="p-6" style={{background:'#1e2024',borderLeft:`2px solid ${color}`}}>
            <div className="font-body text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">{label} Accumulation</div>
            <div className="font-headline font-bold text-4xl tabular-nums" style={{color}}>
              {val}<span className="text-sm font-normal text-on-surface-variant ml-2 uppercase">Hours</span>
            </div>
            <div className="mt-4">
              <span className="text-[9px] px-2 py-1 border font-bold uppercase tracking-widest" style={{color,borderColor:color+'30',background:'rgba(0,0,0,0.2)'}}>{badge}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Session log */}
      <div className="p-6" style={{background:'#0c0e12',border:'1px solid rgba(0,219,233,0.06)'}}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-on-surface-variant"/>
            <h3 className="font-headline font-bold text-sm uppercase tracking-widest text-on-surface">Session Log</h3>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-on-surface-variant"/>
            <span className="font-body text-[9px] text-on-surface-variant uppercase tracking-widest">{recent.length} records</span>
          </div>
        </div>
        {recent.length===0 ? (
          <div className="py-12 text-center">
            <div className="font-headline font-bold text-xs text-on-surface-variant/50 uppercase tracking-widest mb-2">No sessions yet</div>
            <div className="font-body text-[10px] text-on-surface-variant/30">Complete a focus session to see your data here.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left tabular-nums">
              <thead>
                <tr style={{borderBottom:'1px solid rgba(59,73,75,0.4)'}}>
                  {['Date','Objective','Duration','Status','Efficiency'].map((h,i)=>(
                    <th key={h} className={`pb-4 font-headline font-black text-[9px] uppercase tracking-widest text-on-surface-variant ${i===4?'text-right':''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((s,i)=>{
                  const eff = Math.min(Math.round((s.actualSecs/s.durationSecs)*100),100);
                  const ok  = eff>=90;
                  return (
                    <tr key={i} style={{borderBottom:'1px solid rgba(59,73,75,0.1)'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(40,42,46,0.4)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <td className="py-4 font-body text-on-surface-variant text-[11px]">{new Date(s.completedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</td>
                      <td className="py-4 font-headline font-bold text-on-surface uppercase tracking-tight text-xs pr-4">{s.taskLabel}</td>
                      <td className="py-4 font-headline font-bold text-primary-fixed-dim">{minsFromSecs(s.actualSecs)}m</td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase border ${ok?'text-secondary border-secondary/20 bg-secondary/5':'text-tertiary-fixed-dim border-tertiary-fixed-dim/30'}`}>{ok?'COMPLETED':'PARTIAL'}</span>
                      </td>
                      <td className="py-4 text-right font-headline font-bold text-on-surface">{eff}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6 pt-4 flex justify-between items-center" style={{borderTop:'1px solid rgba(59,73,75,0.2)'}}>
          <div className="font-body text-[9px] text-on-surface-variant uppercase tracking-widest">VECTOR_OS // BUILD_1.0.4</div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse shadow-[0_0_6px_#00e475]"/>
            <span className="font-body text-[9px] font-bold uppercase tracking-widest text-on-surface">System Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};
