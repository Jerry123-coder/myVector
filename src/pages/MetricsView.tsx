import { useMemo, useState } from 'react';
import { TrendingUp, Activity, Clock, Flame, Target, Trophy, Sparkles } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

const minsFromSecs = (s: number) => Math.round(s / 60);
const hoursFromSecs = (s: number) => (s / 3600).toFixed(1);

type TimeRange = '7D' | '30D' | '90D' | '365D';
const RANGES: { value: TimeRange; label: string }[] = [
  { value: '7D', label: '7 Days' },
  { value: '30D', label: '30 Days' },
  { value: '90D', label: 'Quarter' },
  { value: '365D', label: 'Year' },
];

export const MetricsView = ({ isEmbedded }: { isEmbedded?: boolean }) => {
  const [now] = useState(() => Date.now());
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');

  const startOfToday = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [now]);

  const allSessions = useLiveQuery(() => db.sessions.orderBy('completedAt').reverse().toArray(), []);
  const allTasks    = useLiveQuery(() => db.tasks.toArray(), []);

  const totalSecs  = allSessions?.reduce((s, x) => s + x.actualSecs, 0) ?? 0;
  const todaySecs  = allSessions?.filter(s => s.completedAt >= startOfToday).reduce((s, x) => s + x.actualSecs, 0) ?? 0;
  
  const doneTasks    = allTasks?.filter(t => t.status === 'done').length ?? 0;
  const totalTasks   = allTasks?.length ?? 0;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0;
  
  const completedSessions = allSessions?.filter(s => s.actualSecs >= s.durationSecs * 0.9) ?? [];
  const focusIntegrity = allSessions?.length ? Math.round((completedSessions.length / allSessions.length) * 100) : 0;

  // Streak Calculation
  const activeDays = new Set(allSessions?.map(s => {
      const d = new Date(s.completedAt);
      d.setHours(0,0,0,0);
      return d.getTime();
  }) ?? []);
  
  let currentStreak = 0;
  let maxStreak = 0;
  const tStart = new Date(now).setHours(0,0,0,0);
  const yStart = tStart - 86400000;
  if (activeDays.has(tStart) || activeDays.has(yStart)) {
     let checkDay = activeDays.has(tStart) ? tStart : yStart;
     while (activeDays.has(checkDay)) {
        currentStreak++;
        checkDay -= 86400000;
     }
  }

  const sortedAsc = Array.from(activeDays).sort((a,b)=>a-b);
  let curMax = 0;
  for (let i = 0; i < sortedAsc.length; i++) {
     if (i === 0) { curMax = 1; maxStreak = 1; continue; }
     if (sortedAsc[i] - sortedAsc[i-1] <= 86400000) {
        curMax++;
        if (curMax > maxStreak) maxStreak = curMax;
     } else {
        curMax = 1;
     }
  }

  // Graph Logic
  const graphData = useMemo(() => {
    if (!allSessions) return { bars: [], totalRangeSecs: 0, maxSecs: 1 };
    
    interface BarData { label: string; secs: number; isFocus?: boolean; }
    const bars: BarData[] = [];
    let rangeMs = 7 * 86400000;
    
    if (timeRange === '7D') {
      rangeMs = 7 * 86400000;
      for (let i = 6; i >= 0; i--) {
         const msAgo = i * 86400000;
         const dStart = new Date(now - msAgo).setHours(0,0,0,0);
         const secs = allSessions.filter(s => s.completedAt >= dStart && s.completedAt < dStart + 86400000).reduce((s,x)=>s+x.actualSecs, 0);
         const dayStr = ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(dStart).getDay()];
         bars.push({ label: i === 0 ? 'TODAY' : dayStr, secs, isFocus: i === 0 });
      }
    } else if (timeRange === '30D') {
      rangeMs = 30 * 86400000;
      for (let i = 29; i >= 0; i--) {
        const msAgo = i * 86400000;
        const dStart = new Date(now - msAgo).setHours(0,0,0,0);
        const secs = allSessions.filter(s => s.completedAt >= dStart && s.completedAt < dStart + 86400000).reduce((s,x)=>s+x.actualSecs, 0);
        const md = new Date(dStart);
        bars.push({ label: `${md.getDate()}`, secs, isFocus: i === 0 });
      }
    } else if (timeRange === '90D') { // 12 weeks
      rangeMs = 90 * 86400000;
      for (let i = 11; i >= 0; i--) {
        const startOfWk = new Date(now - (i+1)*7*86400000).getTime();
        const endOfWk = new Date(now - i*7*86400000).getTime();
        const secs = allSessions.filter(s => s.completedAt >= startOfWk && s.completedAt < endOfWk).reduce((s,x)=>s+x.actualSecs, 0);
        bars.push({ label: `W${12-i}`, secs, isFocus: i === 0 });
      }
    } else if (timeRange === '365D') { // 12 months
      rangeMs = 365 * 86400000;
      const curMonth = new Date(now).getMonth();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(curMonth - i);
        const filterVal = d.getMonth() + '_' + d.getFullYear();
        const secs = allSessions.filter(s => {
           const sd = new Date(s.completedAt);
           return (sd.getMonth() + '_' + sd.getFullYear()) === filterVal;
        }).reduce((s,x)=>s+x.actualSecs, 0);
        bars.push({ label: ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()], secs, isFocus: i === 0 });
      }
    }

    const totalRangeSecs = allSessions.filter(s => s.completedAt > now - rangeMs).reduce((s,x)=>s+x.actualSecs,0);
    const maxSecs = Math.max(...bars.map(b=>b.secs), 1);
    
    return { bars, totalRangeSecs, maxSecs };
  }, [allSessions, timeRange, now]);

  const recent = allSessions?.slice(0,6) ?? [];

  return (
    <div className={isEmbedded ? "pb-8" : "min-h-screen px-4 md:px-8 py-8 w-full max-w-6xl mx-auto"}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-outline-variant/10">
        <div>
          <h1 className="font-headline font-black text-3xl text-primary flex items-center gap-2 tracking-tight">
            <Sparkles size={28} className="text-primary"/> Personal Growth
          </h1>
          <p className="font-body text-sm text-on-surface-variant font-medium mt-1">
            Tracking your consistency, focus mechanics, and cumulative output.
          </p>
        </div>
        <div className="flex gap-2 whitespace-nowrap overflow-x-auto no-scrollbar pb-1">
          <div className="px-5 py-3 rounded-xl bg-surface-container-highest border border-outline-variant/20 shadow-md flex-shrink-0">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 flex items-center gap-1"><Flame size={12} className="text-[#ffba38]"/> Today</div>
            <div className="font-headline font-black text-xl text-on-surface">{minsFromSecs(todaySecs)} <span className="text-sm font-normal text-on-surface-variant">mins</span></div>
          </div>
          <div className="px-5 py-3 rounded-xl bg-surface-container-highest border border-outline-variant/20 shadow-md flex-shrink-0">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 flex items-center gap-1"><Trophy size={12} className="text-primary"/> Sessions</div>
            <div className="font-headline font-black text-xl text-on-surface">{allSessions?.length ?? 0} <span className="text-sm font-normal text-on-surface-variant">total</span></div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
        
        {/* Streak Card */}
        <div className="md:col-span-4 rounded-3xl p-8 shadow-xl relative overflow-hidden group" style={{background:'linear-gradient(135deg, #FFBA38 0%, #FF8A00 100%)'}}>
           <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <Flame size={120} color="#000" />
           </div>
           <div className="relative z-10 text-[#2D1A00]">
             <div className="font-headline font-bold text-xs uppercase tracking-widest mb-6 opacity-80 flex items-center gap-2">Consistency Streak</div>
             <div className="flex items-baseline gap-2 mb-2">
                <span className="font-headline font-black text-7xl tracking-tighter">{currentStreak}</span>
                <span className="font-bold text-xl uppercase">Days</span>
             </div>
             <p className="font-medium text-sm leading-relaxed max-w-[200px] opacity-90">
               {currentStreak > 0 ? "You're building unstoppable momentum. Keep showing up." : "Every grand journey begins with a single step. Start a session today."}
             </p>
             <div className="mt-8 pt-4 border-t border-[#2D1A00]/20 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Best Streak</span>
                <span className="font-headline font-black text-xl">{maxStreak} Days</span>
             </div>
           </div>
        </div>

        {/* Dynamic Accumulation Chart */}
        <div className="md:col-span-8 rounded-3xl p-6 md:p-8 border border-outline-variant/10 shadow-lg bg-[#111318] flex flex-col min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
             <div className="min-w-0">
                <h3 className="font-headline font-black text-lg md:text-xl text-on-surface mb-1 flex items-center gap-2 whitespace-nowrap"><Activity className="text-primary flex-shrink-0"/> Volume Accumulation</h3>
                <p className="text-xs text-on-surface-variant font-medium">Your total deep work volume over time intervals.</p>
             </div>
             
             <div className="flex flex-col sm:items-end gap-3 flex-shrink-0">
               <div className="bg-primary/10 text-primary-fixed-dim px-4 py-1.5 rounded-full font-bold text-xs md:text-sm uppercase tracking-widest whitespace-nowrap">
                  {hoursFromSecs(graphData.totalRangeSecs)} Hours
               </div>
               <div className="flex bg-surface-container rounded-lg p-1 overflow-x-auto no-scrollbar max-w-full">
                  {RANGES.map(r => (
                    <button key={r.value} onClick={() => setTimeRange(r.value)}
                      className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all whitespace-nowrap ${timeRange === r.value ? 'bg-[#212328] text-primary shadow-sm' : 'text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container-high/50'}`}>
                      {r.label}
                    </button>
                  ))}
               </div>
             </div>
          </div>

          <div className="flex-1 w-full overflow-x-auto no-scrollbar">
            <div className={`flex items-end justify-between gap-1 md:gap-2 h-48 pb-2 ${timeRange === '30D' ? 'min-w-[600px]' : 'min-w-full'}`}>
              {graphData.bars.map((bar, i) => {
                const pct = Math.round((bar.secs / graphData.maxSecs) * 100);
                return (
                  <div key={i} className="flex-1 min-w-[12px] max-w-[50px] flex flex-col items-center gap-3 group relative h-full">
                    {bar.secs > 0 && (
                      <div className="absolute -top-5 w-full text-center text-[10px] md:text-xs font-bold text-primary-fixed-dim tabular-nums z-10 hidden group-hover:block transition-all whitespace-nowrap">
                        {(bar.secs / 3600).toFixed(1)}h
                      </div>
                    )}
                    <div className={`w-full relative flex items-end justify-center rounded-t-lg transition-all h-full ${bar.secs === 0 ? 'border border-dashed border-outline-variant/20 bg-transparent' : 'bg-surface-container overflow-hidden'}`}>
                      {bar.secs > 0 && (
                        <div className="w-full transition-all duration-700 ease-out rounded-t-lg" 
                             style={{height: `${pct}%`, background: bar.isFocus ? 'linear-gradient(to top, #00dbe9, #00f0ff)' : '#333b42', minHeight: '8px'}} />
                      )}
                    </div>
                    <span className={`font-headline text-[8px] md:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${bar.isFocus ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Deep Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 rounded-3xl bg-surface-container-highest border border-outline-variant/10 shadow-sm flex flex-col items-start">
           <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Target size={24}/>
           </div>
           <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Focus Integrity</div>
           <div className="font-headline font-black text-4xl mb-2 text-on-surface">{focusIntegrity}%</div>
           <p className="text-sm text-on-surface-variant/70">Sessions run to fully intended completion without ending early.</p>
        </div>
        <div className="p-6 rounded-3xl bg-surface-container-highest border border-outline-variant/10 shadow-sm flex flex-col items-start">
           <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4 text-secondary">
              <TrendingUp size={24}/>
           </div>
           <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Output</div>
           <div className="font-headline font-black text-4xl mb-2 text-on-surface">{hoursFromSecs(totalSecs)}<span className="text-xl ml-1 font-normal text-on-surface-variant">hrs</span></div>
           <p className="text-sm text-on-surface-variant/70">Cumulative hours of extremely deep work locked in system.</p>
        </div>
        <div className="p-6 rounded-3xl bg-surface-container-highest border border-outline-variant/10 shadow-sm flex flex-col items-start">
           <div className="w-12 h-12 rounded-full bg-[#ffba38]/10 flex items-center justify-center mb-4 text-[#ffba38]">
              <Clock size={24}/>
           </div>
           <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Tasks Demolished</div>
           <div className="font-headline font-black text-4xl mb-2 text-on-surface">{doneTasks}</div>
           <p className="text-sm text-on-surface-variant/70">Goals checked off across all domains showing immense progress.</p>
        </div>
      </div>

      {/* Session Log Refined */}
      <div className="rounded-3xl bg-[#111318] border border-outline-variant/20 shadow-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-outline-variant/10 flex items-center justify-between">
          <h3 className="font-headline font-black text-lg text-on-surface">Recent Focus Blocks</h3>
          <span className="px-3 py-1 bg-surface-container text-on-surface-variant font-bold text-[10px] uppercase tracking-widest rounded-full">{recent.length} Records</span>
        </div>
        {recent.length===0 ? (
          <div className="py-16 text-center">
            <div className="font-headline font-bold text-sm text-on-surface-variant/50 uppercase tracking-widest mb-2">No blocks recorded yet</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container/30">
                  {['Date','Target Mission','Duration','Integrity'].map((h,i)=>(
                    <th key={h} className={`py-4 px-8 font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant/70 whitespace-nowrap ${i===3?'text-right':''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((s,i)=>{
                  const eff = Math.min(Math.round((s.actualSecs/s.durationSecs)*100),100);
                  const ok  = eff >= 90;
                  return (
                    <tr key={i} className="border-b border-outline-variant/5 hover:bg-surface-container-high/30 transition-colors">
                      <td className="py-4 px-8 font-bold text-on-surface-variant text-[11px] whitespace-nowrap">{new Date(s.completedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</td>
                      <td className="py-4 px-8 font-headline font-bold text-on-surface uppercase tracking-tight text-sm truncate max-w-[200px]">{s.taskLabel}</td>
                      <td className="py-4 px-8 font-headline font-bold text-primary-fixed-dim tabular-nums tracking-wide whitespace-nowrap">{minsFromSecs(s.actualSecs)} Min</td>
                      <td className="py-4 px-8 text-right whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest ${ok?'text-[#00e475] bg-[#00e475]/10':'text-on-surface-variant bg-surface-container'}`}>{ok?'✓ Complete':'Partial'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
    </div>
  );
};
