import { useState, useRef, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useToast } from '../components/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, BookOpen, Brain, RefreshCw, ChevronDown, CheckCircle2,
  Zap, Music, Volume2, VolumeX, Play, Pause, Clock, Calendar, TrendingUp
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProtocolBlock {
  label: string;
  mins: number;
  type: 'focus' | 'break' | 'active' | 'rest' | 'review' | 'plan' | 'reset';
}

interface Habit {
  id: string;
  label: string;
  subLabel: string;
  icon: React.ElementType;
  xp: number;
  color: string;
  glow: string;
  borderColor: string;
  totalMins: number;
  blocks: ProtocolBlock[];
  sundayOnly?: boolean;
  weekdayOnly?: boolean;
}

// ─── Ambient Tracks ───────────────────────────────────────────────────────────

const AMBIENT_TRACKS = [
  { id: 'none',        label: 'Silence',       url: '' },
  { id: 'forest',      label: 'Forest Piano',  url: 'https://cdn.pixabay.com/audio/2024/02/28/audio_3f6a85f07f.mp3' },
  { id: 'lofi-rain',   label: 'Rainy Lofi',    url: 'https://cdn.pixabay.com/audio/2023/10/30/audio_3d56b4604b.mp3' },
  { id: 'jazz',        label: 'Study Jazz',    url: 'https://cdn.pixabay.com/audio/2024/01/17/audio_40c877d5a2.mp3' },
  { id: 'deep-ocean',  label: 'Deep Ocean',    url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_1e58f65942.mp3' },
];

// ─── Habit Definitions ────────────────────────────────────────────────────────

const WEEKDAY_HABITS: Habit[] = [
  {
    id: 'workout',
    label: 'Workout Session',
    subLabel: '15 min · +5 XP',
    icon: Flame,
    xp: 5,
    color: 'text-error',
    glow: 'rgba(255,82,82,0.25)',
    borderColor: 'rgba(255,82,82,0.2)',
    totalMins: 15,
    weekdayOnly: true,
    blocks: [
      { label: 'Warm-Up',   mins: 3,  type: 'active' },
      { label: 'Training',  mins: 10, type: 'focus'  },
      { label: 'Cool-Down', mins: 2,  type: 'rest'   },
    ],
  },
  {
    id: 'study',
    label: 'Study Session',
    subLabel: '90 min · +5 XP',
    icon: BookOpen,
    xp: 5,
    color: 'text-primary',
    glow: 'rgba(0,219,233,0.25)',
    borderColor: 'rgba(0,219,233,0.2)',
    totalMins: 90,
    weekdayOnly: true,
    blocks: [
      { label: 'Focus Block Alpha', mins: 40, type: 'focus' },
      { label: 'Recovery',          mins: 10, type: 'break' },
      { label: 'Focus Block Beta',  mins: 40, type: 'focus' },
    ],
  },
  {
    id: 'deepwork',
    label: 'Deep Work Block',
    subLabel: '4 h · +10 XP',
    icon: Brain,
    xp: 10,
    color: 'text-[#FFBA38]',
    glow: 'rgba(255,186,56,0.25)',
    borderColor: 'rgba(255,186,56,0.2)',
    totalMins: 240,
    weekdayOnly: true,
    blocks: [
      { label: 'Deep Focus Alpha', mins: 90, type: 'focus' },
      { label: 'System Recovery',  mins: 10, type: 'break' },
      { label: 'Deep Focus Beta',  mins: 90, type: 'focus' },
      { label: 'System Recovery',  mins: 10, type: 'break' },
      { label: 'Deep Focus Gamma', mins: 40, type: 'focus' },
    ],
  },
  {
    id: 'growth',
    label: 'Growth Session',
    subLabel: '15 min · +5 XP',
    icon: TrendingUp,
    xp: 5,
    color: 'text-[#00e475]',
    glow: 'rgba(0,228,117,0.25)',
    borderColor: 'rgba(0,228,117,0.2)',
    totalMins: 15,
    weekdayOnly: true,
    blocks: [
      { label: 'Intense Training', mins: 15, type: 'focus' },
    ],
  },
];

const SUNDAY_HABIT: Habit = {
  id: 'review',
  label: 'Weekly Review',
  subLabel: '2 h · +20 XP',
  icon: RefreshCw,
  xp: 20,
  color: 'text-[#b464ff]',
  glow: 'rgba(180,100,255,0.25)',
  borderColor: 'rgba(180,100,255,0.2)',
  totalMins: 120,
  sundayOnly: true,
  blocks: [
    { label: 'Reflection & Journaling', mins: 30, type: 'review' },
    { label: 'Sprint & Goal Review',    mins: 30, type: 'plan'   },
    { label: 'Strategy Reset',          mins: 60, type: 'reset'  },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayKey = () => new Date().toISOString().split('T')[0];
const isSunday = () => new Date().getDay() === 0;

function loadCompleted(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`vector_ritual_${todayKey()}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCompleted(data: Record<string, boolean>) {
  localStorage.setItem(`vector_ritual_${todayKey()}`, JSON.stringify(data));
}

function formatMins(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const BLOCK_TYPE_STYLE: Record<string, { bg: string; text: string; badge: string }> = {
  focus:   { bg: 'bg-primary/8',          text: 'text-primary',      badge: 'FOCUS'    },
  break:   { bg: 'bg-secondary/8',         text: 'text-secondary',    badge: 'BREAK'    },
  active:  { bg: 'bg-error/8',             text: 'text-error',        badge: 'ACTIVE'   },
  rest:    { bg: 'bg-secondary/8',         text: 'text-secondary',    badge: 'REST'     },
  review:  { bg: 'bg-[#b464ff]/8',        text: 'text-[#b464ff]',   badge: 'REFLECT'  },
  plan:    { bg: 'bg-primary/8',          text: 'text-primary',      badge: 'PLAN'     },
  reset:   { bg: 'bg-[#FFBA38]/8',        text: 'text-[#FFBA38]',   badge: 'STRATEGY' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProtocolTimeline({ blocks }: { blocks: ProtocolBlock[] }) {
  const total = blocks.reduce((s, b) => s + b.mins, 0);
  return (
    <div className="mt-5 space-y-2">
      {/* Visual timeline bar */}
      <div className="flex h-1.5 w-full rounded-full overflow-hidden gap-px">
        {blocks.map((b, i) => {
          const pct = (b.mins / total) * 100;
          const style = BLOCK_TYPE_STYLE[b.type] || BLOCK_TYPE_STYLE.focus;
          const isBreak = b.type === 'break' || b.type === 'rest';
          return (
            <div
              key={i}
              style={{ width: `${pct}%` }}
              className={`h-full rounded-sm ${isBreak ? 'opacity-30' : 'opacity-80'} ${style.text.replace('text-', 'bg-')}`}
            />
          );
        })}
      </div>

      {/* Block rows */}
      <div className="space-y-1.5 pt-1">
        {blocks.map((b, i) => {
          const style = BLOCK_TYPE_STYLE[b.type] || BLOCK_TYPE_STYLE.focus;
          return (
            <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl ${style.bg}`}>
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-black/30 ${style.text}`}>
                  {style.badge}
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wide">{b.label}</span>
              </div>
              <span className={`text-[10px] font-black tabular-nums ${style.text}`}>{formatMins(b.mins)}</span>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/30">Total time</span>
        <span className="text-[10px] font-black text-on-surface-variant/50 tabular-nums">{formatMins(total)}</span>
      </div>
    </div>
  );
}

function HabitCard({
  habit, isOpen, onToggle, isCompleted, onComplete,
}: {
  habit: Habit;
  isOpen: boolean;
  onToggle: () => void;
  isCompleted: boolean;
  onComplete: () => void;
}) {
  const Icon = habit.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{
        borderColor: isCompleted ? 'rgba(0,228,117,0.3)' : isOpen ? habit.borderColor : 'rgba(255,255,255,0.06)',
        background: isCompleted
          ? 'rgba(0,228,117,0.04)'
          : isOpen
          ? `rgba(255,255,255,0.03)`
          : 'rgba(17,19,24,0.6)',
        boxShadow: isOpen && !isCompleted ? `0 0 40px ${habit.glow}` : 'none',
      }}
    >
      {/* Card Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all"
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
          style={{
            background: isCompleted ? 'rgba(0,228,117,0.15)' : `${habit.glow.replace('0.25', '0.12')}`,
            border: `1px solid ${isCompleted ? 'rgba(0,228,117,0.3)' : habit.borderColor}`,
          }}
        >
          {isCompleted
            ? <CheckCircle2 size={18} className="text-secondary" />
            : <Icon size={18} className={habit.color} />
          }
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className={`font-headline font-black text-sm uppercase tracking-widest ${isCompleted ? 'text-secondary' : 'text-on-surface'}`}>
            {habit.label}
          </div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40 mt-0.5 flex items-center gap-2">
            <Clock size={9} />
            {habit.subLabel}
          </div>
        </div>

        {/* XP Badge */}
        <div
          className="shrink-0 px-2.5 py-1 rounded-lg font-headline font-black text-[10px] flex items-center gap-1"
          style={{
            background: isCompleted ? 'rgba(0,228,117,0.15)' : 'rgba(255,186,56,0.1)',
            color: isCompleted ? '#00e475' : '#FFBA38',
            border: `1px solid ${isCompleted ? 'rgba(0,228,117,0.2)' : 'rgba(255,186,56,0.15)'}`,
          }}
        >
          <Zap size={9} />
          +{habit.xp} XP
        </div>

        {/* Chevron */}
        <ChevronDown
          size={16}
          className={`shrink-0 text-on-surface-variant/30 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <ProtocolTimeline blocks={habit.blocks} />

              {/* Complete button */}
              {!isCompleted && (
                <button
                  onClick={(e) => { e.stopPropagation(); onComplete(); }}
                  className="mt-5 w-full py-3 rounded-xl font-headline font-black text-[10px] uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${habit.glow.replace('0.25', '0.3')}, ${habit.glow.replace('0.25', '0.1')})`,
                    border: `1px solid ${habit.borderColor}`,
                    color: habit.color.replace('text-[', '').replace(']', '').replace('text-', ''),
                  }}
                >
                  Mark Complete · +{habit.xp} XP
                </button>
              )}
              {isCompleted && (
                <div className="mt-5 w-full py-3 rounded-xl bg-secondary/10 border border-secondary/20 text-center">
                  <span className="font-headline font-black text-[10px] uppercase tracking-widest text-secondary">
                    ✓ Completed — +{habit.xp} XP Earned
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Ambient Music Player ─────────────────────────────────────────────────────

function AmbientPlayer() {
  const [trackId, setTrackId] = useState('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = AMBIENT_TRACKS.find(t => t.id === trackId) || AMBIENT_TRACKS[0];

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && currentTrack.url) {
      if (audioRef.current.src !== currentTrack.url) {
        audioRef.current.src = currentTrack.url;
        audioRef.current.load();
      }
      audioRef.current.volume = muted ? 0 : volume;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, trackId, volume, muted, currentTrack.url]);

  const selectTrack = (id: string) => {
    setTrackId(id);
    if (id === 'none') { setIsPlaying(false); return; }
    setIsPlaying(true);
  };

  return (
    <div className="rounded-2xl border border-white/6 bg-[#111318]/80 backdrop-blur-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Music size={13} className="text-on-surface-variant/40" />
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">Ambience</span>
      </div>

      {/* Track selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {AMBIENT_TRACKS.map(t => (
          <button
            key={t.id}
            onClick={() => selectTrack(t.id)}
            className={`px-3 py-1.5 rounded-full font-headline font-black text-[9px] uppercase tracking-widest transition-all ${
              trackId === t.id
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-on-surface-variant/30 hover:text-on-surface-variant/60 border border-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      {trackId !== 'none' && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(p => !p)}
            className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-all"
          >
            {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
          </button>
          <button
            onClick={() => setMuted(m => !m)}
            className="text-on-surface-variant/30 hover:text-on-surface-variant transition-colors"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
            onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
            className="flex-1 h-1 accent-primary cursor-pointer"
          />
          <span className="text-[8px] font-black text-on-surface-variant/30 uppercase tracking-widest shrink-0">
            {currentTrack.label}
          </span>
        </div>
      )}

      <audio ref={audioRef} loop preload="none" />
    </div>
  );
}

// ─── Streak Meter ─────────────────────────────────────────────────────────────

function StreakMeter() {
  const streaks = useLiveQuery(() => db.dailyStreaks.toArray(), []) ?? [];

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const streak = streaks.find(s => s.date === dateStr);
    const dow = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 2);
    return { dateStr, done: streak?.allDone ?? false, dow, isToday: dateStr === todayKey() };
  });

  const current = [...streaks].filter(s => s.allDone).length;

  return (
    <div className="rounded-2xl border border-white/6 bg-[#111318]/80 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-on-surface-variant/40" />
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-on-surface-variant/40">Streak</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-headline font-black text-[#FFBA38] tabular-nums streak-glow">{current}</span>
          <span className="text-[8px] font-black uppercase text-on-surface-variant/30">days</span>
        </div>
      </div>
      <div className="flex gap-1.5">
        {last7.map(day => (
          <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full aspect-square rounded-lg transition-all ${
                day.done
                  ? 'bg-secondary/30 border border-secondary/40 shadow-[0_0_8px_rgba(0,228,117,0.2)]'
                  : day.isToday
                  ? 'bg-white/5 border border-primary/20'
                  : 'bg-white/3 border border-white/5'
              }`}
            />
            <span className={`text-[7px] font-black uppercase ${day.isToday ? 'text-primary' : 'text-on-surface-variant/25'}`}>
              {day.dow}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export const DailyRitualView = () => {
  const { showToast } = useToast();
  const sunday = isSunday();
  const habits = sunday ? [SUNDAY_HABIT] : WEEKDAY_HABITS;

  const [completed, setCompleted] = useState<Record<string, boolean>>(loadCompleted);
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setOpenId(prev => (prev === id ? null : id));
  }, []);

  const handleComplete = useCallback(async (habit: Habit) => {
    const today = todayKey();

    // Dedupe: only award XP once per habit per day
    const existing = await db.xpLogs
      .where('date').equals(today)
      .filter(l => l.reason === habit.label)
      .count();

    if (existing === 0) {
      await db.xpLogs.add({
        date: today,
        amount: habit.xp,
        reason: habit.label,
        category: 'habit',
        createdAt: Date.now(),
      });
    }

    const next = { ...completed, [habit.id]: true };
    setCompleted(next);
    saveCompleted(next);
    showToast(`+${habit.xp} XP — ${habit.label} Complete`, 'success');

    // Check if all habits for today are done → write streak
    const allDone = habits.every(h => next[h.id]);
    if (allDone) {
      const existing = await db.dailyStreaks.where('date').equals(today).first();
      if (!existing) {
        await db.dailyStreaks.add({ date: today, allDone: true, updatedAt: Date.now() });
        showToast('🔥 Streak Maintained — All Rituals Complete', 'success');
      } else {
        await db.dailyStreaks.update(existing.id!, { allDone: true, updatedAt: Date.now() });
      }
    }
  }, [completed, habits, showToast]);

  const doneCount  = habits.filter(h => completed[h.id]).length;
  const totalCount = habits.length;
  const allDone    = doneCount === totalCount;
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const dayLabel = sunday
    ? 'Sunday Protocol'
    : new Date().toLocaleDateString('en-US', { weekday: 'long' }) + ' Protocol';

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-10 max-w-2xl mx-auto relative">

      {/* Ambient aura */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-1000"
        style={{
          background: allDone
            ? 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,228,117,0.05) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,219,233,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-on-surface-variant/30 mb-1">
              {dayLabel}
            </p>
            <h1 className="font-headline font-black text-2xl text-on-surface uppercase tracking-tight">
              Daily Ritual
            </h1>
          </div>

          {/* Overall progress */}
          <div className="text-right">
            <div className={`font-headline font-black text-3xl tabular-nums ${allDone ? 'text-secondary' : 'text-on-surface'}`}>
              {doneCount}<span className="text-on-surface-variant/30 text-lg">/{totalCount}</span>
            </div>
            <div className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/30 mt-0.5">
              {allDone ? '🔥 All Done' : 'Completed'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: allDone ? '#00e475' : '#00dbe9' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>

        {/* Habit Cards */}
        <div className="space-y-3">
          <AnimatePresence>
            {habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isOpen={openId === habit.id}
                onToggle={() => toggle(habit.id)}
                isCompleted={!!completed[habit.id]}
                onComplete={() => handleComplete(habit)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* XP summary when all done */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-secondary/25 bg-secondary/6 px-6 py-5 flex items-center justify-between"
            >
              <div>
                <div className="font-headline font-black text-sm text-secondary uppercase tracking-widest">
                  Day Complete
                </div>
                <div className="text-[9px] text-on-surface-variant/40 uppercase tracking-widest mt-0.5">
                  Streak maintained · Rituals locked in
                </div>
              </div>
              <div className="font-headline font-black text-2xl text-[#FFBA38] tabular-nums">
                +{habits.reduce((s, h) => s + h.xp, 0)} XP
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streak Meter */}
        <StreakMeter />

        {/* Ambient Player */}
        <AmbientPlayer />

      </div>
    </div>
  );
};
