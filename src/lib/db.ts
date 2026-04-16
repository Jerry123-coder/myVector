import Dexie, { type Table } from 'dexie';

export interface FocusSession {
  id?: number;
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

export interface AnnualGoal {
  id?: number;
  title: string;
  description?: string;
  year: number;               // e.g. 2025
  status: 'active' | 'done' | 'at-risk';
  targetDate?: number;
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface QuarterlyGoal {
  id?: number;
  title: string;
  description?: string;
  quarter: string;            // "Q3 2025"
  annualGoalId?: number;      // linked to annual goal
  status: 'active' | 'done' | 'at-risk';
  targetDate?: number;
  createdAt: number;
  updatedAt: number;
  userId?: string;
}

export interface Sprint {
  id?: number;
  name: string;
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
  taskId?: number;
  done: boolean;
  order: number;
  updatedAt: number;
  userId?: string;
}

class VectorDB extends Dexie {
  sessions!:       Table<FocusSession>;
  annualGoals!:    Table<AnnualGoal>;
  quarterlyGoals!: Table<QuarterlyGoal>;
  sprints!:        Table<Sprint>;
  tasks!:          Table<Task>;
  milestones!:     Table<Milestone>;
  dailyTasks!:     Table<DailyTask>;

  constructor() {
    super('VectorOS');

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

    // Version 4: Adds sync-related middleware triggers (conceptual)
    this.version(4).stores({
      sessions:       '++id, completedAt, taskId, updatedAt, userId',
      annualGoals:    '++id, status, year, updatedAt, userId',
      quarterlyGoals: '++id, status, annualGoalId, updatedAt, userId',
      sprints:        '++id, quarterlyGoalId, annualGoalId, status, startDate, updatedAt, userId',
      tasks:          '++id, status, priority, sprintId, quarterlyGoalId, annualGoalId, createdAt, updatedAt, userId',
      milestones:     '++id, annualGoalId, quarterlyGoalId, sprintId, status, targetDate, updatedAt, userId',
      dailyTasks:     '++id, date, order, updatedAt, userId',
    });
  }
}

export const db = new VectorDB();

export const todayStr = () => new Date().toISOString().split('T')[0];
