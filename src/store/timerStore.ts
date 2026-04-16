import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../lib/db';

type WindowWithWebKit = Window & { webkitAudioContext?: typeof AudioContext };

type TimerState = 'idle' | 'running' | 'paused' | 'ringing' | 'completed';

interface ActiveTask {
  id?: number;
  label: string;
}

interface TimerStore {
  state: TimerState;
  sessionStartTime: number | null;
  sessionEndTime: number | null;
  duration: number; // seconds
  activeTask: ActiveTask;
  isOvertime: boolean;
  notified: boolean;
  // Tracking pause/resume:
  accumulatedMs: number;
  lastResumeTime: number | null;
  pausedRemainingMs: number | null;

  startTimer: (durationSecs: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  checkTimerState: () => void;
  endTimer: () => void;
  resetTimer: () => void;
  setActiveTask: (task: ActiveTask) => void;
}

let alarmInterval: ReturnType<typeof setInterval> | null = null;

const startAlarmLoop = () => {
  if (alarmInterval) clearInterval(alarmInterval);

  const AudioCtx = window.AudioContext ?? (window as WindowWithWebKit).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  
  const playBeep = () => {
    try {
      const playTone = (freq: number, delay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
      };
      
      // Gentle major 7th arpeggio chime (C5, E5, G5, B5)
      playTone(523.25, 0, 1.2);    // C5
      playTone(659.25, 0.15, 1.2); // E5
      playTone(783.99, 0.3, 1.2);  // G5
      playTone(987.77, 0.45, 1.5); // B5
    } catch {
      /* AudioContext may not be available or blocked */
    }
  };

  playBeep(); // immediate first beep
  alarmInterval = setInterval(playBeep, 2000); // repeat every 2s

  // Stop automatically after 1 min
  setTimeout(() => {
    if (alarmInterval) clearInterval(alarmInterval);
  }, 60000);
};

const stopAlarmLoop = () => {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
};

const fireNotification = (title: string, body: string) => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon.svg', silent: false });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') {
        new Notification(title, { body, icon: '/icon.svg' });
      }
    });
  }
};

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      state: 'idle',
      sessionStartTime: null,
      sessionEndTime: null,
      duration: 25 * 60,
      activeTask: { label: 'General Focus' },
      isOvertime: false,
      notified: false,
      accumulatedMs: 0,
      lastResumeTime: null,
      pausedRemainingMs: null,

      startTimer: (durationSecs) => {
        const now = Date.now();
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        set({
          state: 'running',
          duration: durationSecs,
          sessionStartTime: now,
          sessionEndTime: now + durationSecs * 1000,
          isOvertime: false,
          notified: false,
          accumulatedMs: 0,
          lastResumeTime: now,
          pausedRemainingMs: null,
        });
      },

      pauseTimer: () => {
        const { state, sessionEndTime, accumulatedMs, lastResumeTime } = get();
        if (state !== 'running' || !sessionEndTime || !lastResumeTime) return;
        const now = Date.now();
        
        set({
          state: 'paused',
          pausedRemainingMs: sessionEndTime - now,
          accumulatedMs: accumulatedMs + Math.max(0, now - lastResumeTime),
          lastResumeTime: null,
        });
      },

      resumeTimer: () => {
        const { state, pausedRemainingMs } = get();
        if (state !== 'paused' || pausedRemainingMs === null) return;
        const now = Date.now();
        set({
           state: 'running',
           sessionEndTime: now + pausedRemainingMs,
           lastResumeTime: now,
           pausedRemainingMs: null
        });
      },

      checkTimerState: () => {
        const { state, sessionEndTime, duration, lastResumeTime, accumulatedMs } = get();
        if (state === 'running' && sessionEndTime && Date.now() >= sessionEndTime) {
          stopAlarmLoop();
          set({ 
            state: 'ringing', 
            // Save the exact tracked time so it stops right at 0
            accumulatedMs: accumulatedMs + Math.max(0, sessionEndTime - (lastResumeTime || sessionEndTime)),
            lastResumeTime: null
          });
          
          startAlarmLoop();
          fireNotification(
            '✓ Session Complete',
            `${Math.floor(duration / 60)}m focus target reached.`
          );
        }
      },

      endTimer: () => {
        const { state, sessionStartTime, duration, activeTask, accumulatedMs, lastResumeTime } = get();
        if (state === 'idle' || state === 'completed') return;
        
        stopAlarmLoop();
        set({ state: 'completed' });

        // Save session to IndexedDB
        const now = Date.now();
        const totalFocusMs = accumulatedMs + (state === 'running' && lastResumeTime ? Math.max(0, now - lastResumeTime) : 0);
        const actualSecs = Math.floor(totalFocusMs / 1000);
        
        db.sessions.add({
          startTime: sessionStartTime ?? now - actualSecs * 1000,
          endTime: now,
          durationSecs: duration,
          actualSecs,
          taskLabel: activeTask.label,
          taskId: activeTask.id,
          completedAt: now,
          updatedAt: now,
        });

        // Mark task as done if linked
        if (activeTask.id) {
          db.tasks.update(activeTask.id, { status: 'done', completedAt: now, updatedAt: now });
        }
      },

      resetTimer: () => {
        stopAlarmLoop();
        set({
          state: 'idle',
          sessionStartTime: null,
          sessionEndTime: null,
          isOvertime: false,
          notified: false,
          accumulatedMs: 0,
          lastResumeTime: null,
          pausedRemainingMs: null,
        });
      },

      setActiveTask: (task) => set({ activeTask: task }),
    }),
    { name: 'vector-timer-state' }
  )
);
