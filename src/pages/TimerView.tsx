import { useEffect, useState, useMemo, useRef } from 'react';
import { X, Play, Pause, CheckCircle2, Music, Activity, Target, Clock, Plus, CloudDownload } from 'lucide-react';
import { useTimerStore } from '../store/timerStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useToast } from '../components/ToastContext';
import type { Route } from '../App';
import { motion, AnimatePresence } from 'framer-motion';

const AMBIENT_TRACKS = [
  { id: 'none',        label: 'Silence',       url: '' },
  { id: 'forest',      label: 'Forest Piano',  url: 'https://cdn.pixabay.com/audio/2024/02/28/audio_3f6a85f07f.mp3' },
  { id: 'lofi-rain',   label: 'Rainy Lofi',    url: 'https://cdn.pixabay.com/audio/2023/10/30/audio_3d56b4604b.mp3' },
  { id: 'jazz',        label: 'Study Jazz',    url: 'https://cdn.pixabay.com/audio/2024/01/17/audio_40c877d5a2.mp3' },
  { id: 'deep-ocean',  label: 'Deep Ocean',    url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_1e58f65942.mp3' },
];

interface TimerViewProps { setRoute: (r: Route) => void; }

const tagTheme: Record<string, { bg: string; text: string; border: string }> = {
  'deep-work': { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  'admin': { bg: 'bg-tertiary-fixed-dim/10', text: 'text-tertiary-fixed-dim', border: 'border-tertiary-fixed-dim/20' },
  'skill': { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  'workout': { bg: 'bg-error/10', text: 'text-error', border: 'border-error/20' },
};

const tagLabel: Record<string, string> = {
  'deep-work': 'DEEP WORK',
  'admin': 'ADMIN',
  'skill': 'STUDY',
  'workout': 'WORKOUT',
};

const getTagTheme = (tag: string) => {
  return tagTheme[tag] || { bg: 'bg-white/5', text: 'text-on-surface-variant/70', border: 'border-white/10' };
};

const getTagLabel = (tag: string) => {
  return tagLabel[tag] || tag.toUpperCase();
};

export const TimerView = ({ setRoute }: TimerViewProps) => {
  const {
    state, duration, sessionEndTime, sessionType,
    startTimer, checkTimerState, resetTimer, endTimer, pauseTimer, resumeTimer,
    activeTask, setActiveTask, ambientTrackId, setAmbientTrack, setDuration
  } = useTimerStore();

  const { showToast } = useToast();
  // const { currentStreak } = useXP();
  const sprints = useLiveQuery(() => db.sprints.toArray()) ?? [];
  const sessions = useLiveQuery(() => db.sessions.toArray()) ?? [];

  const activeSprint = useMemo(() => {
    const now = Date.now();
    return sprints.find(s => s.status === 'active' && s.startDate <= now && s.endDate >= now)
      ?? sprints.find(s => s.status === 'active');
  }, [sprints]);

  const sprintFocusHours = useMemo(() => {
    let secs = 0;
    if (activeSprint) {
      secs = sessions
        .filter(s => s.type === 'focus' && s.completedAt >= activeSprint.startDate && s.completedAt <= activeSprint.endDate)
        .reduce((sum, s) => sum + s.actualSecs, 0);
    } else {
      secs = sessions
        .filter(s => s.type === 'focus')
        .reduce((sum, s) => sum + s.actualSecs, 0);
    }
    return (secs / 3600).toFixed(1);
  }, [sessions, activeSprint]);

  const [timeLeft, setTimeLeft] = useState(duration);
  const [sessionMode, setSessionMode] = useState<'focus' | 'break'>('focus');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [taskInputValue, setTaskInputValue] = useState(() => {
    return activeTask && activeTask.id ? activeTask.label : '';
  });
  const [newTaskCategory, setNewTaskCategory] = useState<'deep-work' | 'admin' | 'skill' | 'workout' | string>('deep-work');
  
  // Custom tags list
  const [availableTags, setAvailableTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('vector_focus_tags');
    return saved ? JSON.parse(saved) : ['deep-work', 'admin', 'skill', 'workout'];
  });
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // 4-Preset FIFO queue logic
  const [timerPresets, setTimerPresets] = useState<number[]>(() => {
    const saved = localStorage.getItem('vector_timer_presets');
    return saved ? JSON.parse(saved) : [15, 25, 45, 60];
  });
  const [showNewPresetInput, setShowNewPresetInput] = useState(false);
  const [newPresetMins, setNewPresetMins] = useState('');

  // Custom ambience state
  const [customUrl, setCustomUrl] = useState(() => localStorage.getItem('vector_custom_ambience_url') || '');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [showCustomAmbienceInput, setShowCustomAmbienceInput] = useState(false);

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const customPreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  const dailyTasks = useLiveQuery(() => db.dailyTasks.where('date').equals(new Date().toISOString().split('T')[0]).toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const isRunning   = state === 'running';
  const isPaused    = state === 'paused';
  const isRinging   = state === 'ringing';
  const isCompleted = state === 'completed';
  const isZen       = isRunning || isPaused || isRinging;
  
  const activeTaskCategory = useMemo(() => {
    if (!activeTask.id) return 'deep-work';
    const task = dailyTasks?.find(t => t.id === activeTask.id);
    return task?.category || 'deep-work';
  }, [activeTask.id, dailyTasks]);

  const pillarTheme = useMemo(() => {
    if (sessionType === 'break') {
      return { color: '0,228,117', hex: '#00e475', glow: 'rgba(0,228,117,0.3)' };
    }
    const categoryMapping: Record<string, string> = {
      'deep-work': 'CRAFT',
      'skill': 'CRAFT',
      'workout': 'HEALTH',
      'admin': 'CHARACTER'
    };
    const mappedId = categoryMapping[activeTaskCategory] || 'CRAFT';
    const found = categories.find(c => c.id === mappedId);
    return {
      color: found?.glow.includes('rgba') ? found.glow.match(/rgba\((\d+,\d+,\d+)/)?.[1] || '0,219,233' : '0,219,233',
      hex: found?.color.includes('#') ? found.color : '#00dbe9',
      glow: found?.glow || 'rgba(0,219,233,0.3)'
    };
  }, [activeTaskCategory, categories, sessionType]);

  const mergedTasks = useMemo(() => {
    return (dailyTasks || []).filter((d: any) => !d.done).map((d: any) => ({
      id: d.id,
      label: d.label,
      category: d.category
    }));
  }, [dailyTasks]);

  // Sync sessionMode with sessionType from store when running/paused
  useEffect(() => {
    if (isZen) {
      setSessionMode(sessionType);
    }
  }, [isZen, sessionType]);

  // Sync input value when active task is changed externally/loaded
  useEffect(() => {
    if (activeTask.id) {
      setTaskInputValue(activeTask.label);
    } else if (activeTask.label === 'General Focus' || activeTask.label === 'System Standby') {
      setTaskInputValue('');
    }
  }, [activeTask]);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (customPreviewAudioRef.current) customPreviewAudioRef.current.pause();
    };
  }, []);

  // Clock Countdown logic
  useEffect(() => {
    const iv = setInterval(() => {
      if (state === 'running' && sessionEndTime) {
        checkTimerState();
        setTimeLeft(Math.max(0, Math.ceil((sessionEndTime - Date.now()) / 1000)));
      } else if (state === 'idle') {
        setTimeLeft(duration);
      } else if (state === 'completed' || state === 'ringing') {
        setTimeLeft(0);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [state, sessionEndTime, duration, checkTimerState]);

  // Trigger completion modal when ringing
  useEffect(() => {
    if (isRinging) {
      setShowCompletionModal(true);
    }
  }, [isRinging]);

  // Ambient track play/pause logic
  useEffect(() => {
    if (!audioRef.current) return;
    
    let trackUrl = '';
    if (ambientTrackId === 'custom') {
      trackUrl = customUrl;
    } else {
      const track = AMBIENT_TRACKS.find(t => t.id === ambientTrackId);
      trackUrl = track?.url || '';
    }

    if (isRunning && sessionType === 'focus' && trackUrl) {
      if (audioRef.current.src !== trackUrl) {
        audioRef.current.src = trackUrl;
        audioRef.current.load();
      }
      audioRef.current.play().catch(e => console.log('Audio playback blocked:', e));
    } else {
      audioRef.current.pause();
    }
  }, [isRunning, sessionType, ambientTrackId, customUrl]);

  // Handle preview of custom URL
  const toggleCustomPreview = () => {
    if (!customPreviewAudioRef.current) return;
    if (isPreviewPlaying) {
      customPreviewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      customPreviewAudioRef.current.src = customUrl;
      customPreviewAudioRef.current.load();
      customPreviewAudioRef.current.play()
        .then(() => setIsPreviewPlaying(true))
        .catch(e => {
          showToast('Invalid or blocked audio URL', 'error');
          console.error(e);
        });
    }
  };

  const handleCustomUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomUrl(val);
    localStorage.setItem('vector_custom_ambience_url', val);
    if (isPreviewPlaying && customPreviewAudioRef.current) {
      customPreviewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    }
  };

  const handleSessionTypeChange = (mode: 'focus' | 'break') => {
    setSessionMode(mode);
    if (mode === 'break') {
      setDuration(5 * 60);
    } else {
      setDuration(25 * 60);
    }
  };

  const handleSetDuration = (mins: number) => {
    setDuration(mins * 60);
  };



  const executeStart = async () => {
    if (customPreviewAudioRef.current && isPreviewPlaying) {
      customPreviewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    }

    const cleanInput = taskInputValue.trim();
    if (cleanInput && (!activeTask.id || activeTask.label !== cleanInput)) {
      const directives = (dailyTasks || []).filter(t => t.category === 'deep-work' || t.category === 'admin');
      const skills = (dailyTasks || []).filter(t => t.category === 'skill');
      const workouts = (dailyTasks || []).filter(t => t.category === 'workout');

      // Check capacity limits for standard tags
      if (newTaskCategory === 'deep-work' || newTaskCategory === 'admin') {
        if (directives.length >= 3) {
          showToast('Maximum daily capacity reached (3 directives)', 'error');
          return;
        }
      } else if (newTaskCategory === 'skill') {
        if (skills.length >= 1) {
          showToast('Skill task already initialized for today', 'error');
          return;
        }
      } else if (newTaskCategory === 'workout') {
        if (workouts.length >= 1) {
          showToast('Workout task already initialized for today', 'error');
          return;
        }
      }

      const ts = Date.now();
      const id = await db.dailyTasks.add({ 
        label: cleanInput.toUpperCase(), 
        done: false, 
        category: newTaskCategory, 
        order: (dailyTasks || []).length, 
        date: new Date().toISOString().split('T')[0], 
        updatedAt: ts 
      });
      
      const newActive = { id, label: cleanInput.toUpperCase(), isDaily: true };
      setActiveTask(newActive);
      setTaskInputValue(cleanInput.toUpperCase());
    }

    startTimer(duration, sessionMode);
    showToast(`${sessionMode === 'break' ? 'Recovery' : 'Mission'} Engaged`, 'success');
  };

  const handleManualComplete = async () => {
    if (!activeTask.id) return;
    const now = Date.now();
    await db.dailyTasks.update(activeTask.id, { done: true, updatedAt: now });

    const category = activeTaskCategory;
    if (category && category !== 'deep-work') {
      const XP_VALUES = { admin: 2, skill: 5, workout: 5 };
      const xpAmount = (XP_VALUES as any)[category] || 2;
      const today = new Date().toISOString().split('T')[0];

      const existing = await db.xpLogs
        .where('date').equals(today)
        .filter(l => l.reason === activeTask.label)
        .count();

      if (existing === 0) {
        await db.xpLogs.add({
          date: today,
          amount: xpAmount,
          reason: activeTask.label,
          category: 'habit',
          createdAt: now
        });
      }
      showToast(`+${xpAmount} XP — ${activeTask.label} Completed`, 'success');
    } else {
      showToast('Directive Accomplished', 'success');
    }
    setActiveTask({ label: 'General Focus' });
  };

  const handleConfirmCompletion = async (completed: boolean) => {
    setShowCompletionModal(false);
    const now = Date.now();

    if (completed && activeTask.id) {
      await db.dailyTasks.update(activeTask.id, { done: true, updatedAt: now });

      const category = activeTaskCategory;
      if (category && category !== 'deep-work') {
        const XP_VALUES = { admin: 2, skill: 5, workout: 5 };
        const xpAmount = (XP_VALUES as any)[category] || 2;
        const today = new Date().toISOString().split('T')[0];

        const existing = await db.xpLogs
          .where('date').equals(today)
          .filter(l => l.reason === activeTask.label)
          .count();

        if (existing === 0) {
          await db.xpLogs.add({
            date: today,
            amount: xpAmount,
            reason: activeTask.label,
            category: 'habit',
            createdAt: now
          });
        }
        showToast(`+${xpAmount} XP — ${activeTask.label} Completed`, 'success');
      } else {
        showToast('Directive Accomplished', 'success');
      }
      setActiveTask({ label: 'General Focus' });
    } else if (!completed) {
      showToast('Focus Session Logged. Keep pushing!', 'info');
    }

    endTimer();
    resetTimer();
  };

  const handleAddCustomTag = () => {
    const clean = newTagName.trim().toLowerCase();
    if (!clean) return;
    if (availableTags.includes(clean)) {
      showToast('Tag already exists', 'error');
      return;
    }
    const next = [...availableTags, clean];
    setAvailableTags(next);
    localStorage.setItem('vector_focus_tags', JSON.stringify(next));
    setNewTaskCategory(clean);
    setNewTagName('');
    setShowNewTagInput(false);
    showToast(`Tag "${clean.toUpperCase()}" Created`, 'success');
  };

  const handleDeleteTag = (tagToDelete: string) => {
    const next = availableTags.filter(t => t !== tagToDelete);
    setAvailableTags(next);
    localStorage.setItem('vector_focus_tags', JSON.stringify(next));
    if (newTaskCategory === tagToDelete) {
      setNewTaskCategory('deep-work');
    }
    showToast(`Tag "${tagToDelete.toUpperCase()}" Removed`, 'info');
  };

  const handleAddPreset = () => {
    const val = parseInt(newPresetMins.trim());
    if (isNaN(val) || val <= 0 || val > 180) {
      showToast('Please enter a valid minutes value (1-180)', 'error');
      return;
    }
    const next = [...timerPresets.slice(1), val];
    setTimerPresets(next);
    localStorage.setItem('vector_timer_presets', JSON.stringify(next));
    setDuration(val * 60);
    setNewPresetMins('');
    setShowNewPresetInput(false);
    showToast(`Preset ${val}m Added`, 'success');
  };

  const handleTaskInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTaskInputValue(e.target.value);
  };

  const absTime = Math.max(0, Math.abs(timeLeft));
  const m = Math.floor(absTime / 60).toString().padStart(2,'0');
  const s = (absTime % 60).toString().padStart(2,'0');

  const progress = duration > 0 ? (state === 'completed' ? 1 : Math.max(0, Math.min(1, (duration - timeLeft) / duration))) : 0;
  const R = 45;
  const circ = 2 * Math.PI * R;
  const dashOffset = circ * (1 - progress);

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
            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-primary animate-pulse shadow-[0_0_8px_#00dbe9]' : 'bg-white/10'}`} />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">
               {isRunning ? 'Execution Active' : 'Standby'}
            </span>
         </div>
         
         <button 
            onClick={() => setRoute('analytics')} 
            className="flex items-center gap-2.5 bg-black/10 border border-white/5 hover:border-orange-500/25 px-4.5 py-2.5 rounded-full backdrop-blur-xl group transition-all cursor-pointer"
         >
            <span className="text-[10px] font-black uppercase tracking-widest text-[#ff9620]/80 group-hover:text-[#ff9620] transition-colors flex items-center gap-1.5">
               🔥 {sprintFocusHours} Focus Hours
            </span>
            <div className="w-px h-3.5 bg-white/10" />
            <Activity size={12} className="text-on-surface-variant/30 group-hover:text-primary transition-colors" />
         </button>
      </div>

      {/* Main Grid Wrapper with Layout slide animation */}
      <motion.div 
         layout 
         transition={{ type: 'spring', stiffness: 120, damping: 20 }}
         className="flex-1 flex flex-col lg:flex-row items-center justify-center w-full gap-16 lg:gap-32 relative z-10"
      >
         
         {/* TIMER STAGE (Layout centering slides here smoothly) */}
         <motion.div 
            layout 
            animate={{ scale: isZen ? 1.05 : 1.0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="relative flex flex-col items-center"
         >
            <div className="relative w-80 h-80 md:w-[420px] md:h-[420px] flex items-center justify-center">
               
               {/* Kinetic Ring track and active filled ring */}
               <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90 overflow-visible">
                  {/* Faint track indicator always visible */}
                  <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={isZen ? "2.5" : "1.0"} />
                  <motion.circle 
                     cx="50" cy="50" r={R} fill="none" 
                     stroke={isZen ? pillarTheme.hex : 'rgba(255,255,255,0.08)'} 
                     strokeWidth={isZen ? "2.5" : "1.0"}
                     strokeLinecap="round"
                     strokeDasharray={circ}
                     strokeDashoffset={dashOffset}
                     animate={{ stroke: isRinging ? '#ff4081' : isZen ? pillarTheme.hex : 'rgba(255,255,255,0.08)' }}
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
                           {sessionType === 'break' ? 'RECOVERY' : 'EXECUTION'}
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
                              <button onClick={() => setShowCompletionModal(true)} className="px-10 py-4 bg-secondary text-black rounded-full font-headline font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all">
                                 CONTINUE
                              </button>
                           ) : (
                              <>
                                 <button onClick={isPaused ? resumeTimer : pauseTimer} className="w-16 h-16 rounded-full flex items-center justify-center bg-white/5 text-on-surface hover:bg-white/10 transition-all">
                                    {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                                 </button>
                                 <button onClick={() => { resetTimer(); setShowCompletionModal(false); }} className="w-16 h-16 rounded-full bg-white/5 text-on-surface-variant/40 hover:text-error transition-all flex items-center justify-center">
                                    <X size={20} />
                                 </button>
                              </>
                           )}
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </motion.div>

         {/* CONFIG: 3 SIDEBAR SECTIONS (HIDES COMPLETELY IN ACTIVE ZEN SESSIONS) */}
         <AnimatePresence>
            {!isZen && (
               <motion.div 
                  layout
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className="w-full max-w-xs space-y-6"
               >
                  
                  {/* 1. TIMER */}
                  <div className="bg-[#1a1c22]/30 backdrop-blur-xl border border-white/5 rounded-[10px] p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-[0.4em] text-on-surface-variant/30 flex items-center gap-2">
                        <Clock size={12} /> TIMER
                      </span>
                      {/* Mode toggle switch */}
                      <button
                        onClick={() => handleSessionTypeChange(sessionMode === 'focus' ? 'break' : 'focus')}
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${
                          sessionMode === 'break'
                            ? 'bg-secondary/10 text-secondary border-secondary/20 shadow-[0_0_8px_rgba(0,228,117,0.15)]'
                            : 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_8px_rgba(0,219,233,0.15)]'
                        }`}
                      >
                        {sessionMode === 'break' ? 'Break' : 'Focus'}
                      </button>
                    </div>

                    {/* FIFO Presets Timeline with Horizontal Divider Line */}
                    <div className="relative flex items-center justify-between w-full py-4 px-2">
                      {/* Timeline Track Line */}
                      {/* <div className="absolute left-0 right-0 h-px bg-white/10 z-0" /> */}
                      
                      {timerPresets.map(mins => (
                        <button
                          key={mins}
                          onClick={() => handleSetDuration(mins)}
                          className={`relative z-10 w-12 h-12 px- py- text-xl font-headline font-black transition-all border  border-white/5 ${
                            Math.floor(duration / 60) === mins
                              ? 'text-primary  drop-shadow-[0_0_8px_rgba(0,219,233,0.6)] bg-primary/5'
                              : 'text-on-surface-variant/40 hover:text-on-surface-variant/80 hover:scale-105'
                          }`}
                        >
                          {mins}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => setShowNewPresetInput(!showNewPresetInput)}
                        className="relative z-10 w-9.5 h-9.5 rounded-full bg-[#242730] border border-white/5 hover:border-white/15 flex items-center justify-center text-on-surface-variant/50 hover:text-primary transition-all shrink-0 ml-2"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Custom Preset Input */}
                    <AnimatePresence>
                      {showNewPresetInput && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pt-1"
                        >
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={newPresetMins}
                              onChange={e => setNewPresetMins(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddPreset()}
                              placeholder="MINUTES..."
                              className="flex-1 bg-[#242730] border border-white/5 rounded-xl px-3 py-1.5 font-headline font-black text-xs text-primary placeholder:text-on-surface-variant/15 outline-none uppercase"
                            />
                            <button
                              onClick={handleAddPreset}
                              className="px-3 bg-primary text-black rounded-xl font-headline font-black text-xs uppercase"
                            >
                              Add
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 2. TASK */}
                  <div className={`bg-[#1a1c22]/30 backdrop-blur-xl border border-white/5 rounded-[10px] p-5 shadow-xl space-y-4 relative ${dropdownOpen ? 'z-30' : 'z-10'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-[0.4em] text-on-surface-variant/30 flex items-center gap-2">
                        <Target size={12} /> TASK
                      </span>
                    </div>

                    {/* Unified Select/Type Task Input with Check Circle & X Inside the Box */}
                    <div className={`relative ${dropdownOpen ? 'z-30' : 'z-10'}`}>
                      <div className="flex gap-2.5 items-center bg-[#242730] border border-white/5 rounded-xl px-4 py-3 focus-within:border-white/10 transition-all">
                        <button
                          onClick={activeTask.id ? handleManualComplete : undefined}
                          disabled={!activeTask.id}
                          title={activeTask.id ? "Complete Target" : "No active task"}
                          className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center shrink-0 group/check ${
                            activeTask.id
                              ? 'border-on-surface-variant/20 hover:border-secondary cursor-pointer'
                              : 'border-on-surface-variant/10 opacity-30 cursor-default'
                          }`}
                        >
                          {activeTask.id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-secondary scale-0 group-hover/check:scale-100 transition-transform duration-200" />
                          )}
                        </button>
                        
                        <input
                          value={taskInputValue}
                          onChange={handleTaskInputChange}
                          onFocus={() => setDropdownOpen(true)}
                          placeholder="SELECT OR TYPE A TASK..."
                          className="flex-1 bg-transparent border-0 outline-none font-headline font-black text-xs text-primary placeholder:text-on-surface-variant/20 uppercase tracking-tight"
                        />
                        
                        {taskInputValue && (
                          <button
                            onClick={() => {
                              setTaskInputValue('');
                              setActiveTask({ label: 'General Focus' });
                            }}
                            className="text-on-surface-variant/40 hover:text-error transition-all shrink-0 ml-1"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Menu */}
                      <AnimatePresence  >
                        {dropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-50" onClick={() => setDropdownOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-[#1a1c22] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto no-scrollbar"
                            >
                              <button
                                onClick={() => {
                                  setActiveTask({ label: 'General Focus' });
                                  setTaskInputValue('');
                                  setDropdownOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-white/5 text-xs font-black text-on-surface-variant/40 hover:text-on-surface uppercase border-b border-white/5"
                              >
                                — General Focus (No Task) —
                              </button>
                              {mergedTasks.length === 0 ? (
                                <div className="px-4 py-4 text-xs font-black text-on-surface-variant/20 text-center uppercase tracking-widest">No active tasks today</div>
                              ) : (
                                mergedTasks.map(t => (
                                  <button
                                    key={t.id}
                                    onClick={() => {
                                      setActiveTask({ id: t.id, label: t.label, isDaily: true });
                                      setTaskInputValue(t.label);
                                      setNewTaskCategory(t.category);
                                      setDropdownOpen(false);
                                    }}
                                    className={`w-full px-4 py-3 text-left hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-0 ${
                                      activeTask.id === t.id ? 'bg-primary/5 text-primary' : 'text-on-surface'
                                    }`}
                                  >
                                    <span className="font-headline font-black text-xs uppercase tracking-tight truncate max-w-[150px]">{t.label}</span>
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border shrink-0 ${getTagTheme(t.category).text} ${getTagTheme(t.category).border} uppercase tracking-widest`}>
                                      {getTagLabel(t.category)}
                                    </span>
                                  </button>
                                ))
                              )}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Horizontal Tags Selector & Tag Creator Below */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap w-full pb-2">
                        {availableTags.map(tag => {
                          const isDefault = ['deep-work', 'admin', 'skill', 'workout'].includes(tag);
                          const isActive = newTaskCategory === tag;
                          return (
                            <button
                              key={tag}
                              onClick={() => setNewTaskCategory(tag)}
                              className={`px-2.5 py-1.5 rounded-[1px] text-[9px] font-black uppercase transition-all border flex items-center gap-1 shrink-0 ${
                                isActive
                                  ? 'bg-primary-fixed-dim text-black border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                                  : 'bg-[#242730] text-on-surface-variant/40 border-transparent hover:border-white/5'
                              }`}
                            >
                              {getTagLabel(tag)}
                              {!isDefault && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTag(tag);
                                  }}
                                  className="ml-1 text-xs font-bold text-on-surface-variant/40 hover:text-error transition-all"
                                  title="Delete Tag"
                                >
                                  ×
                                </span>
                              )}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setShowNewTagInput(!showNewTagInput)}
                          className="w-6 h-6 cursor-pointer hover:text-black hover:bg-primary-fixed-dim border-1 border-orange-500/20 rounded-[3px] bg-white/5 border border-white/5 hover:border-white/10 flex items-center justify-center text-on-surface-variant/50 hover:text-primary transition-all shrink-0"
                        >
                          <Plus size={10} className='hover:text-black'/>
                        </button>
                      </div>
 
                      <AnimatePresence>
                        {showNewTagInput && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden pt-1"
                          >
                            <div className="flex gap-2">
                              <input
                                value={newTagName}
                                onChange={e => setNewTagName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddCustomTag()}
                                placeholder="NEW TAG..."
                                className="flex-1 bg-[#242730] border border-white/5 rounded-[1px] px-2.5 py-1.5 font-headline font-black text-xs text-primary placeholder:text-on-surface-variant/15 outline-none uppercase"
                              />
                              <button
                                onClick={handleAddCustomTag}
                                className="px-3 bg-primary text-black rounded-[1px] font-headline font-black text-xs uppercase"
                              >
                                Add
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* 3. AMBIENCE */}
                  <div className="bg-[#1a1c22]/10 backdrop-blur-xl border border-white/5 rounded-[10px] p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-[0.4em] text-on-surface-variant/30 flex items-center gap-2">
                        <Music size={12} /> AMBIENCE
                      </span>
                    </div>

                    {/* Horizontal Tracks Row with Custom Link import Icon */}
                    <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap w-full pb-2">
                      {AMBIENT_TRACKS.map(track => (
                        <button
                          key={track.id}
                          onClick={() => {
                            setAmbientTrack(track.id);
                            if (isPreviewPlaying && customPreviewAudioRef.current) {
                              customPreviewAudioRef.current.pause();
                              setIsPreviewPlaying(false);
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[12px] font-black uppercase transition-all border shrink-0 whitespace-nowrap ${
                            ambientTrackId === track.id
                              ? 'bg-primary/10 text-primary-fixed-dim border-primary-fixed-dim/30 shadow-[0_0_12px_rgba(0,219,233,0.1)]'
                              : 'bg-[#242730] text-on-surface-variant/40 hover:text-on-surface-variant/80 border-white/5 hover:border-white/10'
                          }`}
                        >
                          {track.label}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => {
                          setAmbientTrack('custom');
                          setShowCustomAmbienceInput(!showCustomAmbienceInput);
                        }}
                        title="Import Custom Audio Link"
                        className={`w-7 h-7 p-1.5 rounded-[1px] flex items-center justify-center transition-all border ${
                          ambientTrackId === 'custom'
                            ? 'bg-primary/15 text-primary border-primary/35 shadow-[0_0_12px_rgba(0,219,233,0.2)] animate-pulse'
                            : 'bg-[#242730] text-on-surface-variant/40 hover:text-primary border-white/5 hover:border-white/10'
                        } shrink-0`}
                      >
                        <CloudDownload size={16} className={ambientTrackId === 'custom' ? 'animate-bounce' : ''} />
                      </button>
                    </div>

                    {/* Custom Audio URL Toggle Input */}
                    <AnimatePresence>
                      {(showCustomAmbienceInput || ambientTrackId === 'custom') && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden border-t border-white/5 pt-3 space-y-2"
                        >
                          <span className="block text-xs font-black uppercase tracking-widest text-on-surface-variant/40">Import custom stream link</span>
                          <div className="flex gap-2">
                            <input
                              value={customUrl}
                              onChange={handleCustomUrlChange}
                              placeholder="HTTP://...AUDIO.MP3"
                              className="flex-1 bg-[#242730] border border-white/5 rounded-xl px-3 py-2 font-headline font-black text-xs text-primary placeholder:text-on-surface-variant/15 outline-none truncate"
                            />
                            {customUrl && (
                              <button
                                onClick={toggleCustomPreview}
                                className="w-8 h-8 shrink-0 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 flex items-center justify-center text-primary transition-all"
                              >
                                {isPreviewPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

               </motion.div>
            )}
         </AnimatePresence>
      </motion.div>

      {/* Completion Confirmation Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1c22] border border-white/10 rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              
              <div className="w-16 h-16 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary mx-auto mb-6 shadow-xl">
                 <CheckCircle2 size={32} />
              </div>
              
              <h3 className="font-headline font-black text-xl text-on-surface uppercase tracking-tight mb-2">
                Session Complete
              </h3>
              
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-6">
                Target duration reached
              </p>

              {activeTask.id ? (
                <div className="mb-8 p-4 bg-black/20 rounded-xl border border-white/5 text-center">
                  <span className="block text-xs font-black text-on-surface-variant/30 uppercase tracking-widest mb-1.5">Focus Objective</span>
                  <span className="font-headline font-black text-xs text-primary uppercase tracking-tight block truncate">{activeTask.label}</span>
                  <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded border mt-2 ${getTagTheme(activeTaskCategory)?.text || 'text-primary border-primary/20'} ${getTagTheme(activeTaskCategory)?.border || ''} uppercase tracking-widest`}>
                    {getTagLabel(activeTaskCategory)}
                  </span>
                  
                  <div className="mt-4 text-xs font-bold text-on-surface-variant/70 uppercase">
                    Did you accomplish this target?
                  </div>
                </div>
              ) : (
                <div className="mb-8 text-xs font-bold text-on-surface-variant/70 uppercase">
                  Great work staying focused!
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                {activeTask.id ? (
                  <>
                    <button
                      onClick={() => handleConfirmCompletion(true)}
                      className="w-full py-3 bg-secondary text-black rounded-xl font-headline font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-secondary/10"
                    >
                      Yes, Completed
                    </button>
                    <button
                      onClick={() => handleConfirmCompletion(false)}
                      className="w-full py-3 bg-white/5 border border-white/10 text-on-surface hover:bg-white/10 rounded-xl font-headline font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      No, Still working
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConfirmCompletion(false)}
                    className="w-full py-3 bg-primary text-black rounded-xl font-headline font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/10"
                  >
                    Continue
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} loop />
      <audio ref={customPreviewAudioRef} loop />
    </div>
  );
};
