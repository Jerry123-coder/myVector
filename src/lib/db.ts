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

export interface FocusProtocol {
  id?: string;
  label: string;
  desc: string;
  blocks: { type: 'focus' | 'break'; mins: number; label: string }[];
  updatedAt: number;
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
  category: 'deep-work' | 'admin' | 'skill' | 'workout' | string; // Core habit classifications
  taskId?: number;
  done: boolean;
  order: number;
  updatedAt: number;
  userId?: string;
}

export interface RewardItem {
  id?: number;
  title: string;
  description?: string;
  icon?: string;
  isUserDefined: boolean;
  isUnlocked: boolean;
  unlockedAt?: number;
  requiredXp?: number;          // XP level gate
  milestoneLabel?: string;      // unlocks when milestone with this title is marked done
  milestoneId?: number;
  sideQuestLabel?: string;      // unlocks when SideQuest with this title reaches sideQuestThreshold
  sideQuestThreshold?: number;  // currentCount must be >= this value
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

export interface XPLog {
  id?: number;
  date: string;              // "YYYY-MM-DD"
  amount: number;
  reason: string;
  category: 'habit' | 'bonus' | 'project' | 'relationship';
  createdAt: number;
  userId?: string;
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
  xpLogs!:         Table<XPLog>;
  focusProtocols!: Table<FocusProtocol>;

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

    // Version 17: Adds xpLogs for progression economy
    this.version(17).stores({
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
      xpLogs:         '++id, date, category, createdAt, userId',
    });

    // Version 18: Adds focusProtocols
    this.version(18).stores({
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
      xpLogs:         '++id, date, category, createdAt, userId',
      focusProtocols: 'id, updatedAt',
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

export const INITIAL_PROTOCOLS: FocusProtocol[] = [
  {
    id: 'workout',
    label: 'Workout Session',
    desc: 'Daily physical training',
    blocks: [{ type: 'focus', mins: 15, label: 'Intense Training' }],
    updatedAt: Date.now()
  },
  {
    id: 'study',
    label: 'Study Session',
    desc: 'Skill acquisition and mastery',
    blocks: [
      { type: 'focus', mins: 40, label: 'Deep Focus Alpha' },
      { type: 'break', mins: 10, label: 'System Recovery' },
      { type: 'focus', mins: 40, label: 'Deep Focus Beta' }
    ],
    updatedAt: Date.now()
  },
  {
    id: 'deep-work',
    label: 'Deep Work Block',
    desc: 'Elite endurance training',
    blocks: [
      { type: 'focus', mins: 90, label: 'Deep Focus Alpha' },
      { type: 'break', mins: 10, label: 'System Recovery' },
      { type: 'focus', mins: 90, label: 'Deep Focus Beta' },
      { type: 'break', mins: 10, label: 'System Recovery' },
      { type: 'focus', mins: 40, label: 'Deep Focus Gamma' }
    ],
    updatedAt: Date.now()
  },
  {
    id: 'weekly-review',
    label: 'Weekly Review',
    desc: 'Sunday system alignment',
    blocks: [
      { type: 'focus', mins: 60, label: 'Reflection & Journaling' },
      { type: 'break', mins: 10, label: 'System Recovery' },
      { type: 'focus', mins: 50, label: 'Strategy Reset' }
    ],
    updatedAt: Date.now()
  }
];

export const INITIAL_REWARDS: RewardItem[] = [
  // ─ XP-Gated Economy (13 tiers) ────────────────────────────────────────────────────
  { title: 'Premium Coffee or Specialty Juice',         icon: '☕',   isUserDefined: false, isUnlocked: false, requiredXp: 50,   createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'LED Desk Lamp',                             icon: '💡',   isUserDefined: false, isUnlocked: false, requiredXp: 130,  createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Fine Dining Experience #1',                 icon: '🍷',   isUserDefined: false, isUnlocked: false, requiredXp: 250,  createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Niche Fragrance #1',                        icon: '✨',   isUserDefined: false, isUnlocked: false, requiredXp: 500,  createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Pottery Class with a Friend',               icon: '🏺',   isUserDefined: false, isUnlocked: false, requiredXp: 750,  createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'New Tech Accessory / Productivity Tool',    icon: '🛠️',  isUserDefined: false, isUnlocked: false, requiredXp: 1000, createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'A Spa Session',                             icon: '🧖',   isUserDefined: false, isUnlocked: false, requiredXp: 1250, createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Fine Dining Experience #2',                 icon: '🥩',   isUserDefined: false, isUnlocked: false, requiredXp: 1500, createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Weekend Day Trip',                          icon: '🗺️',  isUserDefined: false, isUnlocked: false, requiredXp: 2000, createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Signature Custom Tailored Piece',           icon: '🧻',   isUserDefined: false, isUnlocked: false, requiredXp: 2500, createdAt: Date.now(), updatedAt: Date.now() },
  { title: "The 'Ace' Desk Peripheral Upgrade",         icon: '💻',   isUserDefined: false, isUnlocked: false, requiredXp: 3000, createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Premium Leather Goods',                     icon: '💼',   isUserDefined: false, isUnlocked: false, requiredXp: 3500, createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'End-of-Year Wardrobe Signature Completion', icon: '👔',   isUserDefined: false, isUnlocked: false, requiredXp: 4000, createdAt: Date.now(), updatedAt: Date.now() },
  // ─ Milestone-Gated (Binary Achievements) ──────────────────────────────────────────────
  { title: "The 'Sanctuary' Couch",                     icon: '🛋️',  isUserDefined: false, isUnlocked: false, milestoneLabel: 'AWS SOLUTIONS ARCHITECT CERTIFIED',      createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Adjustable Desk & Monitor Stand',           icon: '🖥️',  isUserDefined: false, isUnlocked: false, milestoneLabel: 'CERTIFIED KUBERNETES DEVELOPER (CKAD)',  createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'New MacBook Pro',                           icon: '💻',   isUserDefined: false, isUnlocked: false, milestoneLabel: 'FIRST $5K FREELANCING (TOTAL)',           createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Fine Dining at Peduase Resort',             icon: '🍵',   isUserDefined: false, isUnlocked: false, milestoneLabel: 'FIRST $5K/MONTH CONTRACT',                createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Fine Year-End Retreat (Volta Resort)',       icon: '🏝️',  isUserDefined: false, isUnlocked: false, milestoneLabel: '$5K/MO FOR 3 CONSECUTIVE MONTHS',        createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Ankara Fit #2 & Continental Trip',          icon: '✈️',  isUserDefined: false, isUnlocked: false, milestoneLabel: '100 HOURS INVESTED IN A RELATIONSHIP',    createdAt: Date.now(), updatedAt: Date.now() },
  // ─ Progress-Gated (SideQuest Checkpoints) ──────────────────────────────────────────────
  // Project Deployment Track
  { title: 'Getting Curtains for your Space',           icon: '🪟',   isUserDefined: false, isUnlocked: false, sideQuestLabel: 'PROJECT DEPLOYMENT TRACK', sideQuestThreshold: 5,   createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'LED Lighting Setup',                        icon: '💡',   isUserDefined: false, isUnlocked: false, sideQuestLabel: 'PROJECT DEPLOYMENT TRACK', sideQuestThreshold: 10,  createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'New Shoes #1',                              icon: '👟',   isUserDefined: false, isUnlocked: false, sideQuestLabel: 'PROJECT DEPLOYMENT TRACK', sideQuestThreshold: 15,  createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Gaming / Ergonomic Chair',                  icon: '🪑',   isUserDefined: false, isUnlocked: false, sideQuestLabel: 'PROJECT DEPLOYMENT TRACK', sideQuestThreshold: 25,  createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'New Shoes #3 (Formal)',                     icon: '👞',   isUserDefined: false, isUnlocked: false, sideQuestLabel: 'PROJECT DEPLOYMENT TRACK', sideQuestThreshold: 50,  createdAt: Date.now(), updatedAt: Date.now() },
  // Relationship Track
  { title: 'Day at the Beach',                          icon: '🏖️',  isUserDefined: false, isUnlocked: false, sideQuestLabel: 'INTENTIONAL CHECK-UPS',    sideQuestThreshold: 100, createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Pottery Class',                             icon: '🏺',   isUserDefined: false, isUnlocked: false, sideQuestLabel: 'QUALITY TIME WITH FRIENDS', sideQuestThreshold: 20,  createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'Spa Session',                               icon: '🧖',   isUserDefined: false, isUnlocked: false, sideQuestLabel: 'HOURS IN A RELATIONSHIP',  sideQuestThreshold: 50,  createdAt: Date.now(), updatedAt: Date.now() },
];


export const INITIAL_MILESTONES: Omit<Milestone, 'id'>[] = [
  // Certifications
  { title: 'AWS SOLUTIONS ARCHITECT CERTIFIED',     targetDate: new Date('2025-09-30').getTime(), status: 'upcoming', createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'CERTIFIED KUBERNETES DEVELOPER (CKAD)', targetDate: new Date('2025-12-31').getTime(), status: 'upcoming', createdAt: Date.now(), updatedAt: Date.now() },
  // Financial
  { title: 'FIRST  FREELANCING (TOTAL)',         targetDate: new Date('2025-10-31').getTime(), status: 'upcoming', createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'FIRST /MONTH CONTRACT',              targetDate: new Date('2025-10-31').getTime(), status: 'upcoming', createdAt: Date.now(), updatedAt: Date.now() },
  { title: '/MO FOR 3 CONSECUTIVE MONTHS',       targetDate: new Date('2026-06-30').getTime(), status: 'upcoming', createdAt: Date.now(), updatedAt: Date.now() },
  // Execution
  { title: 'COMPLETE 100-DAY STREAK',               targetDate: new Date('2025-08-15').getTime(), status: 'upcoming', createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'COMPLETE 90-DAY WORKOUT STREAK',        targetDate: new Date('2025-07-31').getTime(), status: 'upcoming', createdAt: Date.now(), updatedAt: Date.now() },
  // Relationship
  { title: '100 HOURS INVESTED IN A RELATIONSHIP',  targetDate: new Date('2025-12-31').getTime(), status: 'upcoming', createdAt: Date.now(), updatedAt: Date.now() },
  // Brand
  { title: 'REACH 1K SOCIAL FOLLOWERS',             targetDate: new Date('2025-10-01').getTime(), status: 'upcoming', createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'LAND FIRST CLIENT',                     targetDate: new Date('2025-07-31').getTime(), status: 'upcoming', createdAt: Date.now(), updatedAt: Date.now() },
];

// Progress-based workstream trackers seeded as SideQuests
export const INITIAL_SIDE_QUESTS: Omit<SideQuest, 'id'>[] = [
  { title: 'PROJECT DEPLOYMENT TRACK',  targetCount: 50,  currentCount: 0, icon: 'Rocket',   createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'GOLANG PROJECTS',           targetCount: 5,   currentCount: 0, icon: 'Scroll',   createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'INTENTIONAL CHECK-UPS',     targetCount: 100, currentCount: 0, icon: 'Users',    createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'QUALITY TIME WITH FRIENDS', targetCount: 20,  currentCount: 0, icon: 'Dumbbell', createdAt: Date.now(), updatedAt: Date.now() },
  { title: 'HOURS IN A RELATIONSHIP',   targetCount: 100, currentCount: 0, icon: 'Sword',    createdAt: Date.now(), updatedAt: Date.now() },
];
