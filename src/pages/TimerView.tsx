import { useEffect, useState } from 'react';
import { Lock, Zap, ChevronDown, X, Plus, Edit3 } from 'lucide-react';
import { useTimerStore } from '../store/timerStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

const PRESETS = [
  { label: 'Focus',  mins: 30, desc: 'Default' },
  { label: 'Deep',   mins: 60, desc: 'Extended' },
  { label: 'Macro',  mins: 90, desc: 'Flow state' },
];

export const TimerView = () => {
  const {
    state, duration, sessionEndTime,
    startTimer, checkTimerState, resetTimer, endTimer, pauseTimer, resumeTimer,
    activeTask, setActiveTask,
  } = useTimerStore();

  const [timeLeft, setTimeLeft]         = useState(duration);
  const [selectedMins, setSelectedMins] = useState(30);
  const [customMins, setCustomMins]     = useState('');
  const [showCustom, setShowCustom]     = useState(false);
  const [lockIn, setLockIn]             = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState('');

  const pendingTasks = useLiveQuery(
    () => db.tasks.where('status').anyOf(['pending','active']).reverse().sortBy('createdAt'),
    []
  );

  /* ── Countdown sync ── */
  useEffect(() => {
    const iv = setInterval(() => {
      if (state === 'running' && sessionEndTime) {
        checkTimerState();
        setTimeLeft(Math.max(0, Math.ceil((sessionEndTime - Date.now()) / 1000)));
      } else if (state === 'idle') {
        setTimeLeft(selectedMins * 60);
      } else if (state === 'completed' || state === 'ringing') {
        setTimeLeft(0);
      } else if (state === 'paused') {
        // Just maintain current timeLeft
      }
    }, 250);
    return () => clearInterval(iv);
  }, [state, sessionEndTime, selectedMins, checkTimerState]);

  const absTime = Math.max(0, Math.abs(timeLeft));
  const m = Math.floor(absTime / 60).toString().padStart(2,'0');
  const s = (absTime % 60).toString().padStart(2,'0');

  const totalDuration = (state === 'running' || state === 'completed') ? duration : selectedMins * 60;
  const progress = totalDuration > 0
    ? (state === 'completed' ? 1 : Math.max(0, Math.min(1, (totalDuration - timeLeft) / totalDuration)))
    : 0;

  const R    = 44;
  const circ = 2 * Math.PI * R;
  const dashOffset = circ * (1 - progress);

  const isRunning   = state === 'running';
  const isPaused    = state === 'paused';
  const isRinging   = state === 'ringing';
  const isCompleted = state === 'completed';

  const handleStart = () => { if (state === 'idle' || state === 'completed') startTimer(selectedMins * 60); };
  const handleReset = () => { resetTimer(); setTimeLeft(selectedMins * 60); };
  const handleEnd   = () => { endTimer(); setTimeLeft(0); };

  const applyCustom = () => {
    const v = parseInt(customMins);
    if (v > 0 && v <= 480) {
      setSelectedMins(v);
      setShowCustom(false);
      setCustomMins('');
    }
  };

  const selectPreset = (mins: number) => {
    setSelectedMins(mins);
    setShowCustom(false);
  };

  const quickAddTask = async () => {
    const label = newTaskLabel.trim().toUpperCase();
    if (!label) return;
    const id = await db.tasks.add({ label, status: 'active', priority: 'HIGH', createdAt: Date.now() });
    setActiveTask({ id, label });
    setNewTaskLabel('');
    setShowTaskPicker(false);
  };

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-64px)] px-4 py-8 md:py-12 relative">

      {/* Status Row */}
      <div className="w-full max-w-lg flex justify-between items-center mb-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-sm transition-colors ${isRunning ? 'bg-secondary shadow-[0_0_8px_#00e475] animate-pulse' : 'bg-outline/40'}`} />
          <span className="font-headline font-bold text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            {isRunning ? 'Session Active' : isCompleted ? 'Session Complete' : 'Standby'}
          </span>
        </div>
        <span className="font-headline font-bold text-[10px] uppercase tracking-widest text-primary-fixed-dim">v1.0.4-stable</span>
      </div>

      {/* Timer Ring */}
      <div className="relative flex items-center justify-center mb-10" style={{ width: 280, height: 280 }}>
        <div className="absolute inset-0 rounded-full border border-primary/20 pointer-events-none transition-all duration-300"
          style={{ animation: (isRunning || isRinging) ? 'ripple 2s cubic-bezier(0.2, 0, 0.2, 1) 0s infinite' : 'none', opacity: 0 }} />
        <div className="absolute inset-0 rounded-full border border-primary/20 pointer-events-none transition-all duration-300"
          style={{ animation: (isRunning || isRinging) ? 'ripple 2s cubic-bezier(0.2, 0, 0.2, 1) -1s infinite' : 'none', opacity: 0 }} />

        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90 overflow-visible">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#282a2e" strokeWidth="5" />
          <circle cx="50" cy="50" r={R} fill="none"
            stroke={isCompleted ? '#00e475' : isPaused ? '#6b7280' : isRinging ? '#ff4081' : '#00dbe9'}
            strokeWidth="5" strokeLinecap="butt"
            strokeDasharray={circ} strokeDashoffset={dashOffset}
            className="transition-all duration-300 ease-linear"
            style={{ filter: isRinging ? 'drop-shadow(0 0 10px rgba(255,64,129,0.9))' : isRunning ? 'drop-shadow(0 0 10px rgba(0,219,233,0.8))' : 'none' }}
          />
        </svg>

        <div className="absolute rounded-full"
          style={{ inset:'12px', background:'radial-gradient(circle at 40% 35%, #1a1c20 0%, #111318 100%)' }} />

        <div className="relative z-10 flex flex-col items-center">
          <span className={`font-headline font-black tabular-nums leading-none transition-all duration-300 ${isCompleted ? 'text-secondary secondary-glow' : isRinging ? 'text-[#ff4081]' : isPaused ? 'text-on-surface-variant' : isRunning ? 'text-primary terminal-glow' : 'text-primary/60'}`}
            style={{ fontSize:'3.5rem', letterSpacing:'-0.04em' }}>
            {m}:{s}
          </span>
          <span className="mt-2 font-headline font-bold text-[10px] uppercase tracking-[0.25em] text-on-surface-variant">
            {isCompleted ? '✓ Complete' : isRinging ? 'TIME IS UP' : isPaused ? '⏸ PAUSED' : isRunning ? `${Math.round(progress*100)}%` : `${selectedMins} min`}
          </span>
          {(isRunning || isRinging || isPaused) && (
            <div className="mt-3 flex items-center gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className={`w-1 h-1 rounded-full transition-colors duration-300 ${isPaused ? 'bg-[#6b7280]' : 'bg-primary-fixed-dim'}`}
                  style={{ animation: isPaused ? 'none' : `dotPulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preset Selector */}
      <div className="w-full max-w-lg mb-2">
        <div className="grid grid-cols-3 gap-2 mb-2">
          {PRESETS.map(({ label, mins, desc }) => {
            const active = selectedMins === mins && !showCustom;
            return (
              <button key={label} disabled={isRunning} onClick={() => selectPreset(mins)}
                className={`py-4 flex flex-col items-center gap-1 transition-all duration-150 active:scale-95 border-b-2 ${
                  active ? 'border-primary-fixed-dim text-primary' : 'border-transparent text-on-surface-variant hover:border-primary/30 hover:text-primary/70'
                } ${isRunning ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{ background: active ? 'rgba(0,219,233,0.06)' : '#1a1c20' }}>
                <span className="font-headline font-bold text-[9px] uppercase tracking-[0.2em] opacity-60">{label}</span>
                <span className="font-headline font-black text-xl tabular-nums">{mins}:00</span>
                <span className="font-headline text-[8px] uppercase tracking-widest opacity-40">{desc}</span>
              </button>
            );
          })}
        </div>

        {/* Custom time button */}
        <button
          disabled={isRunning}
          onClick={() => !isRunning && setShowCustom(!showCustom)}
          className={`w-full py-3 flex items-center justify-center gap-2 font-headline font-bold text-[10px] uppercase tracking-widest transition-all border-b-2 ${
            showCustom ? 'border-tertiary-fixed-dim text-tertiary-fixed-dim' : 'border-transparent text-on-surface-variant/50 hover:text-primary/60 hover:border-primary/20'
          } ${isRunning ? 'opacity-30 cursor-not-allowed' : ''}`}
          style={{ background: showCustom ? 'rgba(255,186,56,0.04)' : '#111318' }}
        >
          <Edit3 size={12} />
          {showCustom && selectedMins && !PRESETS.find(p=>p.mins===selectedMins)
            ? `Custom: ${selectedMins}m`
            : 'Custom Duration'}
        </button>

        {showCustom && !isRunning && (
          <div className="flex items-center gap-2 mt-2 p-3" style={{ background:'#1e2024', border:'1px solid rgba(255,186,56,0.2)' }}>
            <span className="font-headline font-bold text-[10px] text-on-surface-variant uppercase tracking-widest whitespace-nowrap">
              Minutes:
            </span>
            <input
              autoFocus
              type="number" min="1" max="480"
              value={customMins}
              onChange={e => setCustomMins(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyCustom()}
              placeholder="e.g. 45"
              className="flex-1 bg-transparent font-headline font-black text-xl text-tertiary-fixed-dim tabular-nums outline-none placeholder:text-on-surface-variant/30"
            />
            <button onClick={applyCustom}
              className="px-4 py-1.5 font-headline font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95"
              style={{ background:'#ffba38', color:'#281900' }}>
              Set
            </button>
          </div>
        )}
      </div>

      {/* Task Pairing */}
      <div className="w-full max-w-lg mb-3 mt-3 relative">
        <button
          onClick={() => !isRunning && setShowTaskPicker(!showTaskPicker)}
          className={`w-full flex items-center justify-between p-4 group transition-all duration-150 border-l-2 ${isRunning ? 'cursor-default' : 'cursor-pointer hover:border-primary-fixed-dim'}`}
          style={{ background:'#1a1c20', borderLeftColor: activeTask.id ? '#00dbe9' : 'rgba(0,219,233,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0"
              style={{ background:'rgba(0,219,233,0.05)', border:'1px solid rgba(0,219,233,0.15)' }}>
              <Zap size={16} className="text-primary-fixed-dim" />
            </div>
            <div className="text-left">
              <div className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant mb-0.5">Current Objective</div>
              <div className="font-headline font-bold text-sm text-primary uppercase tracking-tight truncate max-w-[220px]">{activeTask.label}</div>
            </div>
          </div>
          {!isRunning && <ChevronDown size={18} className={`text-on-surface-variant/50 transition-transform flex-shrink-0 ${showTaskPicker ? 'rotate-180':''}`} />}
        </button>

        {showTaskPicker && (
          <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto no-scrollbar"
            style={{ background:'#1e2024', border:'1px solid rgba(0,219,233,0.12)', boxShadow:'0 8px 32px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center gap-2 p-3" style={{ borderBottom:'1px solid #282a2e' }}>
              <input autoFocus value={newTaskLabel} onChange={e => setNewTaskLabel(e.target.value)}
                onKeyDown={e => e.key==='Enter' && quickAddTask()}
                placeholder="NEW_TASK_LABEL..."
                className="flex-1 bg-transparent font-headline font-bold text-xs uppercase text-primary placeholder:text-on-surface-variant/30 outline-none tracking-wider" />
              <button onClick={quickAddTask}
                className="w-7 h-7 flex items-center justify-center text-primary-fixed-dim hover:bg-surface-container-highest transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <button onClick={() => { setActiveTask({ label:'General Focus' }); setShowTaskPicker(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-high transition-colors">
              <span className="font-headline font-bold text-xs text-on-surface-variant uppercase tracking-wider">General Focus</span>
            </button>
            {pendingTasks?.map(task => (
              <button key={task.id}
                onClick={() => {
                  setActiveTask({ id: task.id, label: task.label });
                  if (task.id) db.tasks.update(task.id, { status:'active' });
                  setShowTaskPicker(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${activeTask.id===task.id ? 'bg-surface-container-high':'hover:bg-surface-container-high/50'}`}>
                <div>
                  <div className="font-headline font-bold text-xs text-on-surface uppercase tracking-tight">{task.label}</div>
                  {task.meta && <div className="font-body text-[9px] text-outline uppercase tracking-widest">{task.meta}</div>}
                </div>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 border flex-shrink-0 ml-2 ${task.priority==='HIGH' ? 'text-error border-error/30' : task.priority==='MED' ? 'text-tertiary-fixed-dim border-tertiary-fixed-dim/30' : 'text-outline border-outline-variant'}`}>
                  {task.priority}
                </span>
              </button>
            ))}
            {(!pendingTasks || pendingTasks.length===0) && (
              <div className="px-4 py-3 text-[10px] text-on-surface-variant/50 uppercase tracking-widest">No tasks — type above to add one</div>
            )}
          </div>
        )}
      </div>

      {/* Lock-In Mode */}
      <div className="w-full max-w-lg mb-8 flex items-center justify-between p-4 border-l-2"
        style={{ background:'#1a1c20', borderLeftColor: lockIn ? '#ffba38' : 'rgba(255,186,56,0.25)' }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Lock size={12} className="text-tertiary-fixed-dim" />
            <span className="font-headline font-bold text-xs uppercase tracking-widest text-tertiary-fixed-dim">Lock-In Mode</span>
          </div>
          <div className="text-[10px] text-on-surface-variant/60 uppercase tracking-wide">Restrict all notifications & background</div>
        </div>
        <button onClick={() => setLockIn(!lockIn)}
          className="relative w-12 h-6 flex-shrink-0 transition-all duration-200"
          style={{ background: lockIn ? 'rgba(255,186,56,0.15)':'#111318', border:`1px solid ${lockIn?'#ffba38':'#3b494b'}` }}>
          <div className="absolute top-1 w-4 h-4 transition-all duration-200"
            style={{ left: lockIn ? 'calc(100% - 20px)':'4px', background: lockIn?'#ffba38':'#3b494b', boxShadow: lockIn?'0 0 8px rgba(255,186,56,0.6)':'none' }} />
        </button>
      </div>

      {/* CTA */}
      <div className="w-full max-w-lg mt-auto flex gap-2 pt-6">
        {!isRunning && !isPaused && !isRinging ? (
          <button onClick={handleStart}
            className="flex-1 py-5 font-headline font-black text-base uppercase tracking-[0.2em] transition-all duration-200 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #00dbe9 0%, #00f0ff 100%)',
              color: '#002022',
              boxShadow: '0 0 40px rgba(0,219,233,0.2), 0 4px 20px rgba(0,0,0,0.4)',
            }}>
            {isCompleted ? 'New Session' : `Initialize ${selectedMins}m Focus`}
          </button>
        ) : (
          <>
            {(isRunning || isPaused) && (
              <button onClick={isPaused ? resumeTimer : pauseTimer}
                className="px-6 py-5 font-headline font-black text-base uppercase tracking-[0.2em] transition-all duration-200 active:scale-[0.98] border border-outline-variant hover:border-primary hover:bg-surface-container-high"
                style={{ background: '#1a1c20', color: isPaused ? '#00dbe9' : '#ffba38' }}>
                {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
              </button>
            )}
            <button onClick={handleEnd}
              className="flex-1 py-5 font-headline font-black text-base uppercase tracking-[0.2em] transition-all duration-200 active:scale-[0.98] border border-outline-variant hover:border-error/50 hover:bg-surface-container-high"
              style={{ background: '#1a1c20', color: isRinging ? '#ff4081' : '#00dbe9' }}>
              {isRinging ? '■ STOP ALARM' : '■ END & SAVE'}
            </button>
          </>
        )}
        {(isRunning || isCompleted || isPaused || isRinging) && (
          <button onClick={handleReset}
            className="w-14 font-headline font-bold transition-all duration-150 active:scale-95 flex items-center justify-center"
            style={{ background:'#1a1c20', border:'1px solid #3b494b', color:'#849495' }}>
            <X size={16} />
          </button>
        )}
      </div>

      <style>{`
        @keyframes ripple { 0% { transform:scale(0.85); opacity:0; border-width:2px; border-color:rgba(0,219,233,0.8); } 30% { opacity:0.5; } 100% { transform:scale(1.25); opacity:0; border-width:1px; border-color:rgba(0,219,233,0); } }
        @keyframes dotPulse { 0%,100%{opacity:0.3;transform:scale(0.8);} 50%{opacity:1;transform:scale(1.2);} }
      `}</style>
    </div>
  );
};
