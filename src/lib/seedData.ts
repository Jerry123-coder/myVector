import { db } from './db';

export async function seedDemoData() {
  const now = Date.now();
  const d   = (days: number) => now + days * 86400000;
  const p   = (days: number) => now - days * 86400000;

  // ── Annual Goals ──
  const a1 = await db.annualGoals.add({
    title: 'BUILD_AND_SCALE_VECTOR_OS',
    description: 'Ship, distribute and monetise Vector OS across web and mobile platforms.',
    year: 2025, status: 'active', targetDate: d(265), createdAt: p(30),
  }) as number;

  const a2 = await db.annualGoals.add({
    title: 'ESTABLISH_FINANCIAL_ENGINE',
    description: 'Build 3 revenue streams generating $10k/month consistently.',
    year: 2025, status: 'active', targetDate: d(200), createdAt: p(25),
  }) as number;

  // ── Quarterly Goals ──
  const q1 = await db.quarterlyGoals.add({
    title: 'LAUNCH_VECTOR_V1',
    description: 'Ship the first public version with focus tracking and goal execution.',
    quarter: 'Q2 2025', annualGoalId: a1,
    status: 'active', targetDate: d(30), createdAt: p(14),
  }) as number;

  const q2 = await db.quarterlyGoals.add({
    title: 'GROW_REVENUE_STREAMS',
    description: 'Establish 2 new income sources and document systems for scale.',
    quarter: 'Q2 2025', annualGoalId: a2,
    status: 'active', targetDate: d(45), createdAt: p(10),
  }) as number;

  const q3 = await db.quarterlyGoals.add({
    title: 'APP_STORE_DISTRIBUTION',
    description: 'Publish Vector OS on iOS App Store and Google Play.',
    quarter: 'Q3 2025', annualGoalId: a1,
    status: 'active', targetDate: d(90), createdAt: p(5),
  }) as number;

  // ── Sprints ──
  const s1 = await db.sprints.add({
    name: 'SPRINT_ALPHA_01',
    quarterlyGoalId: q1, annualGoalId: a1,
    startDate: p(7), endDate: d(7),
    status: 'active', createdAt: p(7),
  }) as number;

  await db.sprints.add({
    name: 'SPRINT_BETA_01',
    quarterlyGoalId: q1, annualGoalId: a1,
    startDate: d(8), endDate: d(22),
    status: 'planned', createdAt: p(5),
  });

  // ── Tasks ──
  await db.tasks.bulkAdd([
    { label: 'IMPLEMENT_OFFLINE_DB_SYNC',       status: 'done',    priority: 'HIGH', sprintId: s1, quarterlyGoalId: q1, annualGoalId: a1, createdAt: p(6), completedAt: p(5) },
    { label: 'BUILD_PUSH_NOTIFICATION_SYSTEM',  status: 'done',    priority: 'HIGH', sprintId: s1, quarterlyGoalId: q1, annualGoalId: a1, createdAt: p(5), completedAt: p(3) },
    { label: 'REFACTOR_TAILWIND_COMPONENTS',    status: 'active',  priority: 'MED',  sprintId: s1, quarterlyGoalId: q1, annualGoalId: a1, createdAt: p(4) },
    { label: 'CONFIGURE_APP_STORE_ASSETS',      status: 'pending', priority: 'LOW',  sprintId: s1, quarterlyGoalId: q3, annualGoalId: a1, createdAt: p(3) },
    { label: 'WRITE_ONBOARDING_FLOW',           status: 'pending', priority: 'MED',  sprintId: s1, quarterlyGoalId: q1, annualGoalId: a1, createdAt: p(2) },
    { label: 'AUDIT_REVENUE_STREAMS_Q2',        status: 'pending', priority: 'HIGH', quarterlyGoalId: q2, annualGoalId: a2, createdAt: p(1) },
    { label: 'SCOPE_V2_FEATURE_SET',            status: 'pending', priority: 'MED',  quarterlyGoalId: q1, annualGoalId: a1, createdAt: p(1) },
    { label: 'SETUP_STRIPE_INTEGRATION',        status: 'pending', priority: 'HIGH', quarterlyGoalId: q2, annualGoalId: a2, createdAt: p(0) },
  ]);

  // ── Milestones ──
  await db.milestones.bulkAdd([
    { title: 'INTERNAL_ALPHA_RELEASE',        targetDate: d(3),   quarterlyGoalId: q1, sprintId: s1,            status: 'upcoming', createdAt: p(14) },
    { title: 'BETA_TESTING_BEGINS',           targetDate: d(10),  quarterlyGoalId: q1, annualGoalId: a1,         status: 'upcoming', createdAt: p(12) },
    { title: 'MARKETING_SITE_LIVE',           targetDate: d(18),  quarterlyGoalId: q1, annualGoalId: a1,         status: 'upcoming', createdAt: p(10) },
    { title: 'PUBLIC_LAUNCH',                 targetDate: d(30),  annualGoalId: a1,                              status: 'upcoming', createdAt: p(8)  },
    { title: 'REVENUE_MODEL_DEFINED',         targetDate: p(2),   quarterlyGoalId: q2, annualGoalId: a2,         status: 'at-risk',  createdAt: p(9)  },
    { title: 'INFRASTRUCTURE_AUDIT_COMPLETE', targetDate: p(5),   quarterlyGoalId: q1,                          status: 'done',     createdAt: p(20) },
    { title: 'APP_STORE_ACCOUNT_SETUP',       targetDate: d(45),  quarterlyGoalId: q3, annualGoalId: a1,         status: 'upcoming', createdAt: p(3)  },
  ]);

  // ── Focus Sessions ──
  for (const s of [
    { ago: 6, mins: 30, label: 'IMPLEMENT_OFFLINE_DB_SYNC' },
    { ago: 6, mins: 25, label: 'GENERAL_FOCUS' },
    { ago: 5, mins: 60, label: 'BUILD_PUSH_NOTIFICATION_SYSTEM' },
    { ago: 4, mins: 30, label: 'BUILD_PUSH_NOTIFICATION_SYSTEM' },
    { ago: 4, mins: 45, label: 'SCOPE_V2_FEATURE_SET' },
    { ago: 3, mins: 90, label: 'REFACTOR_TAILWIND_COMPONENTS' },
    { ago: 2, mins: 30, label: 'GENERAL_FOCUS' },
    { ago: 1, mins: 60, label: 'AUDIT_REVENUE_STREAMS_Q2' },
    { ago: 0, mins: 30, label: 'REFACTOR_TAILWIND_COMPONENTS' },
  ]) {
    const completedAt  = p(s.ago) + 14 * 3600000;
    const durationSecs = s.mins * 60;
    await db.sessions.add({ startTime: completedAt - durationSecs * 1000, endTime: completedAt, durationSecs, actualSecs: durationSecs, taskLabel: s.label, completedAt });
  }

  // ── Today's 3 Daily Tasks ──
  const today = new Date().toISOString().split('T')[0];
  await db.dailyTasks.bulkAdd([
    { date: today, label: 'REFACTOR_TAILWIND_COMPONENTS', done: true,  order: 0 },
    { date: today, label: 'CONFIGURE_APP_STORE_ASSETS',  done: false, order: 1 },
    { date: today, label: 'WRITE_ONBOARDING_FLOW',        done: false, order: 2 },
  ]);
}

export async function clearAllData() {
  await Promise.all([
    db.sessions.clear(),
    db.annualGoals.clear(),
    db.quarterlyGoals.clear(),
    db.sprints.clear(),
    db.tasks.clear(),
    db.milestones.clear(),
    db.dailyTasks.clear(),
  ]);
}
