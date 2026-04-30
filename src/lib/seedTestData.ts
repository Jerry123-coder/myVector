import { testDb } from './testDb';
import { todayStr } from './db';

const T = (dateStr: string) => new Date(dateStr).getTime();
const NOW = Date.now();

// ── Date helpers relative to April 23, 2026 ────────────
const p   = (days: number) => NOW - days * 86400000;
const ymd = (days: number) => {
  const dt = new Date(NOW + days * 86400000);
  return dt.toISOString().split('T')[0];
};

export async function seedTestData() {
  // ── Wipe testDb first ──────────────────────────────────
  await Promise.all([
    testDb.sessions.clear(),
    testDb.annualGoals.clear(),
    testDb.quarterlyGoals.clear(),
    testDb.sprints.clear(),
    testDb.tasks.clear(),
    testDb.milestones.clear(),
    testDb.dailyTasks.clear(),
    testDb.rewards.clear(),
    testDb.dailyStreaks.clear(),
  ]);

  // ══════════════════════════════════════════════════════
  //  ANNUAL GOALS (4 active across different categories)
  // ══════════════════════════════════════════════════════
  const [ag1, ag2, ag3, ag4] = await Promise.all([
    testDb.annualGoals.add({
      title: 'MASTER TYPESCRIPT & REACT ECOSYSTEM',
      description: 'Become genuinely dangerous in the modern TS/React stack. Ship real things.',
      category: 'CRAFT', year: 2026, status: 'active',
      targetDate: T('2026-12-31'), isPinned: true,
      createdAt: p(120), updatedAt: NOW,
    }),
    testDb.annualGoals.add({
      title: 'REACH $10K MONTHLY RECURRING REVENUE',
      description: 'Build and scale a SaaS product to $10K MRR. Document every step.',
      category: 'FINANCE', year: 2026, status: 'active',
      targetDate: T('2026-09-30'),
      createdAt: p(115), updatedAt: NOW,
    }),
    testDb.annualGoals.add({
      title: 'ACHIEVE PEAK PHYSICAL FORM',
      description: 'Run sub-25 min 5K, maintain 75kg, sleep 7+ hrs consistently.',
      category: 'HEALTH', year: 2026, status: 'active',
      targetDate: T('2026-12-31'),
      createdAt: p(110), updatedAt: NOW,
    }),
    testDb.annualGoals.add({
      title: 'BUILD A MEANINGFUL TECH NETWORK',
      description: 'Connect with 100 builders, speak at 2 events, grow audience to 2K.',
      category: 'SOCIAL', year: 2026, status: 'active',
      targetDate: T('2026-12-31'),
      createdAt: p(105), updatedAt: NOW,
    }),
  ]) as number[];

  // ══════════════════════════════════════════════════════
  //  QUARTERLY GOALS (Q2 2026)
  // ══════════════════════════════════════════════════════
  const [qg1, qg2, qg3, qg4] = await Promise.all([
    testDb.quarterlyGoals.add({
      title: 'LAUNCH MVP TO FIRST 100 USERS',
      quarter: 'Q2 2026', annualGoalId: ag2,
      status: 'active', targetDate: T('2026-06-30'),
      createdAt: p(90), updatedAt: NOW,
    }),
    testDb.quarterlyGoals.add({
      title: 'COMPLETE ADVANCED TYPESCRIPT COURSE',
      quarter: 'Q2 2026', annualGoalId: ag1,
      status: 'active', targetDate: T('2026-05-31'),
      createdAt: p(88), updatedAt: NOW,
    }),
    testDb.quarterlyGoals.add({
      title: 'RUN 5K UNDER 25 MINUTES',
      quarter: 'Q2 2026', annualGoalId: ag3,
      status: 'active', targetDate: T('2026-06-15'),
      createdAt: p(85), updatedAt: NOW,
    }),
    testDb.quarterlyGoals.add({
      title: 'ATTEND 3 INDUSTRY CONFERENCES',
      quarter: 'Q2 2026', annualGoalId: ag4,
      status: 'active', targetDate: T('2026-06-30'),
      createdAt: p(80), updatedAt: NOW,
    }),
  ]) as number[];

  // ══════════════════════════════════════════════════════
  //  SPRINTS — 6 × 2-week blocks across Q2 2026
  // ══════════════════════════════════════════════════════
  const [sp1, sp2, sp3, sp4, sp5, sp6] = await Promise.all([
    testDb.sprints.add({
      name: 'Q2_SPRINT_01', quarterlyGoalId: qg2, annualGoalId: ag1,
      startDate: T('2026-04-01'), endDate: T('2026-04-14'),
      status: 'done', createdAt: p(30), updatedAt: NOW,
    }),
    testDb.sprints.add({
      name: 'Q2_SPRINT_02', quarterlyGoalId: qg1, annualGoalId: ag2,
      startDate: T('2026-04-15'), endDate: T('2026-04-28'),
      status: 'active', createdAt: p(8), updatedAt: NOW,
    }),
    testDb.sprints.add({
      name: 'Q2_SPRINT_03', quarterlyGoalId: qg3, annualGoalId: ag3,
      startDate: T('2026-04-29'), endDate: T('2026-05-12'),
      status: 'planned', createdAt: p(5), updatedAt: NOW,
    }),
    testDb.sprints.add({
      name: 'Q2_SPRINT_04', quarterlyGoalId: qg1, annualGoalId: ag2,
      startDate: T('2026-05-13'), endDate: T('2026-05-26'),
      status: 'planned', createdAt: p(4), updatedAt: NOW,
    }),
    testDb.sprints.add({
      name: 'Q2_SPRINT_05', quarterlyGoalId: qg1, annualGoalId: ag2,
      startDate: T('2026-05-27'), endDate: T('2026-06-09'),
      status: 'planned', createdAt: p(3), updatedAt: NOW,
    }),
    testDb.sprints.add({
      name: 'Q2_SPRINT_06', quarterlyGoalId: qg4, annualGoalId: ag4,
      startDate: T('2026-06-10'), endDate: T('2026-06-23'),
      status: 'planned', createdAt: p(2), updatedAt: NOW,
    }),
  ]) as number[];

  // ══════════════════════════════════════════════════════
  //  TASKS — Sprint 1 (done) — all completed
  // ══════════════════════════════════════════════════════
  await testDb.tasks.bulkAdd([
    { label: 'SET UP VITE + TYPESCRIPT PROJECT', status: 'done', priority: 'HIGH', sprintId: sp1, quarterlyGoalId: qg2, annualGoalId: ag1, createdAt: T('2026-04-01'), completedAt: T('2026-04-02'), updatedAt: NOW },
    { label: 'IMPLEMENT AUTHENTICATION SYSTEM', status: 'done', priority: 'HIGH', sprintId: sp1, quarterlyGoalId: qg2, annualGoalId: ag1, createdAt: T('2026-04-02'), completedAt: T('2026-04-05'), updatedAt: NOW },
    { label: 'DESIGN DATABASE SCHEMA', status: 'done', priority: 'HIGH', sprintId: sp1, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: T('2026-04-03'), completedAt: T('2026-04-07'), updatedAt: NOW },
    { label: 'BUILD LANDING PAGE UI', status: 'done', priority: 'MED', sprintId: sp1, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: T('2026-04-07'), completedAt: T('2026-04-11'), updatedAt: NOW },
    { label: 'WRITE CORE API DOCUMENTATION', status: 'done', priority: 'LOW', sprintId: sp1, annualGoalId: ag1, createdAt: T('2026-04-08'), completedAt: T('2026-04-12'), updatedAt: NOW },
    { label: 'SET UP CI/CD PIPELINE ON VERCEL', status: 'done', priority: 'MED', sprintId: sp1, annualGoalId: ag1, createdAt: T('2026-04-09'), completedAt: T('2026-04-14'), updatedAt: NOW },
  ] as Parameters<typeof testDb.tasks.bulkAdd>[0]);

  // TASKS — Sprint 2 (active) — mix done / pending
  await testDb.tasks.bulkAdd([
    { label: 'BUILD USER DASHBOARD UI', status: 'done', priority: 'HIGH', sprintId: sp2, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: T('2026-04-15'), completedAt: T('2026-04-17'), updatedAt: NOW },
    { label: 'INTEGRATE STRIPE PAYMENT GATEWAY', status: 'done', priority: 'HIGH', sprintId: sp2, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: T('2026-04-16'), completedAt: T('2026-04-19'), updatedAt: NOW },
    { label: 'WRITE UNIT TESTS FOR API ROUTES', status: 'done', priority: 'MED', sprintId: sp2, annualGoalId: ag1, createdAt: T('2026-04-17'), completedAt: T('2026-04-20'), updatedAt: NOW },
    { label: 'IMPLEMENT EMAIL NOTIFICATIONS', status: 'pending', priority: 'MED', sprintId: sp2, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: T('2026-04-18'), updatedAt: NOW },
    { label: 'USER ACCEPTANCE TESTING ROUND 1', status: 'pending', priority: 'HIGH', sprintId: sp2, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: T('2026-04-19'), updatedAt: NOW },
    { label: 'PERFORMANCE OPTIMIZATION PASS', status: 'pending', priority: 'LOW', sprintId: sp2, annualGoalId: ag1, createdAt: T('2026-04-20'), updatedAt: NOW },
    { label: 'BETA ONBOARDING COMMUNICATIONS', status: 'pending', priority: 'MED', sprintId: sp2, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: T('2026-04-21'), updatedAt: NOW },
  ] as Parameters<typeof testDb.tasks.bulkAdd>[0]);

  // TASKS — Sprint 3 (planned — health focus)
  await testDb.tasks.bulkAdd([
    { label: 'TRAINING RUN — 5K PACE INTERVALS', status: 'pending', priority: 'HIGH', sprintId: sp3, quarterlyGoalId: qg3, annualGoalId: ag3, createdAt: NOW, updatedAt: NOW },
    { label: 'REVAMP NUTRITION PLAN FOR RACE PREP', status: 'pending', priority: 'MED', sprintId: sp3, quarterlyGoalId: qg3, annualGoalId: ag3, createdAt: NOW, updatedAt: NOW },
    { label: 'WEEKLY STRENGTH TRAINING SESSION x3', status: 'pending', priority: 'MED', sprintId: sp3, quarterlyGoalId: qg3, annualGoalId: ag3, createdAt: NOW, updatedAt: NOW },
    { label: 'TIMED 5K TRIAL RUN', status: 'pending', priority: 'HIGH', sprintId: sp3, quarterlyGoalId: qg3, annualGoalId: ag3, createdAt: NOW, updatedAt: NOW },
  ] as Parameters<typeof testDb.tasks.bulkAdd>[0]);

  // TASKS — Sprint 4 (planned — product)
  await testDb.tasks.bulkAdd([
    { label: 'SOFT LAUNCH BETA TO 100 USERS', status: 'pending', priority: 'HIGH', sprintId: sp4, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: NOW, updatedAt: NOW },
    { label: 'COLLECT AND ANALYZE BETA FEEDBACK', status: 'pending', priority: 'HIGH', sprintId: sp4, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: NOW, updatedAt: NOW },
    { label: 'ITERATE ON TOP 3 USER PAIN POINTS', status: 'pending', priority: 'HIGH', sprintId: sp4, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: NOW, updatedAt: NOW },
    { label: 'SET UP ANALYTICS DASHBOARD', status: 'pending', priority: 'MED', sprintId: sp4, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: NOW, updatedAt: NOW },
  ] as Parameters<typeof testDb.tasks.bulkAdd>[0]);

  // TASKS — Sprint 5 (planned — scale)
  await testDb.tasks.bulkAdd([
    { label: 'LAUNCH AFFILIATE / REFERRAL PROGRAM', status: 'pending', priority: 'HIGH', sprintId: sp5, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: NOW, updatedAt: NOW },
    { label: 'PUBLISH 4 SEO CONTENT PIECES', status: 'pending', priority: 'MED', sprintId: sp5, annualGoalId: ag2, createdAt: NOW, updatedAt: NOW },
    { label: 'RUN FIRST PAID AD EXPERIMENT', status: 'pending', priority: 'MED', sprintId: sp5, quarterlyGoalId: qg1, annualGoalId: ag2, createdAt: NOW, updatedAt: NOW },
  ] as Parameters<typeof testDb.tasks.bulkAdd>[0]);

  // TASKS — Sprint 6 (planned — network)
  await testDb.tasks.bulkAdd([
    { label: 'ATTEND NODECONF 2026', status: 'pending', priority: 'MED', sprintId: sp6, quarterlyGoalId: qg4, annualGoalId: ag4, createdAt: NOW, updatedAt: NOW },
    { label: 'SPEAK AT LOCAL JS MEETUP', status: 'pending', priority: 'HIGH', sprintId: sp6, quarterlyGoalId: qg4, annualGoalId: ag4, createdAt: NOW, updatedAt: NOW },
    { label: 'HOST FOUNDER DINNER — INVITE 6 PEOPLE', status: 'pending', priority: 'MED', sprintId: sp6, quarterlyGoalId: qg4, annualGoalId: ag4, createdAt: NOW, updatedAt: NOW },
  ] as Parameters<typeof testDb.tasks.bulkAdd>[0]);

  // ── Annual goal tasks (not sprint-bound — long-horizon) ──
  await testDb.tasks.bulkAdd([
    // CRAFT
    { label: 'COMPLETE TYPESCRIPT GENERICS MODULE', status: 'done', priority: 'HIGH', annualGoalId: ag1, createdAt: p(90), completedAt: p(60), updatedAt: NOW },
    { label: 'COMPLETE REACT PATTERNS DEEP DIVE', status: 'done', priority: 'HIGH', annualGoalId: ag1, createdAt: p(80), completedAt: p(50), updatedAt: NOW },
    { label: 'BUILD 3 PORTFOLIO SHOWCASE PROJECTS', status: 'done', priority: 'HIGH', annualGoalId: ag1, createdAt: p(70), completedAt: p(30), updatedAt: NOW },
    { label: 'CONTRIBUTE TO OPEN SOURCE REPO', status: 'pending', priority: 'MED', annualGoalId: ag1, createdAt: p(20), updatedAt: NOW },
    { label: 'PUBLISH TECHNICAL BLOG — 12 POSTS', status: 'pending', priority: 'LOW', annualGoalId: ag1, createdAt: p(15), updatedAt: NOW },
    // FINANCE
    { label: 'DEFINE PRICING STRATEGY', status: 'done', priority: 'HIGH', annualGoalId: ag2, createdAt: p(85), completedAt: p(70), updatedAt: NOW },
    { label: 'BUILD EMAIL LIST TO 1000 SUBSCRIBERS', status: 'done', priority: 'MED', annualGoalId: ag2, createdAt: p(80), completedAt: p(40), updatedAt: NOW },
    { label: 'LAUNCH FIRST SAAS PRODUCT', status: 'pending', priority: 'HIGH', annualGoalId: ag2, createdAt: p(60), updatedAt: NOW },
    // HEALTH
    { label: 'RUN FIRST HALF MARATHON', status: 'done', priority: 'HIGH', annualGoalId: ag3, createdAt: p(100), completedAt: p(25), updatedAt: NOW },
    { label: 'LOSE 8KG BODY WEIGHT — PHASE 1', status: 'done', priority: 'HIGH', annualGoalId: ag3, createdAt: p(100), completedAt: p(12), updatedAt: NOW },
    { label: 'MAINTAIN CONSISTENT SLEEP SCHEDULE', status: 'pending', priority: 'MED', annualGoalId: ag3, createdAt: p(30), updatedAt: NOW },
    // SOCIAL
    { label: 'JOIN 2 PROFESSIONAL COMMUNITIES', status: 'done', priority: 'MED', annualGoalId: ag4, createdAt: p(95), completedAt: p(68), updatedAt: NOW },
    { label: 'GROW TWITTER TO 500 FOLLOWERS', status: 'done', priority: 'MED', annualGoalId: ag4, createdAt: p(90), completedAt: p(18), updatedAt: NOW },
    { label: 'COLD OUTREACH TO 20 FOUNDERS', status: 'pending', priority: 'HIGH', annualGoalId: ag4, createdAt: p(25), updatedAt: NOW },
    { label: 'LAUNCH WEEKLY NEWSLETTER', status: 'pending', priority: 'LOW', annualGoalId: ag4, createdAt: p(15), updatedAt: NOW },
  ] as Parameters<typeof testDb.tasks.bulkAdd>[0]);

  // ══════════════════════════════════════════════════════
  //  DAILY TASKS — Today + past 3 days
  // ══════════════════════════════════════════════════════
  const today = todayStr();
  const days = [-3, -2, -1, 0];
  for (const offset of days) {
    const date = ymd(offset);
    const isToday = offset === 0;
    if (!isToday) {
      // Past days — all done (to build streak)
      await testDb.dailyTasks.bulkAdd([
        { date, label: 'Deep work session — core feature dev', category: 'deep-work', done: true, order: 0, updatedAt: NOW },
        { date, label: 'Code review + pull request feedback', category: 'deep-work', done: true, order: 1, updatedAt: NOW },
        { date, label: 'Morning 5K run or gym session', category: 'deep-work', done: true, order: 2, updatedAt: NOW },
        { date, label: 'Daily standup & async updates', category: 'admin', done: true, order: 3, updatedAt: NOW },
        { date, label: 'Clear inbox & reply priority emails', category: 'admin', done: true, order: 4, updatedAt: NOW },
      ] as Parameters<typeof testDb.dailyTasks.bulkAdd>[0]);
    } else {
      // Today — partial
      await testDb.dailyTasks.bulkAdd([
        { date: today, label: 'Email notification system implementation', category: 'deep-work', done: true, order: 0, updatedAt: NOW },
        { date: today, label: 'Review and merge open PRs', category: 'deep-work', done: true, order: 1, updatedAt: NOW },
        { date: today, label: 'Write daily standup + async notes', category: 'admin', done: true, order: 2, updatedAt: NOW },
        { date: today, label: 'Research competitor pricing models', category: 'deep-work', done: false, order: 3, updatedAt: NOW },
        { date: today, label: 'Evening tempo run — 50 min', category: 'deep-work', done: false, order: 4, updatedAt: NOW },
        { date: today, label: 'Reply to investor update emails', category: 'admin', done: false, order: 5, updatedAt: NOW },
      ] as Parameters<typeof testDb.dailyTasks.bulkAdd>[0]);
    }
  }

  // ══════════════════════════════════════════════════════
  //  DAILY STREAKS — 7-day streak built up
  // ══════════════════════════════════════════════════════
  for (let i = 1; i <= 7; i++) {
    const date = ymd(-i);
    await testDb.dailyStreaks.add({ date, allDone: true, updatedAt: NOW });
  }

  // ══════════════════════════════════════════════════════
  //  MILESTONES
  // ══════════════════════════════════════════════════════
  await testDb.milestones.bulkAdd([
    { title: 'MVP SHIPPED TO FIRST USER', targetDate: T('2026-04-30'), annualGoalId: ag2, quarterlyGoalId: qg1, sprintId: sp2, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
    { title: 'TYPESCRIPT COURSE COMPLETION CERT', targetDate: T('2026-05-15'), annualGoalId: ag1, quarterlyGoalId: qg2, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
    { title: 'FIRST $1K REVENUE MONTH', targetDate: T('2026-05-31'), annualGoalId: ag2, quarterlyGoalId: qg1, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
    { title: 'SUB-25 MIN 5K ACHIEVED', targetDate: T('2026-06-15'), annualGoalId: ag3, quarterlyGoalId: qg3, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
    { title: 'PRODUCT HUNT LAUNCH DAY', targetDate: T('2026-06-01'), annualGoalId: ag2, quarterlyGoalId: qg1, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
    { title: 'NODECONF TALK — DELIVERED', targetDate: T('2026-06-18'), annualGoalId: ag4, quarterlyGoalId: qg4, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
    { title: 'HALF MARATHON COMPLETED — 2:05', targetDate: p(25), annualGoalId: ag3, status: 'done', createdAt: p(100), updatedAt: p(25) },
    { title: 'INFRASTRUCTURE AUDIT COMPLETE', targetDate: p(12), annualGoalId: ag1, quarterlyGoalId: qg2, status: 'done', createdAt: p(40), updatedAt: p(12) },
  ] as Parameters<typeof testDb.milestones.bulkAdd>[0]);

  // ══════════════════════════════════════════════════════
  //  FOCUS SESSIONS (past performance data)
  // ══════════════════════════════════════════════════════
  const sessions = [
    { ago: 1, mins: 50, label: 'Email notification system implementation' },
    { ago: 1, mins: 30, label: 'Code review + pull request feedback' },
    { ago: 2, mins: 90, label: 'Build user dashboard UI — deep session' },
    { ago: 2, mins: 25, label: 'Daily standup & async updates' },
    { ago: 3, mins: 60, label: 'Stripe payment gateway integration' },
    { ago: 3, mins: 45, label: 'Write unit tests for API routes' },
    { ago: 4, mins: 90, label: 'Build user dashboard UI — deep session' },
    { ago: 5, mins: 30, label: 'Design database schema' },
    { ago: 5, mins: 60, label: 'Implement authentication system' },
    { ago: 6, mins: 45, label: 'Set up Vite + TypeScript project' },
    { ago: 7, mins: 55, label: 'CI/CD pipeline on Vercel' },
  ];
  for (const s of sessions) {
    const completedAt = p(s.ago) + 14 * 3600000;
    const secs = s.mins * 60;
    await testDb.sessions.add({
      type: 'focus' as const,
      startTime: completedAt - secs * 1000,
      endTime: completedAt,
      durationSecs: secs,
      actualSecs: secs,
      taskLabel: s.label,
      completedAt,
      updatedAt: NOW,
    });
  }

  // ══════════════════════════════════════════════════════
  //  REWARDS BANK
  // ══════════════════════════════════════════════════════
  await testDb.rewards.bulkAdd([
    { title: 'New Fragrance Purchase', description: 'Treat yourself to that new Sauvage bottle.', icon: '🧴', isUserDefined: false, isUnlocked: true, unlockedAt: p(25), requiredXp: 50, createdAt: p(90), updatedAt: NOW },
    { title: 'New Sneakers', description: 'Reward for the half marathon milestone.', icon: '👟', isUserDefined: true, isUnlocked: true, unlockedAt: p(12), requiredXp: 150, createdAt: p(100), updatedAt: NOW },
    { title: 'Fine Dining Experience', description: 'Premium restaurant — celebrate the $1K milestone.', icon: '🍽️', isUserDefined: false, isUnlocked: false, requiredXp: 300, createdAt: NOW, updatedAt: NOW },
    { title: 'Gear Upgrade', description: 'Mechanical keyboard or monitor upgrade.', icon: '🖥️', isUserDefined: false, isUnlocked: false, requiredXp: 500, createdAt: NOW, updatedAt: NOW },
    { title: 'Day Off — Zero Guilt', description: 'A complete detox day. Fully earned.', icon: '🌅', isUserDefined: false, isUnlocked: false, requiredXp: 750, createdAt: NOW, updatedAt: NOW },
    { title: 'Weekend Getaway', description: 'Airbnb trip — celebrate $5K MRR.', icon: '✈️', isUserDefined: true, isUnlocked: false, requiredXp: 1000, createdAt: NOW, updatedAt: NOW },
  ] as Parameters<typeof testDb.rewards.bulkAdd>[0]);
}

export async function clearTestData() {
  await Promise.all([
    testDb.sessions.clear(),
    testDb.annualGoals.clear(),
    testDb.quarterlyGoals.clear(),
    testDb.sprints.clear(),
    testDb.tasks.clear(),
    testDb.milestones.clear(),
    testDb.dailyTasks.clear(),
    testDb.rewards.clear(),
    testDb.dailyStreaks.clear(),
  ]);
}
