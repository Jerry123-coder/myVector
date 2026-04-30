import { useEffect, useState, useMemo } from 'react';
import { Lock, Zap, ChevronDown, X, Plus, Edit3, Activity, Timer, Coffee, Play, Square, Pause, SkipForward, ArrowUp, ArrowDown, Settings2, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { MetricsView } from './MetricsView';
import { useTimerStore } from '../store/timerStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useToast } from '../components/ToastContext';

type BlockType = 'focus' | 'break';

interface FlowBlock {
  type: BlockType;
  mins: number;
  label: string;
}

interface FlowBlockBuilder {
  type: BlockType;
  mins: string | number; // Allow empty string for ease of typing
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
    desc: 'Standard focus block',
    blocks: [{ type: 'focus', mins: 30, label: 'Focus Block' }]
  },
  {
    id: 'pomodoro',
    label: 'Pomodoro Protocol',
    desc: '25m Focus / 5m Break',
    blocks: [
      { type: 'focus', mins: 25, label: 'Focus Block' },
      { type: 'break', mins: 5, label: 'Short Break' }
    ]
  },
  {
    id: 'deep-work',
    label: 'Deep Work Protocol',
    desc: '90m Focus / 15m Break / 45m Focus',
    blocks: [
      { type: 'focus', mins: 90, label: 'Deep Focus I' },
      { type: 'break', mins: 15, label: 'System Recovery' },
      { type: 'focus', mins: 45, label: 'Deep Focus II' }
    ]
  }
];

export const TimerView = () => {
  const [activeTab, setActiveTab] = useState<'engine' | 'velocity'>('engine');
  
  // Persisted Custom Templates
  const [userTemplates, setUserTemplates] = useState<FlowTemplate[]>(() => {
    const saved = localStorage.getItem('vector-user-templates');
    return saved ? JSON.parse(saved) : [];
  });

  const [recentMins, setRecentMins] = useState<number[]>(() => {
    const saved = localStorage.getItem('vector-recent-mins');
    return saved ? JSON.parse(saved) : [15, 30, 45, 60];
  });

  const ALL_TEMPLATES = [...TEMPLATES, ...userTemplates];

  // Flow State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('single');
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [showFlows, setShowFlows] = useState(false);
  
  const selectedTemplate = ALL_TEMPLATES.find(t => t.id === selectedTemplateId) || ALL_TEMPLATES[0];
  const currentBlock = selectedTemplate.blocks[currentBlockIndex] || selectedTemplate.blocks[0];

  const {
    state, duration, sessionEndTime,
    startTimer, checkTimerState, resetTimer, endTimer, pauseTimer, resumeTimer,
    activeTask, setActiveTask,
  } = useTimerStore();
  const { showToast } = useToast();

  const [timeLeft, setTimeLeft] = useState(duration);
  
  // Custom Time Input
  const [customMins, setCustomMins] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  
  // Builder & Manager State
  const [isBuildingProtocol, setIsBuildingProtocol] = useState(false);
  const [isManagingProtocols, setIsManagingProtocols] = useState(false);
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderBlocks, setBuilderBlocks] = useState<FlowBlockBuilder[]>([]);

  const [lockIn, setLockIn] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const dailyTasks = useLiveQuery(
    () => db.dailyTasks.where('date').equals(new Date().toISOString().split('T')[0]).toArray(),
    []
  );

  const mergedTasks = useMemo(() => {
    const dailyAsTasks = (dailyTasks || []).filter(d => !d.done).map(d => ({
      id: d.id, // Using dailyTask id for mapping
      label: d.label,
      priority: 'HIGH' as const,
      isDaily: true,
      taskId: d.taskId
    }));
    return dailyAsTasks;
  }, [dailyTasks]);

  // Sync with Today section: clear active task if it's completed elsewhere
  useEffect(() => {
    if (activeTask.id && dailyTasks) {
      const stillPending = dailyTasks.some(d => d.id === activeTask.id && !d.done);
      if (!stillPending) {
        setActiveTask({ label: 'System Recovery' });
      }
    }
  }, [activeTask.id, dailyTasks, setActiveTask]);

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

  const absTime = Math.max(0, Math.abs(timeLeft));
  const m = Math.floor(absTime / 60).toString().padStart(2,'0');
  const s = (absTime % 60).toString().padStart(2,'0');

  const totalDuration = (state === 'running' || state === 'completed' || state === 'ringing') ? duration : currentBlock.mins * 60;
  const progress = totalDuration > 0
    ? (state === 'completed' ? 1 : Math.max(0, Math.min(1, (totalDuration - timeLeft) / totalDuration)))
    : 0;

  const R = 44;
  const circ = 2 * Math.PI * R;
  const dashOffset = circ * (1 - progress);

  const isRunning   = state === 'running';
  const isPaused    = state === 'paused';
  const isRinging   = state === 'ringing';
  const isCompleted = state === 'completed';

  const isBreak = currentBlock.type === 'break';
  const themeColor = isBreak ? '#00e475' : '#00dbe9';
  const themeColorRgb = isBreak ? '0,228,117' : '0,219,233';

  const executeEnd = () => {
    endTimer();
    setTimeLeft(0);
  };

  const executeStart = (overrideMins?: number) => {
    const m = overrideMins || currentBlock.mins;
    if (state === 'idle' || state === 'completed') {
      startTimer(m * 60, currentBlock.type);
      // Auto-label break blocks so it doesn't log standard focus
      if (isBreak) {
        setActiveTask({ label: currentBlock.label });
      } else if (activeTask.label === 'System Recovery' || activeTask.label === 'Short Break') {
        setActiveTask({ label: 'General Focus' }); 
      }
      showToast(`${isBreak ? 'Recovery' : 'Focus'} Phase Engaged`, 'success');
    }
  };

  const completeActiveTask = async () => {
     if (!activeTask.id) return;
     const dt = await db.dailyTasks.get(activeTask.id);
     if (dt) {
        await db.dailyTasks.update(activeTask.id, { done: true, updatedAt: Date.now() });
        if (dt.taskId) {
           await db.tasks.update(dt.taskId, { status: 'done', completedAt: Date.now(), updatedAt: Date.now() });
        }
        showToast('Directive Accomplished', 'success');
        setActiveTask({ label: 'System Recovery' });
     }
  };

  const handleNextBlock = () => {
    if (isRinging || isRunning) executeEnd();
    
    if (currentBlockIndex + 1 < selectedTemplate.blocks.length) {
      setCurrentBlockIndex(currentBlockIndex + 1);
      resetTimer();
    } else {
      resetTimer();
      setCurrentBlockIndex(0);
    }
  };

  const handleManualReset = () => {
    resetTimer();
    setCurrentBlockIndex(0);
    setTimeLeft(currentBlock.mins * 60);
  };

  const applyCustom = () => {
    const v = parseInt(customMins);
    if (v > 0 && v <= 480) {
      const newMins = [v, ...recentMins.filter(m => m !== v)].slice(0, 4);
      setRecentMins(newMins);
      localStorage.setItem('vector-recent-mins', JSON.stringify(newMins));
      
      setSelectedTemplateId('single');
      TEMPLATES[0].blocks[0].mins = v;
      setCurrentBlockIndex(0);
      setShowCustom(false);
      setCustomMins('');
    }
  };

  // Protocols Management Functions
  const saveProtocol = () => {
    if (builderBlocks.length === 0) return;
    const finalBlocks: FlowBlock[] = builderBlocks.map(b => ({
       type: b.type,
       label: b.label,
       mins: typeof b.mins === 'number' ? b.mins : (parseInt(b.mins) || 1)
    }));

    const newTemplate: FlowTemplate = {
      id: `custom-${Date.now()}`,
      label: builderTitle.trim() === '' ? 'Untitled Protocol' : builderTitle,
      desc: 'User Protocol',
      blocks: finalBlocks
    };
    const updated = [...userTemplates, newTemplate];
    setUserTemplates(updated);
    localStorage.setItem('vector-user-templates', JSON.stringify(updated));
    setSelectedTemplateId(newTemplate.id);
    setCurrentBlockIndex(0);
    setIsBuildingProtocol(false);
    showToast('Protocol Matrix Committed', 'success');
  };

  const moveUserTemplate = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === userTemplates.length - 1) return;
    const items = [...userTemplates];
    const swap = items[index];
    items[index] = items[index + (direction === 'up' ? -1 : 1)];
    items[index + (direction === 'up' ? -1 : 1)] = swap;
    setUserTemplates(items);
    localStorage.setItem('vector-user-templates', JSON.stringify(items));
  };

  const deleteUserTemplate = (id: string) => {
    const updated = userTemplates.filter(t => t.id !== id);
    setUserTemplates(updated);
    localStorage.setItem('vector-user-templates', JSON.stringify(updated));
    if (selectedTemplateId === id) {
       setSelectedTemplateId('single');
       setCurrentBlockIndex(0);
    }
  };

  const openBuilder = () => {
    setBuilderTitle('');
    setBuilderBlocks([]);
    setIsBuildingProtocol(true);
    setIsManagingProtocols(false);
  };

  const quickAddTask = async () => {
    const label = newTaskLabel.trim().toUpperCase();
    if (!label) return;
    const ts = Date.now();
    const id = await db.tasks.add({ label, status: 'active', priority: 'HIGH', createdAt: ts, updatedAt: ts });
    setActiveTask({ id, label });
    setNewTaskLabel('');
  };

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-64px)] px-4 py-6 md:py-10 relative overflow-y-auto overflow-x-hidden no-scrollbar w-full max-w-7xl mx-auto">

      {/* Global Status Row (Top Header on Desktop) */}
      {!isBuildingProtocol && !isManagingProtocols && (
        <div className="w-full flex justify-between items-center mb-8 animate-in fade-in duration-300">
           <div className="flex items-center gap-2 border border-outline-variant/30 bg-[#111318] px-3 py-1.5 rounded-full shadow-lg">
              <div className={`w-2 h-2 rounded-full transition-colors ${isRunning ? 'animate-pulse' : 'bg-outline/40'}`} 
                   style={{ backgroundColor: isRunning ? themeColor : '', boxShadow: isRunning ? `0 0 8px ${themeColor}` : '' }} />
              <span className="font-headline font-bold text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                {isRunning ? (isBreak ? 'System Recovery' : 'Session Active') : isCompleted ? 'Session Complete' : 'Standby'}
              </span>
           </div>
           
           <button onClick={() => setActiveTab(activeTab === 'velocity' ? 'engine' : 'velocity')} 
                   className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors bg-primary/5 shadow-[0_0_15px_rgba(0,219,233,0.1)]">
              {activeTab === 'velocity' ? <Timer size={14}/> : <Activity size={14}/>}
              <span className="text-[10px] uppercase font-bold tracking-widest">{activeTab === 'velocity' ? 'Return to Engine' : 'Velocity Metrics'}</span>
           </button>
        </div>
      )}

      {isManagingProtocols ? (
        <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4">
           {/* Manager UI */}
           <div className="flex justify-between items-center mb-6 border-b border-outline-variant/20 pb-4">
             <div>
               <h2 className="font-headline font-black text-2xl text-primary uppercase tracking-tight">Manage Protocols</h2>
               <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Reorder or Delete custom workflows</p>
             </div>
             <button onClick={() => setIsManagingProtocols(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
                <X size={16} />
             </button>
           </div>
           
           <div className="space-y-3">
             {userTemplates.length === 0 && <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 p-6 border border-outline-variant/10 rounded-xl bg-[#111318] text-center">No custom protocols saved.</div>}
             {userTemplates.map((t, idx) => (
                <div key={t.id} className="flex items-center justify-between bg-[#111318] p-4 rounded-xl border border-outline-variant/20 shadow-lg">
                   <div>
                      <div className="font-headline font-bold text-sm text-primary uppercase tracking-tight mb-0.5">{t.label}</div>
                      <div className="text-[9px] uppercase tracking-widest text-on-surface-variant/50">{t.blocks.length} Phases</div>
                   </div>
                   <div className="flex items-center gap-2 border-l border-outline-variant/20 pl-4 ml-4 shrink-0">
                      <div className="flex flex-col gap-1">
                         <button onClick={() => moveUserTemplate(idx, 'up')} disabled={idx === 0} className="text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed">
                            <ArrowUp size={14}/>
                         </button>
                         <button onClick={() => moveUserTemplate(idx, 'down')} disabled={idx === userTemplates.length - 1} className="text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed">
                            <ArrowDown size={14}/>
                         </button>
                      </div>
                      <button onClick={() => deleteUserTemplate(t.id)} className="ml-2 w-8 h-8 flex items-center justify-center rounded-full text-error/60 border border-error/20 bg-error/5 hover:bg-error/20 hover:text-error transition-colors">
                         <Trash2 size={12} />
                      </button>
                   </div>
                </div>
             ))}
           </div>
           
           <button onClick={openBuilder} className="w-full mt-6 py-4 flex items-center justify-center gap-2 font-headline font-black text-sm uppercase tracking-widest text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors">
             <Plus size={16}/> Create New Protocol
           </button>
        </div>
      ) : isBuildingProtocol ? (
        <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4">
           {/* Builder UI */}
           <div className="flex justify-between items-center mb-6 border-b border-outline-variant/20 pb-4">
             <div>
               <h2 className="font-headline font-black text-2xl text-primary uppercase tracking-tight">Protocol Builder</h2>
               <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Construct custom workflow</p>
             </div>
             <button onClick={() => setIsBuildingProtocol(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
                <X size={16} />
             </button>
           </div>
           
           <div className="mb-6 space-y-1">
             <label className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/60">Protocol Designation</label>
             <input value={builderTitle} onChange={e => setBuilderTitle(e.target.value)} autoFocus
               className="w-full bg-[#111318] border border-outline-variant/30 rounded-xl p-4 font-headline font-black text-xl text-primary outline-none focus:border-primary/50 transition-colors placeholder:text-on-surface-variant/20 shadow-inner"
               placeholder="Enter Protocol Name..." />
           </div>

           <div className="mb-8">
             <div className="flex justify-between items-center mb-4">
               <span className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/60">Execution Sequence</span>
               <div className="flex gap-2">
                 <button onClick={() => setBuilderBlocks([...builderBlocks, { type: 'focus', mins: 30, label: 'Focus Block' }])}
                   className="text-[9px] uppercase tracking-widest font-bold text-primary flex items-center gap-1 hover:text-primary-fixed-dim bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors">
                   <Plus size={10} /> Focus Block
                 </button>
                 <button onClick={() => setBuilderBlocks([...builderBlocks, { type: 'break', mins: 5, label: 'Short Break' }])}
                   className="text-[9px] uppercase tracking-widest font-bold text-secondary flex items-center gap-1 hover:text-secondary/80 bg-secondary/5 border border-secondary/20 px-3 py-1.5 rounded-lg transition-colors">
                   <Plus size={10} /> Break Period
                 </button>
               </div>
             </div>

             <div className="space-y-3">
               {builderBlocks.map((b, i) => (
                 <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg ${b.type==='break' ? 'border-secondary/20 bg-secondary/5' : 'border-primary/20 bg-primary/5'}`}>
                   <div className="flex flex-col flex-1 gap-1">
                      <div className="flex items-center gap-2">
                        {b.type === 'break' ? <Coffee size={14} className="text-secondary"/> : <Zap size={14} className="text-primary"/>}
                        <input className="bg-transparent font-headline font-bold text-sm uppercase tracking-widest text-on-surface outline-none w-full placeholder:text-on-surface-variant/30"
                           value={b.label}
                           placeholder="Phase label..."
                           onChange={e => { const nm = [...builderBlocks]; nm[i].label = e.target.value; setBuilderBlocks(nm); }}
                        />
                      </div>
                   </div>
                   <div className="flex items-center gap-2 border-l border-outline-variant/20 pl-4">
                     <input type="number" min="1" max="480" value={b.mins} 
                            onChange={e => { const nm = [...builderBlocks]; nm[i].mins = e.target.value === '' ? '' : parseInt(e.target.value); setBuilderBlocks(nm); }}
                            placeholder="Mins"
                            className="bg-transparent font-headline font-black text-xl text-on-surface tabular-nums outline-none w-14 text-right placeholder:text-on-surface-variant/20" />
                     <span className="text-[10px] uppercase font-bold text-on-surface-variant/50 mr-2">min</span>
                     <button onClick={() => setBuilderBlocks(builderBlocks.filter((_,idx)=>idx!==i))} className="w-8 h-8 flex items-center justify-center rounded-full text-error/60 hover:bg-error/10 hover:text-error transition-colors">
                        <Trash2 size={14} />
                     </button>
                   </div>
                 </div>
               ))}
               {builderBlocks.length === 0 && <div className="text-center p-10 text-[10px] uppercase font-bold text-on-surface-variant/40 border-2 border-outline-variant/10 border-dashed rounded-xl bg-[#111318]">Sequence is Empty.<br/>Add a Focus or Break block above.</div>}
             </div>
           </div>

           <button onClick={saveProtocol} disabled={builderBlocks.length === 0}
             className="w-full py-5 font-headline font-black text-sm uppercase tracking-[0.2em] transition-all bg-primary text-black rounded-xl hover:bg-primary-fixed-dim disabled:opacity-30 shadow-[0_4px_20px_rgba(0,219,233,0.3)]">
             Commit Protocol to Database
           </button>
        </div>
      ) : activeTab === 'velocity' ? (
        <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <MetricsView isEmbedded />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center lg:items-center justify-center w-full gap-12 lg:gap-24 relative">
          
          {/* Left Column (Huge Native Timer SVG) */}
          <div className="flex-1 flex justify-center w-full max-w-[320px] lg:max-w-[460px] relative z-10">
            <div className="relative flex flex-shrink-0 items-center justify-center w-full aspect-square">
              
              {/* Core SVG Glowing Orbits Background */}
              <div className="absolute inset-0 rounded-full" 
                   style={{ 
                     background: `radial-gradient(circle at center, rgba(${themeColorRgb},0.08) 0%, rgba(${themeColorRgb},0.02) 40%, transparent 70%)`,
                     boxShadow: `inset 0 0 80px rgba(0,0,0,0.8), 0 0 60px rgba(${themeColorRgb},0.15)`
                   }} />
                   
              {isRunning && (
                <>
                  <div className="absolute inset-0 rounded-full border pointer-events-none transition-all duration-300 shadow-[0_0_40px_rgba(0,219,233,0.2)]"
                    style={{ borderColor: `rgba(${themeColorRgb},0.4)`, animation: 'ripple 3s cubic-bezier(0.2, 0, 0.2, 1) 0s infinite', opacity: 0 }} />
                  <div className="absolute inset-0 rounded-full border pointer-events-none transition-all duration-300 shadow-[0_0_40px_rgba(0,219,233,0.2)]"
                    style={{ borderColor: `rgba(${themeColorRgb},0.4)`, animation: 'ripple 3s cubic-bezier(0.2, 0, 0.2, 1) -1.5s infinite', opacity: 0 }} />
                </>
              )}

              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90 overflow-visible z-10 relative">
                <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="6" />
                <circle cx="50" cy="50" r={R} fill="none"
                  stroke={isCompleted ? themeColor : isPaused ? '#6b7280' : isRinging ? '#ff4081' : themeColor}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={dashOffset}
                  className="transition-all duration-300 ease-linear"
                  style={{ filter: isRinging ? 'drop-shadow(0 0 15px rgba(255,64,129,0.7))' : isRunning ? `drop-shadow(0 0 20px rgba(${themeColorRgb},0.8))` : 'drop-shadow(0 0 8px rgba(0,219,233,0.3))' }}
                />
              </svg>

              <div className="absolute rounded-full z-10" style={{ inset:'16px', background:'#0B0E12', boxShadow:'inset 0 0 60px rgba(0,0,0,0.9), inset 0 2px 4px rgba(255,255,255,0.05)' }} />

              {/* Inner Circle Content */}
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center transform scale-90 lg:scale-100 pb-2">
                 <div className="flex-1 flex flex-col items-center justify-end pb-1 w-full">
                     {selectedTemplate.blocks.length > 1 && (
                        <div className="mb-2 px-3 py-1 rounded-full bg-surface-container/50 border border-outline-variant/10 text-[8px] font-bold uppercase tracking-widest text-on-surface-variant/80">
                           Phase {currentBlockIndex + 1}/{selectedTemplate.blocks.length}
                        </div>
                     )}
                    <span className={`font-headline font-black tabular-nums transition-all duration-300 ${isCompleted ? 'secondary-glow' : isRinging ? 'text-[#ff4081]' : isPaused ? 'text-on-surface-variant' : isRunning ? 'terminal-glow' : 'opacity-80'}`}
                      style={{ fontSize:'4.5rem', letterSpacing:'-0.05em', color: (isCompleted || isRunning) && !isRinging && !isPaused ? themeColor : undefined, lineHeight: '1' }}>
                      {m}:{s}
                    </span>
                    <span className="mt-1 font-headline font-bold text-[9px] uppercase tracking-[0.25em] text-on-surface-variant flex items-center gap-1.5 max-w-[200px] truncate text-center">
                      {isBreak && !isRinging && !isCompleted && <Coffee size={10} className="text-secondary shrink-0" />}
                      <span className="truncate">{isCompleted ? '✓ Complete' : isRinging ? 'TIME IS UP' : isPaused ? '⏸ PAUSED' : isRunning ? `${Math.round(progress*100)}%` : `${currentBlock.label}`}</span>
                    </span>
                 </div>
                 
                 {/* Internal CTA Strip nested right inside the circle */}
                 <div className="flex-1 flex items-start justify-center pt-5 w-full">
                    {!isRunning && !isPaused && !isRinging && !isCompleted ? (
                        <button onClick={() => executeStart()}
                          className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-headline font-black text-[11px] uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95"
                          style={{
                            background: isBreak ? 'linear-gradient(135deg, rgba(0,228,117,0.2) 0%, rgba(0,181,92,0.1) 100%)' : 'linear-gradient(135deg, rgba(0,219,233,0.15) 0%, rgba(0,240,255,0.05) 100%)',
                            border: `1px solid ${themeColor}`,
                            color: themeColor,
                            boxShadow: `0 0 30px rgba(${themeColorRgb},0.15)`,
                          }}>
                          <Play size={14} fill={themeColor}/>
                          {isBreak ? `Start Break` : `Initialize`}
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                           {isRinging || isCompleted ? (
                             <button onClick={handleNextBlock}
                               className="flex items-center gap-2 px-6 py-3 rounded-full font-headline font-black text-[10px] uppercase tracking-widest transition-all duration-300 hover:scale-105"
                               style={{ background: isRinging ? '#ff4081' : themeColor, color: '#000', boxShadow: isRinging ? '0 0 40px rgba(255,64,129,0.5)' : `0 0 30px rgba(${themeColorRgb},0.3)` }}>
                               {isRinging ? <Square size={12} fill="#000"/> : <SkipForward size={12} fill="#000"/>}
                               {isRinging ? 'STOP ALARM' : 'NEXT FLOW'}
                             </button>
                           ) : (
                             <button onClick={isPaused ? resumeTimer : pauseTimer}
                               className="flex items-center gap-2 px-6 py-3 rounded-full font-headline font-black text-[10px] uppercase tracking-widest transition-all duration-300 hover:scale-105"
                               style={{ background: isPaused ? 'rgba(0,219,233,0.15)' : 'rgba(255,186,56,0.15)', border: `1px solid ${isPaused ? themeColor : '#ffba38'}`, color: isPaused ? themeColor : '#ffba38' }}>
                               {isPaused ? <Play size={12} fill={themeColor}/> : <Pause size={12} fill="#ffba38"/>}
                               {isPaused ? 'RESUME' : 'PAUSE'}
                             </button>
                           )}
                           <button onClick={handleManualReset}
                             className="w-10 h-10 flex items-center justify-center rounded-full border border-outline-variant/30 text-on-surface-variant hover:border-error hover:text-error hover:bg-error/10 transition-colors">
                             <X size={14} />
                           </button>
                        </div>
                    )}
                 </div>
              </div>

            </div>
          </div>

          <div className={`flex-1 w-full max-w-sm flex flex-col items-center lg:items-start justify-center transition-all duration-700 ease-in-out ${isRunning || isPaused || isRinging ? 'opacity-40' : 'opacity-100'}`}>
            {/* Execution Protocols Selector (Collapsible View) */}
            <div className="w-full mb-6">
              <div className="flex justify-between items-center mb-2 pl-1 pr-1">
                <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant/60">Execution Protocol</span>
                <div className="flex items-center gap-3">
                   <button onClick={() => setIsManagingProtocols(true)} className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                     <Settings2 size={10}/> Manage
                   </button>
                   <button onClick={openBuilder} className="text-[9px] font-bold uppercase tracking-widest text-secondary hover:text-secondary/80 flex items-center gap-1 transition-colors">
                     <Plus size={10}/> New
                   </button>
                </div>
              </div>
              
              {/* Selected Active Protocol Button */}
              <button onClick={() => setShowFlows(!showFlows)} className={`w-full bg-[#111318] border ${showFlows ? 'border-primary' : 'border-outline-variant/30'} rounded-xl p-4 flex justify-between items-center transition-all shadow-lg hover:border-primary/50 relative z-20`}>
                 <div className="flex flex-col items-start gap-1 text-left truncate flex-1 pr-4">
                    <span className="font-headline font-bold text-sm text-primary uppercase tracking-tight truncate w-full">{selectedTemplate.label}</span>
                    <span className="font-headline font-bold text-[9px] text-on-surface-variant/60 uppercase tracking-widest flex items-center gap-2">
                       {selectedTemplate.blocks.length} Phases
                       <div className="flex gap-1 items-center">
                         {selectedTemplate.blocks.map((b,i) => {
                           const isCurrent = i === currentBlockIndex && (isRunning || isPaused);
                           const isDone = i < currentBlockIndex;
                           return (
                             <div key={i} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[7px] font-black ${isCurrent ? 'bg-[#ffba38] text-black animate-pulse' : isDone ? 'bg-[#ffba38]/40 text-[#ffba38]' : b.type === 'break' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                               {b.mins}m
                             </div>
                           )
                         })}
                       </div>
                    </span>
                 </div>
                 <ChevronDown size={14} className={`text-on-surface-variant/50 transition-transform flex-shrink-0 ${showFlows ? 'rotate-180':''}`} />
              </button>

              {/* Expandable Tile List */}
              <div className={`transition-all duration-300 ease-in-out relative z-10 ${showFlows ? 'opacity-100 translate-y-0 mt-4 pointer-events-auto' : 'opacity-0 -translate-y-4 max-h-0 pointer-events-none'}`}>
                 <div className="flex flex-wrap gap-3 pb-4 pt-1">
                    {ALL_TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => { setSelectedTemplateId(t.id); setCurrentBlockIndex(0); setShowFlows(false); }}
                              className={`flex-shrink-0 w-full md:w-[calc(50%-6px)] p-4 rounded-xl border text-left transition-all duration-200 shadow-lg ${selectedTemplateId === t.id ? 'border-primary bg-surface-container-highest' : 'border-outline-variant/10 bg-[#16181b] hover:border-primary/30'} ${t.id === 'single' ? 'bg-[#111318]' : ''}`}>
                        <div className={`font-headline font-bold text-xs uppercase tracking-widest mb-1 truncate ${selectedTemplateId === t.id ? 'text-primary' : 'text-on-surface-variant'}`}>{t.label}</div>
                        <div className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-4 truncate line-clamp-2 white-space-normal h-[24px]">{t.desc}</div>
                        
                        <div className="flex flex-wrap gap-1 mt-auto">
                          {t.blocks.map((b,i) => (
                            <div key={i} 
                                 className={`px-1 rounded-sm text-[7px] font-black ${b.type === 'break' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}
                                 style={{ opacity: selectedTemplateId === t.id ? 1 : 0.6 }}>
                              {b.mins}m
                            </div>
                          ))}
                        </div>
                      </button>
                    ))}
                 </div>
              </div>
            </div>

            {/* Goal Selector immediately under Timer */}
            <div className="w-full mb-8 relative z-0">
               <div className="flex justify-between items-center mb-2 pl-1 pr-1">
                   <span className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant/50">Primary Objective</span>
                   
                   {/* Lock-In Toggle aligned right */}
                   <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                      <Lock size={10} className={lockIn ? 'text-[#ffba38]' : 'text-on-surface-variant/50'} />
                      <span className={`text-[8px] uppercase tracking-widest font-bold ${lockIn ? 'text-[#ffba38]' : 'text-on-surface-variant/60'}`}>Lock-In</span>
                      <button onClick={() => setLockIn(!lockIn)} className="relative w-7 h-3.5 bg-[#1a1c20] border border-outline-variant/30 rounded-full transition-colors" style={{ borderColor: lockIn ? 'rgba(255,186,56,0.5)' : undefined }}>
                        <div className="absolute top-0.5 w-2.5 h-2.5 transition-all duration-200 rounded-full" style={{ left: lockIn ? 'calc(100% - 11px)':'2px', background: lockIn?'#ffba38':'#3b494b', boxShadow: lockIn ? '0 0 6px rgba(255,186,56,0.6)' : 'none' }} />
                      </button>
                   </div>
               </div>

               <div className={`w-full bg-[#111318] border flex flex-col ${activeTask.id ? 'border-primary/50 shadow-[0_0_15px_rgba(0,219,233,0.1)]' : 'border-outline-variant/20 shadow-lg'} rounded-xl p-4 transition-all overflow-hidden`}>
                 <div className="flex items-center gap-3 w-full overflow-hidden">
                   <div className="w-8 h-8 rounded-md bg-surface-container flex items-center justify-center shrink-0">
                      <Zap size={14} className={activeTask.id ? 'text-primary' : 'text-on-surface-variant/50'} />
                   </div>
                   <div className="flex flex-col items-start gap-0.5 truncate w-full">
                     <span className={`font-headline font-bold text-sm uppercase tracking-tight text-left w-full truncate block ${activeTask.id ? 'text-primary' : 'text-on-surface'}`}>{activeTask.label}</span>
                     <span className="text-[9px] text-on-surface-variant/60 uppercase tracking-widest font-bold">
                        {activeTask.id ? 'Active Focus Target' : 'Current Target (General)'}
                     </span>
                   </div>
                   {activeTask.id && (
                     <button onClick={completeActiveTask} className="w-8 h-8 rounded-md border border-secondary/40 bg-secondary/10 flex items-center justify-center shrink-0 hover:bg-secondary/20 transition-colors text-secondary group/btn" title="Complete Target">
                        <Circle size={14} className="group-hover/btn:hidden" />
                        <CheckCircle2 size={14} className="hidden group-hover/btn:block" />
                     </button>
                   )}
                 </div>

                 {/* Integrated Task Backlog View */}
                 {!isRunning && (
                   <div className="mt-4 pt-4 border-t border-outline-variant/10 w-full animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 mb-3">
                        <input value={newTaskLabel} onChange={e => setNewTaskLabel(e.target.value)} onKeyDown={e => e.key==='Enter' && quickAddTask()}
                           placeholder="Type new backlog task..." className="flex-1 bg-surface-container border border-outline-variant/10 rounded-md p-2.5 font-headline text-xs font-bold uppercase text-primary placeholder:text-on-surface-variant/30 outline-none focus:border-primary/30 transition-colors" />
                        <button onClick={quickAddTask} className="w-9 h-9 shrink-0 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"><Plus size={14}/></button>
                      </div>
                      
                      <div className="max-h-40 overflow-y-auto no-scrollbar flex flex-col gap-1 -mx-2 px-2">
                          <button onClick={() => setActiveTask({ label:'General Focus' })} 
                                  className={`w-full py-2.5 px-3 text-left rounded-md transition-colors font-bold text-[10px] uppercase tracking-widest ${!activeTask.id && activeTask.label==='General Focus' ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5 text-on-surface-variant'}`}>
                             General Focus
                          </button>
                          {mergedTasks.map(t => (
                            <button key={`${t.isDaily ? 'd' : 's'}-${t.id}`} onClick={() => setActiveTask({ id: t.id, label: t.label, isDaily: t.isDaily })} 
                                    className={`w-full py-2.5 px-3 text-left rounded-md transition-colors flex justify-between items-center group ${activeTask.label === t.label ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-primary/5 text-on-surface border border-transparent'}`}>
                               <div className="flex items-center gap-2 overflow-hidden">
                                  {t.isDaily && <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />}
                                  <span className="font-bold text-[10px] uppercase tracking-widest truncate">{t.label}</span>
                               </div>
                               <span className="shrink-0 text-[8px] font-bold opacity-40 group-hover:opacity-100">{t.isDaily ? 'TODAY' : t.priority}</span>
                            </button>
                          ))}
                      </div>
                   </div>
                 )}
               </div>
            </div>

            {/* Quick Resets (Only if Single Template Selected) */}
            {!isRunning && selectedTemplate.id === 'single' && (
               <div className="w-full mb-4">
                  <div className="font-headline font-bold text-[9px] uppercase tracking-widest text-on-surface-variant/50 mb-2 pl-1">Quick Custom Override</div>
                  <div className="grid grid-cols-5 gap-2">
                    {recentMins.map((mins, i) => {
                      const active = currentBlock.mins === mins && !showCustom;
                      return (
                        <button key={i} onClick={() => {
                          TEMPLATES[0].blocks[0].mins = mins;
                          setCurrentBlockIndex(0);
                          setShowCustom(false);
                        }}
                          className={`py-3 flex flex-col items-center gap-1 transition-all active:scale-95 border rounded-lg shadow-md ${active ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-high bg-[#111318]'}`}>
                          <span className="font-headline font-black text-lg tabular-nums leading-none">{mins}</span>
                        </button>
                      );
                    })}
                    <button onClick={() => setShowCustom(!showCustom)}
                      className={`py-3 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border rounded-lg shadow-md ${showCustom ? 'border-tertiary-fixed-dim text-tertiary-fixed-dim bg-tertiary/10' : 'border-outline-variant/10 text-on-surface-variant/50 hover:bg-surface-container-high bg-[#111318]'}`}>
                      <Edit3 size={16} />
                    </button>
                  </div>

                  {showCustom && (
                    <div className="flex items-center gap-2 mt-3 p-2 bg-[#111318] border border-tertiary/30 rounded-lg shadow-lg">
                      <input autoFocus type="number" min="1" max="480" value={customMins} onChange={e => setCustomMins(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyCustom()}
                        placeholder="Minutes..." className="flex-1 bg-transparent font-headline font-black text-base text-tertiary-fixed-dim tabular-nums outline-none px-3" />
                      <button onClick={applyCustom} className="px-5 py-2.5 font-headline font-black text-[10px] uppercase tracking-widest bg-tertiary text-on-tertiary rounded-md hover:bg-tertiary-fixed-dim transition-colors">Set Config</button>
                    </div>
                  )}
               </div>
            )}
            
          </div>
        </div>
      )}

      <style>{`
        @keyframes ripple { 0% { transform:scale(0.85); opacity:0; border-width:3px; } 30% { opacity:0.3; } 100% { transform:scale(1.2); opacity:0; border-width:0px; } }
      `}</style>
    </div>
  );
};
