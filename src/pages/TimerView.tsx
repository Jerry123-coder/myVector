import { useEffect, useState, useMemo, useRef } from 'react';
import { X, Play, Pause, CheckCircle2, Music, Activity, Target, Rocket } from 'lucide-react';
import { useTimerStore } from '../store/timerStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useToast } from '../components/ToastContext';
import type { Route } from '../App';
import { motion, AnimatePresence } from 'framer-motion';

type BlockType = 'focus' | 'break';

interface FlowBlock {
  type: BlockType;
  mins: number;
  label: string;
}

interface FlowTemplate {
  id: string;
  label: string;
  desc: string;
  blocks: FlowBlock[];
}

const TEMPLATES: FlowTemplate[] = [
  {
    id: 'single',
    label: 'Single Focus',
    desc: 'Pure concentration directive',
    blocks: [{ type: 'focus', mins: 30, label: 'Deep Concentration' }]
  },
  {
    id: 'pomodoro',
    label: 'Pomodoro Protocol',
    desc: '25m Focus / 5m Recovery',
    blocks: [
      { type: 'focus', mins: 25, label: 'Active Sprint' },
      { type: 'break', mins: 5, label: 'System Recovery' }
    ]
  },
  {
    id: 'deep-work',
    label: 'Deep Work Protocol',
    desc: 'Elite endurance training',
    blocks: [
      { type: 'focus', mins: 90, label: 'Deep Focus Alpha' },
      { type: 'break', mins: 15, label: 'System Reboot' },
      { type: 'focus', mins: 45, label: 'Deep Focus Beta' }
    ]
  }
];

const AMBIENT_TRACKS = [
  { id: 'none', label: 'Silence', url: '' },
  { id: 'deep-space', label: 'Deep Space', url: 'https://actions.google.com/sounds/v1/science_fiction/deep_space.ogg' },
  { id: 'cafe', label: 'Lofi Cafe', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
  { id: 'white-noise', label: 'White Noise', url: 'https://actions.google.com/sounds/v1/weather/wind.ogg' },
];

interface TimerViewProps { setRoute: (r: Route) => void; }

export const TimerView = ({ setRoute }: TimerViewProps) => {
  const [userTemplates] = useState<FlowTemplate[]>(() => {
    const saved = localStorage.getItem('vector-user-templates');
    return saved ? JSON.parse(saved) : [];
  });

  const ALL_TEMPLATES = [...TEMPLATES, ...userTemplates];
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('single');
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  
  const selectedTemplate = ALL_TEMPLATES.find(t => t.id === selectedTemplateId) || ALL_TEMPLATES[0];
  const currentBlock = selectedTemplate.blocks[currentBlockIndex] || selectedTemplate.blocks[0];

  const {
    state, duration, sessionEndTime,
    startTimer, checkTimerState, resetTimer, endTimer, pauseTimer, resumeTimer,
    activeTask, setActiveTask, ambientTrackId, setAmbientTrack
  } = useTimerStore();
  const { showToast } = useToast();

  const [timeLeft, setTimeLeft] = useState(duration);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dailyTasks = useLiveQuery(() => db.dailyTasks.where('date').equals(new Date().toISOString().split('T')[0]).toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const isRunning   = state === 'running';
  const isPaused    = state === 'paused';
  const isRinging   = state === 'ringing';
  const isCompleted = state === 'completed';
  const isBreak     = currentBlock.type === 'break';
  const isZen       = isRunning || isPaused || isRinging;
  
  const activeTaskCategory = useMemo(() => {
    if (!activeTask.id) return 'CRAFT';
    const task = dailyTasks?.find(t => t.id === activeTask.id);
    return task?.category || 'CRAFT';
  }, [activeTask.id, dailyTasks]);

  const pillarTheme = useMemo(() => {
    const found = categories.find(c => c.id === activeTaskCategory);
    if (isBreak) return { color: '#00e475', rgb: '0,228,117', glow: 'rgba(0,228,117,0.3)', hex: '#00e475' };
    return {
      color: found?.glow.includes('rgba') ? found.glow.match(/rgba\((\d+,\d+,\d+)/)?.[1] || '0,219,233' : '0,219,233',
      hex: found?.color.includes('#') ? found.color : '#00dbe9',
      glow: found?.glow || 'rgba(0,219,233,0.3)'
    };
  }, [activeTaskCategory, categories, isBreak]);

  const mergedTasks = useMemo(() => {
    return (dailyTasks || []).filter((d: any) => !d.done).map((d: any) => ({
      id: d.id,
      label: d.label,
      priority: 'HIGH' as const,
      isDaily: true,
      category: d.category
    }));
  }, [dailyTasks]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (state === 'running' && sessionEndTime) {
        checkTimerState();
        setTimeLeft(Math.max(0, Math.ceil((sessionEndTime - Date.now()) / 1000)));
      } else if (state === 'idle') {
        setTimeLeft(currentBlock.mins * 60);
      } else if (state === 'completed' || state === 'ringing') {
        setTimeLeft(0);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [state, sessionEndTime, currentBlock.mins, checkTimerState]);

  useEffect(() => {
    if (!audioRef.current) return;
    const track = AMBIENT_TRACKS.find(t => t.id === ambientTrackId);
    if (isRunning && !isBreak && track && track.id !== 'none') {
      if (audioRef.current.src !== track.url) audioRef.current.src = track.url;
      audioRef.current.play().catch(e => console.log('Audio playback blocked:', e));
    } else {
      audioRef.current.pause();
    }
  }, [isRunning, isBreak, ambientTrackId]);

  const absTime = Math.max(0, Math.abs(timeLeft));
  const m = Math.floor(absTime / 60).toString().padStart(2,'0');
  const s = (absTime % 60).toString().padStart(2,'0');

  const progress = duration > 0 ? (state === 'completed' ? 1 : Math.max(0, Math.min(1, (duration - timeLeft) / duration))) : 0;
  const R = 45;
  const circ = 2 * Math.PI * R;
  const dashOffset = circ * (1 - progress);

  const executeStart = () => {
    startTimer(currentBlock.mins * 60, currentBlock.type);
    showToast(`${isBreak ? 'Recovery' : 'Mission'} Engaged`, 'success');
  };

  const completeActiveTask = async () => {
     if (!activeTask.id) return;
     const dt = await db.dailyTasks.get(activeTask.id);
     if (dt) {
        await db.dailyTasks.update(activeTask.id, { done: true, updatedAt: Date.now() });
        showToast('Objective Purged', 'success');
        setActiveTask({ label: 'System Standby' });
     }
  };

  const handleNextBlock = () => {
    if (isRinging || isRunning) endTimer();
    if (currentBlockIndex + 1 < selectedTemplate.blocks.length) {
      setCurrentBlockIndex(currentBlockIndex + 1);
      resetTimer();
    } else {
      resetTimer();
      setCurrentBlockIndex(0);
    }
  };

  const quickAddTask = async () => {
    const labelText = newTaskLabel.trim().toUpperCase();
    if (!labelText) return;
    const ts = Date.now();
    const id = await db.dailyTasks.add({ 
      label: labelText, done: false, category: 'deep-work', order: 0, 
      date: new Date().toISOString().split('T')[0], updatedAt: ts 
    });
    setActiveTask({ id, label: labelText, isDaily: true });
    setNewTaskLabel('');
  };

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-64px)] px-4 py-12 relative overflow-hidden no-scrollbar w-full max-w-7xl mx-auto">
      
      {/* Background Aura */}
      <AnimatePresence>
         {isZen && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 pointer-events-none z-0"
               style={{ background: `radial-gradient(circle at center, ${pillarTheme.glow.replace('0.3', '0.05')} 0%, transparent 70%)` }}
            />
         )}
      </AnimatePresence>

      <div className="w-full flex justify-between items-center mb-16 relative z-10">
         <div className="flex items-center gap-3 bg-black/10 border border-white/5 px-4 py-2 rounded-full backdrop-blur-xl">
            <div className={`w-1 h-1 rounded-full ${isRunning ? 'bg-primary animate-pulse shadow-[0_0_8px_#00dbe9]' : 'bg-white/10'}`} />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">
               {isRunning ? 'Mission Engaging' : 'Standby'}
            </span>
         </div>
         
         <button onClick={() => setRoute('analytics')} className="p-2 text-on-surface-variant/10 hover:text-primary transition-all">
            <Activity size={16} />
         </button>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-24 lg:gap-40 relative z-10">
         
         {/* TIMER STAGE */}
         <div className="relative flex flex-col items-center">
            <div className="relative w-80 h-80 md:w-[420px] md:h-[420px] flex items-center justify-center">
               
               {/* Clean Kinetic Ring */}
               <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90 overflow-visible">
                  <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.01)" strokeWidth="0.5" />
                  <motion.circle 
                     cx="50" cy="50" r={R} fill="none" 
                     stroke={isZen ? pillarTheme.hex : 'rgba(255,255,255,0.03)'} 
                     strokeWidth={isZen ? "1.5" : "0.5"}
                     strokeLinecap="round"
                     strokeDasharray={circ}
                     strokeDashoffset={dashOffset}
                     animate={{ stroke: isRinging ? '#ff4081' : isZen ? pillarTheme.hex : 'rgba(255,255,255,0.03)' }}
                     style={{ filter: isZen ? `drop-shadow(0 0 10px ${pillarTheme.glow})` : 'none' }}
                     className="transition-all duration-1000"
                  />
               </svg>

               {/* Center HUD */}
               <div className="relative z-10 flex flex-col items-center text-center">
                  <AnimatePresence mode="wait">
                     {isZen && (
                        <motion.div 
                           key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                           className="text-[10px] font-black uppercase tracking-[0.5em] text-on-surface-variant/30 mb-4"
                        >
                           {isBreak ? 'RECOVERY' : 'EXECUTION'}
                        </motion.div>
                     )}
                  </AnimatePresence>

                  <div className="relative mb-6">
                     <span className="text-8xl md:text-[10rem] font-headline font-black text-on-surface tabular-nums tracking-tighter leading-none">
                        {m}:{s}
                     </span>
                  </div>

                  <div className="mt-8">
                     {!isRunning && !isPaused && !isRinging && !isCompleted ? (
                        <button onClick={executeStart} className="px-14 py-4 bg-primary text-black rounded-full font-headline font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-xl">
                           ENGAGE
                        </button>
                     ) : (
                        <div className="flex items-center gap-6">
                           {isRinging || isCompleted ? (
                              <button onClick={handleNextBlock} className="px-10 py-4 bg-secondary text-black rounded-full font-headline font-black text-[10px] uppercase tracking-[0.3em]">
                                 CONTINUE
                              </button>
                           ) : (
                              <>
                                 <button onClick={isPaused ? resumeTimer : pauseTimer} className="w-16 h-16 rounded-full flex items-center justify-center bg-white/5 text-on-surface hover:bg-white/10 transition-all">
                                    {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                                 </button>
                                 <button onClick={resetTimer} className="w-16 h-16 rounded-full bg-white/5 text-on-surface-variant/40 hover:text-error transition-all flex items-center justify-center">
                                    <X size={20} />
                                 </button>
                              </>
                           )}
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         {/* CONFIG: PURE MINIMALISM */}
         <div className={`w-full max-w-xs transition-all duration-1000 ${isZen ? 'opacity-0 pointer-events-none translate-x-12' : 'opacity-100 translate-x-0'}`}>
            
            <div className="mb-14">
               <span className="text-[9px] font-black uppercase tracking-[0.4em] text-on-surface-variant/20 flex items-center gap-2 mb-6 px-2">
                  <Rocket size={12} /> PROTOCOL
               </span>
               <div className="space-y-1">
                  {ALL_TEMPLATES.map(t => (
                     <button key={t.id} onClick={() => { setSelectedTemplateId(t.id); setCurrentBlockIndex(0); }}
                             className={`w-full px-4 py-4 rounded-2xl text-left transition-all ${selectedTemplateId === t.id ? 'bg-primary/5 text-primary' : 'bg-transparent text-on-surface-variant/30 hover:text-on-surface-variant/60'}`}>
                        <div className="text-[10px] font-black uppercase tracking-widest">{t.label}</div>
                     </button>
                  ))}
               </div>
            </div>

            <div className="mb-14">
               <span className="text-[9px] font-black uppercase tracking-[0.4em] text-on-surface-variant/20 flex items-center gap-2 mb-6 px-2">
                  <Target size={12} /> DIRECTIVE
               </span>
               <div className="px-4">
                  <div className="flex items-center gap-4 mb-6">
                     <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-black uppercase text-on-surface-variant/60 truncate tracking-tight">{activeTask.label}</div>
                     </div>
                     {activeTask.id && (
                        <button onClick={completeActiveTask} className="text-secondary opacity-20 hover:opacity-100 transition-all">
                           <CheckCircle2 size={16} />
                        </button>
                     )}
                  </div>
                  <div className="space-y-1">
                     <input value={newTaskLabel} onChange={e => setNewTaskLabel(e.target.value)} onKeyDown={e => e.key==='Enter' && quickAddTask()}
                            placeholder="DEPLOY DIRECTIVE..." className="w-full bg-transparent border-b border-white/5 py-3 text-[10px] font-black uppercase text-primary placeholder:text-on-surface-variant/10 outline-none mb-4" />
                     <div className="max-h-40 overflow-y-auto no-scrollbar">
                        {mergedTasks.map(t => (
                           <button key={t.id} onClick={() => setActiveTask({ id: t.id, label: t.label, isDaily: true })}
                                   className={`w-full py-2.5 text-left text-[10px] font-black uppercase transition-all ${activeTask.id === t.id ? 'text-primary' : 'text-on-surface-variant/20 hover:text-on-surface-variant/40'}`}>
                              {t.label}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div>
               <span className="text-[9px] font-black uppercase tracking-[0.4em] text-on-surface-variant/20 flex items-center gap-2 mb-6 px-2">
                  <Music size={12} /> AMBIENCE
               </span>
               <div className="flex flex-wrap gap-3 px-2">
                  {AMBIENT_TRACKS.map(track => (
                     <button key={track.id} onClick={() => setAmbientTrack(track.id)}
                             className={`text-[9px] font-black uppercase transition-all ${ambientTrackId === track.id ? 'text-primary' : 'text-on-surface-variant/20 hover:text-on-surface-variant/40'}`}>
                        {track.label}
                     </button>
                  ))}
               </div>
               <audio ref={audioRef} loop />
            </div>

         </div>
      </div>
    </div>
  );
};
