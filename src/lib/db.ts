import Dexie, { type Table } from 'dexie';

export interface FocusSession {
  id?: number;
  type: 'focus' | 'break';
  startTime: number;
  endTime: number;
  durationSecs: number;
  actualSecs: number;
  taskId?: number;
  taskLabel: string;
  completedAt: number;
  updatedAt: number;
  userId?: string;
}
export interface MultiYearGoal {
  id?: number;
  title: string;
  description?: string;
  category?: 'CRAFT' | 'FINANCE' | 'HEALTH' | 'SOCIAL' | 'CHARACTER' | 'OTHER';
  targetYear: number;
  targetAchievement?: string; // What exactly I'm looking to achieve
  imageUrl?: string;         // Vision board picture
  status: 'active' | 'done' | 'at-risk';
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface AnnualGoal {
  id?: number;
  title: string;
  description?: string;
  category?: 'CRAFT' | 'FINANCE' | 'HEALTH' | 'SOCIAL' | 'CHARACTER' | 'OTHER';
  year: number;               // e.g. 2025
  status: 'active' | 'done' | 'at-risk';
  targetDate?: number;
  isPinned?: boolean;
  multiYearGoalId?: number;
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface QuarterlyGoal {
  id?: number;
  title: string;
  description?: string;
  category?: 'CRAFT' | 'FINANCE' | 'HEALTH' | 'SOCIAL' | 'CHARACTER' | 'OTHER';
  quarter: string;
  annualGoalId?: number;
  status: 'active' | 'done' | 'at-risk';
  targetDate?: number;
  imageUrl?: string;         // Optional image for quarterly objectives
  isPinned?: boolean;
  keyResults?: { id: string; title: string; done: boolean }[];
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface Sprint {
  id?: number;
  name: string;
  objective?: string;
  quarterlyGoalId?: number;
  annualGoalId?: number;
  startDate: number;
  endDate: number;
  status: 'planned' | 'active' | 'done';
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface Task {
  id?: number;
  label: string;
  meta?: string;
  status: 'pending' | 'active' | 'done';
  priority: 'HIGH' | 'MED' | 'LOW';
  sprintId?: number;
  quarterlyGoalId?: number;
  annualGoalId?: number;
  order?: number; // Added for execution sequencing
  createdAt: number;
  completedAt?: number;
  updatedAt: number;
  userId?: string;
}

export interface Milestone {
  id?: number;
  title: string;
  targetDate: number;
  annualGoalId?: number;
  quarterlyGoalId?: number;
  sprintId?: number;
  status: 'upcoming' | 'done' | 'at-risk';
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface DailyTask {
  id?: number;
  date: string;               // "YYYY-MM-DD"
  label: string;
  category: 'deep-work' | 'admin'; // Deep Work vs Admin classification
  taskId?: number;
  done: boolean;
  order: number;
  updatedAt: number;
  userId?: string;
}

export interface RewardItem {
  id?: number;
  title: string;             // e.g., "New Fragrance Purchase"
  description?: string;
  icon?: string;             // emoji or icon name
  isUserDefined: boolean;    // false = preset / true = user-defined
  isUnlocked: boolean;       // revealed once earned
  unlockedAt?: number;
  requiredXp?: number;       // XP level gate (optional)
  milestoneId?: number;      // linked milestone gate (optional)
  createdAt: number;
  updatedAt: number;
}

export interface SideQuest {
  id?: number;
  title: string;
  targetCount: number;
  currentCount: number;
  icon?: string;
  category?: string;
  xpReward?: number;
  quarterlyGoalId?: number; // Linked to a 90-day focus
  annualGoalId?: number;    // Linked to a yearly horizon
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface DailyStreak {
  id?: number;
  date: string;              // "YYYY-MM-DD"
  allDone: boolean;          // true if every DailyTask was completed
  updatedAt: number;
}

export class VectorDB extends Dexie {
  sessions!:       Table<FocusSession>;
  multiYearGoals!: Table<MultiYearGoal>;
  annualGoals!:    Table<AnnualGoal>;
  quarterlyGoals!: Table<QuarterlyGoal>;
  sprints!:        Table<Sprint>;
  tasks!:          Table<Task>;
  milestones!:     Table<Milestone>;
  dailyTasks!:     Table<DailyTask>;
  rewards!:        Table<RewardItem>;
  dailyStreaks!:   Table<DailyStreak>;
  sideQuests!:     Table<SideQuest>;
  categories!:     Table<Category>;

  constructor(dbName = 'VectorOS') {
    super(dbName);

    this.version(1).stores({
      sessions: '++id, completedAt, taskId',
      tasks:    '++id, status, priority, createdAt',
      goals:    '++id, status, createdAt',
    });

    this.version(2).stores({
      sessions:       '++id, completedAt, taskId',
      quarterlyGoals: '++id, status',
      sprints:        '++id, goalId, status, startDate',
      tasks:          '++id, status, priority, sprintId, goalId, createdAt',
      milestones:     '++id, goalId, sprintId, status, targetDate',
      dailyTasks:     '++id, date, order',
    });

    // v3: adds annualGoals, renames goalId→quarterlyGoalId, adds annualGoalId refs
    this.version(3).stores({
      sessions:       '++id, completedAt, taskId, updatedAt, userId',
      annualGoals:    '++id, status, year, updatedAt, userId',
      quarterlyGoals: '++id, status, annualGoalId, updatedAt, userId',
      sprints:        '++id, quarterlyGoalId, annualGoalId, status, startDate, updatedAt, userId',
      tasks:          '++id, status, priority, sprintId, quarterlyGoalId, annualGoalId, createdAt, updatedAt, userId',
      milestones:     '++id, annualGoalId, quarterlyGoalId, sprintId, status, targetDate, updatedAt, userId',
      dailyTasks:     '++id, date, order, updatedAt, userId',
    });

    // Version 9: Adds 'CHARACTER' category support
    this.version(9).stores({
      sessions:       '++id, type, completedAt, taskId, updatedAt, userId',
      annualGoals:    '++id, status, year, category, isPinned, updatedAt, userId',
      quarterlyGoals: '++id, status, annualGoalId, isPinned, updatedAt, userId',
      sprints:        '++id, quarterlyGoalId, annualGoalId, status, startDate, updatedAt, userId',
      tasks:          '++id, status, priority, sprintId, quarterlyGoalId, annualGoalId, createdAt, completedAt, updatedAt, userId',
      milestones:     '++id, annualGoalId, quarterlyGoalId, sprintId, status, targetDate, updatedAt, userId',
      dailyTasks:     '++id, date, order, updatedAt, userId',
    });

    // Version 11: Adds quarterly goal categories and sprint objectives
    this.version(11).stores({
      sessions:       '++id, type, completedAt, taskId, updatedAt, userId',
      annualGoals:    '++id, status, year, category, isPinned, updatedAt, userId',
      quarterlyGoals: '++id, status, annualGoalId, category, isPinned, updatedAt, userId',
      sprints:        '++id, quarterlyGoalId, annualGoalId, status, startDate, updatedAt, userId',
      tasks:          '++id, status, priority, sprintId, quarterlyGoalId, annualGoalId, createdAt, completedAt, updatedAt, userId',
      milestones:     '++id, annualGoalId, quarterlyGoalId, sprintId, status, targetDate, updatedAt, userId',
      dailyTasks:     '++id, date, category, order, updatedAt, userId',
      rewards:        '++id, isUnlocked, isUserDefined, requiredXp, milestoneId, createdAt',
      dailyStreaks:   '++id, date',
    });

    // Version 12: Adds multiYearGoals, links annual to multiYear, adds completedAt to quarterly
    this.version(12).stores({
      sessions:       '++id, type, completedAt, taskId, updatedAt, userId',
      multiYearGoals: '++id, status, targetYear, category, isPinned, updatedAt, userId',
      annualGoals:    '++id, status, year, category, isPinned, multiYearGoalId, updatedAt, userId',
      quarterlyGoals: '++id, status, annualGoalId, category, isPinned, completedAt, updatedAt, userId',
      sprints:        '++id, quarterlyGoalId, annualGoalId, status, startDate, updatedAt, userId',
      tasks:          '++id, status, priority, sprintId, quarterlyGoalId, annualGoalId, createdAt, completedAt, updatedAt, userId',
      milestones:     '++id, annualGoalId, quarterlyGoalId, sprintId, status, targetDate, updatedAt, userId',
      dailyTasks:     '++id, date, category, order, updatedAt, userId',
      rewards:        '++id, isUnlocked, isUserDefined, requiredXp, milestoneId, createdAt',
      dailyStreaks:   '++id, date',
    });

    // Version 13: Adds imageUrl and targetAchievement fields
    this.version(13).stores({
      sessions:       '++id, type, completedAt, taskId, updatedAt, userId',
      multiYearGoals: '++id, status, targetYear, category, isPinned, updatedAt, userId',
      annualGoals:    '++id, status, year, category, isPinned, multiYearGoalId, updatedAt, userId',
      quarterlyGoals: '++id, status, annualGoalId, category, isPinned, completedAt, updatedAt, userId',
      sprints:        '++id, quarterlyGoalId, annualGoalId, status, startDate, updatedAt, userId',
      tasks:          '++id, status, priority, sprintId, quarterlyGoalId, annualGoalId, createdAt, completedAt, updatedAt, userId',
      milestones:     '++id, annualGoalId, quarterlyGoalId, sprintId, status, targetDate, updatedAt, userId',
      dailyTasks:     '++id, date, category, order, updatedAt, userId',
      rewards:        '++id, isUnlocked, isUserDefined, requiredXp, milestoneId, createdAt',
      dailyStreaks:   '++id, date',
    });

    // Version 14: Adds sideQuests table for counter-based goals
    this.version(14).stores({
      sessions:       '++id, type, completedAt, taskId, updatedAt, userId',
      multiYearGoals: '++id, status, targetYear, category, isPinned, updatedAt, userId',
      annualGoals:    '++id, status, year, category, isPinned, multiYearGoalId, updatedAt, userId',
      quarterlyGoals: '++id, status, annualGoalId, category, isPinned, completedAt, updatedAt, userId',
      sprints:        '++id, quarterlyGoalId, annualGoalId, status, startDate, updatedAt, userId',
      tasks:          '++id, status, priority, sprintId, quarterlyGoalId, annualGoalId, createdAt, completedAt, updatedAt, userId',
      milestones:     '++id, annualGoalId, quarterlyGoalId, sprintId, status, targetDate, updatedAt, userId',
      dailyTasks:     '++id, date, category, order, updatedAt, userId',
      rewards:        '++id, isUnlocked, isUserDefined, requiredXp, milestoneId, createdAt',
      dailyStreaks:   '++id, date',
      sideQuests:     '++id, title, targetCount, currentCount, updatedAt, userId',
    });

    // Version 15: Adds linkage for side quests to strategic goals
    this.version(15).stores({
      sessions:       '++id, type, completedAt, taskId, updatedAt, userId',
      multiYearGoals: '++id, status, targetYear, category, isPinned, updatedAt, userId',
      annualGoals:    '++id, status, year, category, isPinned, multiYearGoalId, updatedAt, userId',
      quarterlyGoals: '++id, status, annualGoalId, category, isPinned, completedAt, updatedAt, userId',
      sprints:        '++id, quarterlyGoalId, annualGoalId, status, startDate, updatedAt, userId',
      tasks:          '++id, status, priority, sprintId, quarterlyGoalId, annualGoalId, createdAt, completedAt, updatedAt, userId',
      milestones:     '++id, annualGoalId, quarterlyGoalId, sprintId, status, targetDate, updatedAt, userId',
      dailyTasks:     '++id, date, category, order, updatedAt, userId',
      rewards:        '++id, isUnlocked, isUserDefined, requiredXp, milestoneId, createdAt',
      dailyStreaks:   '++id, date',
      sideQuests:     '++id, title, quarterlyGoalId, annualGoalId, updatedAt, userId',
    });

    // Version 16: Adds categories table for dynamic pillar theming
    this.version(16).stores({
      sessions:       '++id, type, completedAt, taskId, updatedAt, userId',
      multiYearGoals: '++id, status, targetYear, category, isPinned, updatedAt, userId',
      annualGoals:    '++id, status, year, category, isPinned, multiYearGoalId, updatedAt, userId',
      quarterlyGoals: '++id, status, annualGoalId, category, isPinned, completedAt, updatedAt, userId',
      sprints:        '++id, quarterlyGoalId, annualGoalId, status, startDate, updatedAt, userId',
      tasks:          '++id, status, priority, sprintId, quarterlyGoalId, annualGoalId, createdAt, completedAt, updatedAt, userId',
      milestones:     '++id, annualGoalId, quarterlyGoalId, sprintId, status, targetDate, updatedAt, userId',
      dailyTasks:     '++id, date, category, order, updatedAt, userId',
      rewards:        '++id, isUnlocked, isUserDefined, requiredXp, milestoneId, createdAt',
      dailyStreaks:   '++id, date',
      sideQuests:     '++id, title, quarterlyGoalId, annualGoalId, updatedAt, userId',
      categories:     'id, updatedAt',
    });
  }
}

export interface Category {
  id: string;            // e.g. 'CRAFT'
  label: string;
  icon: string;          // icon name
  color: string;         // tailwind color class or hex
  bg: string;
  border: string;
  glow: string;
  updatedAt: number;
}

export const db = new VectorDB();

// Default Pillars
export const INITIAL_CATEGORIES: Category[] = [
  { id: 'CRAFT',     label: 'CRAFT & SKILLS',    icon: 'Cpu',    color: 'text-primary',     bg: 'bg-primary/5',     border: 'border-primary/20',     glow: 'rgba(0,219,233,0.3)', updatedAt: Date.now() },
  { id: 'FINANCE',   label: 'FINANCIAL FREEDOM', icon: 'DollarSign', color: 'text-emerald-400', bg: 'bg-emerald-400/5', border: 'border-emerald-400/20', glow: 'rgba(52,211,153,0.3)', updatedAt: Date.now() },
  { id: 'HEALTH',    label: 'VITALITY & HEALTH', icon: 'Heart',      color: 'text-error',       bg: 'bg-error/5',       border: 'border-error/20',       glow: 'rgba(255,82,82,0.3)',  updatedAt: Date.now() },
  { id: 'SOCIAL',    label: 'SOCIAL & FAMILY',   icon: 'Users',      color: 'text-[#b464ff]',   bg: 'bg-[#b464ff]/5',   border: 'border-[#b464ff]/20',   glow: 'rgba(180,100,255,0.3)', updatedAt: Date.now() },
  { id: 'CHARACTER', label: 'CHARACTER & BRAND', icon: 'Shield',     color: 'text-[#FFBA38]',   bg: 'bg-[#FFBA38]/5',   border: 'border-[#FFBA38]/20',   glow: 'rgba(255,186,56,0.3)', updatedAt: Date.now() },
];

export const todayStr = () => new Date().toISOString().split('T')[0];
