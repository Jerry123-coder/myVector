import { db, todayStr } from './db';

const T = (dateStr: string) => new Date(dateStr).getTime();
const NOW = Date.now();

// ── Date helpers ────────────
const p   = (days: number) => NOW - days * 86400000;
const ymd = (days: number) => {
  const dt = new Date(NOW + days * 86400000);
  return dt.toISOString().split('T')[0];
};

export async function seedDemoData() {
  // ── Wipe db first ──────────────────────────────────
  await Promise.all([
    db.sessions.clear(),
    db.annualGoals.clear(),
    db.quarterlyGoals.clear(),
    db.sprints.clear(),
    db.tasks.clear(),
    db.milestones.clear(),
    db.dailyTasks.clear(),
    db.rewards.clear(),
    db.dailyStreaks.clear(),
    db.multiYearGoals.clear(),
  ]);

  const year3 = new Date().getFullYear() + 3;
  const year5 = new Date().getFullYear() + 5;

  // ══════════════════════════════════════════════════════
  //  MULTI YEAR GOALS (All categories)
  // ══════════════════════════════════════════════════════
  const [myCraft, myFinance, myHealth, mySocial, myCharacter, myOther] = await Promise.all([
    db.multiYearGoals.add({
      title: 'BECOME A PRINCIPAL ENGINEER & THOUGHT LEADER',
      description: 'Lead major architectural decisions in a top-tier tech company while maintaining a large, active technical following.',
      targetAchievement: 'Principal Engineer title. 50k+ audience. Published 1 technical book.',
      category: 'CRAFT', targetYear: year3, status: 'active',
      createdAt: p(150), updatedAt: NOW,
    }),
    db.multiYearGoals.add({
      title: 'FINANCIAL INDEPENDENCE (FIRE BASELINE)',
      description: 'Build enough passive and semi-passive income to cover all base living expenses indefinitely.',
      targetAchievement: '$1M Net Worth. $5k/mo passive income from SaaS/Investments.',
      category: 'FINANCE', targetYear: year5, status: 'active',
      createdAt: p(160), updatedAt: NOW,
    }),
    db.multiYearGoals.add({
      title: 'IRONMAN TRIATHLON COMPLETION',
      description: 'Push physical boundaries by completing a full Ironman.',
      targetAchievement: 'Finish Ironman under 13 hours. Maintain sub-15% body fat.',
      category: 'HEALTH', targetYear: year3, status: 'active',
      createdAt: p(140), updatedAt: NOW,
    }),
    db.multiYearGoals.add({
      title: 'WORLDWIDE NETWORK OF 1000 BUILDERS',
      description: 'Build deep, mutually beneficial relationships with elite operators globally.',
      targetAchievement: 'Active rolodex of 1000+ founders/engineers. Host an annual retreat.',
      category: 'SOCIAL', targetYear: year5, status: 'active',
      createdAt: p(130), updatedAt: NOW,
    }),
    db.multiYearGoals.add({
      title: 'BECOME A PUBLISHED AUTHOR & SPEAKER',
      description: 'Codify knowledge and articulate it through long-form essays and keynote speeches.',
      targetAchievement: 'Publish 1 philosophical tech book. Deliver 5 keynotes.',
      category: 'CHARACTER', targetYear: year3, status: 'active',
      createdAt: p(120), updatedAt: NOW,
    }),
    db.multiYearGoals.add({
      title: 'BUILD A SUSTAINABLE OFF-GRID HOMESTEAD',
      description: 'Establish a self-reliant sanctuary away from urban noise.',
      targetAchievement: 'Own 5+ acres. Fully solar powered. High-speed satellite internet.',
      category: 'OTHER', targetYear: year5, status: 'active',
      createdAt: p(110), updatedAt: NOW,
    }),
  ]) as number[];

  // ══════════════════════════════════════════════════════
  //  ANNUAL GOALS (Cascading from Multi-Year)
  // ══════════════════════════════════════════════════════
  const [agCraft, agFinance, agHealth, agSocial, agCharacter, agOther] = await Promise.all([
    db.annualGoals.add({
      title: 'MASTER TYPESCRIPT & REACT ECOSYSTEM',
      description: 'Become genuinely dangerous in the modern TS/React stack. Ship real things.',
      category: 'CRAFT', year: new Date().getFullYear(), status: 'active',
      targetDate: T(`${new Date().getFullYear()}-12-31`), isPinned: true, multiYearGoalId: myCraft,
      createdAt: p(120), updatedAt: NOW,
    }),
    db.annualGoals.add({
      title: 'REACH $10K MONTHLY RECURRING REVENUE',
      description: 'Build and scale a SaaS product to $10K MRR. Document every step.',
      category: 'FINANCE', year: new Date().getFullYear(), status: 'active', multiYearGoalId: myFinance,
      targetDate: T(`${new Date().getFullYear()}-09-30`),
      createdAt: p(115), updatedAt: NOW,
    }),
    db.annualGoals.add({
      title: 'ACHIEVE PEAK PHYSICAL FORM',
      description: 'Run sub-25 min 5K, maintain 75kg, sleep 7+ hrs consistently.',
      category: 'HEALTH', year: new Date().getFullYear(), status: 'active', multiYearGoalId: myHealth,
      targetDate: T(`${new Date().getFullYear()}-12-31`),
      createdAt: p(110), updatedAt: NOW,
    }),
    db.annualGoals.add({
      title: 'BUILD A MEANINGFUL TECH NETWORK',
      description: 'Connect with 100 builders, speak at 2 events, grow audience to 2K.',
      category: 'SOCIAL', year: new Date().getFullYear(), status: 'active', multiYearGoalId: mySocial,
      targetDate: T(`${new Date().getFullYear()}-12-31`),
      createdAt: p(105), updatedAt: NOW,
    }),
    db.annualGoals.add({
      title: 'CULTIVATE DAILY WRITING & STOIC PRACTICE',
      description: 'Journal daily, meditate, and write 30 essays on applied stoicism in tech.',
      category: 'CHARACTER', year: new Date().getFullYear(), status: 'active', multiYearGoalId: myCharacter,
      targetDate: T(`${new Date().getFullYear()}-12-31`),
      createdAt: p(100), updatedAt: NOW,
    }),
    db.annualGoals.add({
      title: 'COMPLETE ARCHITECTURAL PLANS & ACQUIRE LAND',
      description: 'Finalize rural property acquisition and off-grid blueprints.',
      category: 'OTHER', year: new Date().getFullYear(), status: 'active', multiYearGoalId: myOther,
      targetDate: T(`${new Date().getFullYear()}-12-31`),
      createdAt: p(95), updatedAt: NOW,
    }),
  ]) as number[];

  // ══════════════════════════════════════════════════════
  //  QUARTERLY GOALS (Cascading from Annual)
  // ══════════════════════════════════════════════════════
  const currentQ = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`;
  const endOfQ = new Date(new Date().getFullYear(), (Math.floor(new Date().getMonth() / 3) + 1) * 3, 0).getTime();

  const [qgCraft, qgFinance, qgHealth, qgSocial, qgCharacter, qgOther] = await Promise.all([
    db.quarterlyGoals.add({
      title: 'LAUNCH MVP TO FIRST 100 USERS',
      quarter: currentQ, annualGoalId: agCraft,
      status: 'active', targetDate: endOfQ,
      createdAt: p(90), updatedAt: NOW,
    }),
    db.quarterlyGoals.add({
      title: 'BUILD CORE PAYMENT INFRASTRUCTURE',
      quarter: currentQ, annualGoalId: agFinance,
      status: 'active', targetDate: endOfQ,
      createdAt: p(88), updatedAt: NOW,
    }),
    db.quarterlyGoals.add({
      title: 'RUN 5K UNDER 25 MINUTES',
      quarter: currentQ, annualGoalId: agHealth,
      status: 'active', targetDate: endOfQ,
      createdAt: p(85), updatedAt: NOW,
    }),
    db.quarterlyGoals.add({
      title: 'ATTEND 3 INDUSTRY CONFERENCES',
      quarter: currentQ, annualGoalId: agSocial,
      status: 'active', targetDate: endOfQ,
      createdAt: p(80), updatedAt: NOW,
    }),
    db.quarterlyGoals.add({
      title: 'PUBLISH 10 ESSAYS ON SUBSTACK',
      quarter: currentQ, annualGoalId: agCharacter,
      status: 'active', targetDate: endOfQ,
      createdAt: p(75), updatedAt: NOW,
    }),
    db.quarterlyGoals.add({
      title: 'FINALIZE PROPERTY RESEARCH & BUDGETING',
      quarter: currentQ, annualGoalId: agOther,
      status: 'active', targetDate: endOfQ,
      createdAt: p(70), updatedAt: NOW,
    }),
  ]) as number[];

  // ══════════════════════════════════════════════════════
  //  SPRINTS — Linking to Quarterly Goals
  // ══════════════════════════════════════════════════════
  const [spCraft1, spFinance1, spHealth1, spSocial1, spCharacter1, spOther1] = await Promise.all([
    db.sprints.add({
      name: 'SPRINT_CRAFT_01', quarterlyGoalId: qgCraft, annualGoalId: agCraft,
      objective: 'Ship Core Authentication & Database Schema',
      startDate: p(14), endDate: p(0),
      status: 'active', createdAt: p(14), updatedAt: NOW,
    }),
    db.sprints.add({
      name: 'SPRINT_FINANCE_01', quarterlyGoalId: qgFinance, annualGoalId: agFinance,
      objective: 'Integrate Stripe and define pricing tiers',
      startDate: p(14), endDate: p(0),
      status: 'active', createdAt: p(14), updatedAt: NOW,
    }),
    db.sprints.add({
      name: 'SPRINT_HEALTH_01', quarterlyGoalId: qgHealth, annualGoalId: agHealth,
      objective: 'Complete Phase 1 Interval Training Block',
      startDate: p(14), endDate: p(0),
      status: 'active', createdAt: p(14), updatedAt: NOW,
    }),
    db.sprints.add({
      name: 'SPRINT_SOCIAL_01', quarterlyGoalId: qgSocial, annualGoalId: agSocial,
      objective: 'Prep & Deliver Lightning Talk at JS Meetup',
      startDate: p(14), endDate: p(0),
      status: 'active', createdAt: p(14), updatedAt: NOW,
    }),
    db.sprints.add({
      name: 'SPRINT_CHAR_01', quarterlyGoalId: qgCharacter, annualGoalId: agCharacter,
      objective: 'Draft and edit 3 essays on resilience',
      startDate: p(14), endDate: p(0),
      status: 'active', createdAt: p(14), updatedAt: NOW,
    }),
    db.sprints.add({
      name: 'SPRINT_OTHER_01', quarterlyGoalId: qgOther, annualGoalId: agOther,
      objective: 'Tour 5 potential rural properties',
      startDate: p(14), endDate: p(0),
      status: 'active', createdAt: p(14), updatedAt: NOW,
    }),
  ]) as number[];

  // ══════════════════════════════════════════════════════
  //  TASKS — Cascading from Sprints
  // ══════════════════════════════════════════════════════
  await db.tasks.bulkAdd([
    // CRAFT Tasks
    { label: 'SET UP VITE + TYPESCRIPT PROJECT', status: 'done', priority: 'HIGH', sprintId: spCraft1, quarterlyGoalId: qgCraft, annualGoalId: agCraft, createdAt: p(8), completedAt: p(7), updatedAt: NOW },
    { label: 'IMPLEMENT SUPABASE AUTHENTICATION', status: 'pending', priority: 'HIGH', sprintId: spCraft1, quarterlyGoalId: qgCraft, annualGoalId: agCraft, createdAt: p(6), updatedAt: NOW },
    { label: 'DESIGN DATABASE SCHEMA FOR USERS', status: 'pending', priority: 'MED', sprintId: spCraft1, quarterlyGoalId: qgCraft, annualGoalId: agCraft, createdAt: p(6), updatedAt: NOW },
    
    // FINANCE Tasks
    { label: 'REGISTER STRIPE ACCOUNT & API KEYS', status: 'done', priority: 'HIGH', sprintId: spFinance1, quarterlyGoalId: qgFinance, annualGoalId: agFinance, createdAt: p(8), completedAt: p(7), updatedAt: NOW },
    { label: 'BUILD PRICING TIER UI COMPONENT', status: 'pending', priority: 'MED', sprintId: spFinance1, quarterlyGoalId: qgFinance, annualGoalId: agFinance, createdAt: p(7), updatedAt: NOW },
    { label: 'IMPLEMENT STRIPE CHECKOUT SESSION', status: 'pending', priority: 'HIGH', sprintId: spFinance1, quarterlyGoalId: qgFinance, annualGoalId: agFinance, createdAt: p(6), updatedAt: NOW },

    // HEALTH Tasks
    { label: 'TRAINING RUN — 5K PACE INTERVALS', status: 'done', priority: 'HIGH', sprintId: spHealth1, quarterlyGoalId: qgHealth, annualGoalId: agHealth, createdAt: p(8), completedAt: p(6), updatedAt: NOW },
    { label: 'REST DAY & ACTIVE RECOVERY YOGA', status: 'pending', priority: 'LOW', sprintId: spHealth1, quarterlyGoalId: qgHealth, annualGoalId: agHealth, createdAt: p(6), updatedAt: NOW },
    { label: 'WEEKLY STRENGTH TRAINING SESSION', status: 'pending', priority: 'MED', sprintId: spHealth1, quarterlyGoalId: qgHealth, annualGoalId: agHealth, createdAt: p(6), updatedAt: NOW },

    // SOCIAL Tasks
    { label: 'OUTLINE LIGHTNING TALK SLIDES', status: 'done', priority: 'HIGH', sprintId: spSocial1, quarterlyGoalId: qgSocial, annualGoalId: agSocial, createdAt: p(8), completedAt: p(7), updatedAt: NOW },
    { label: 'REHEARSE TALK 3 TIMES', status: 'pending', priority: 'HIGH', sprintId: spSocial1, quarterlyGoalId: qgSocial, annualGoalId: agSocial, createdAt: p(7), updatedAt: NOW },
    { label: 'RSVP TO FOUNDERS MIXER EVENT', status: 'pending', priority: 'MED', sprintId: spSocial1, quarterlyGoalId: qgSocial, annualGoalId: agSocial, createdAt: p(7), updatedAt: NOW },

    // CHARACTER Tasks
    { label: 'DRAFT ESSAY ON "THE OBSTACLE IS THE WAY"', status: 'done', priority: 'HIGH', sprintId: spCharacter1, quarterlyGoalId: qgCharacter, annualGoalId: agCharacter, createdAt: p(8), completedAt: p(6), updatedAt: NOW },
    { label: 'EDIT AND POLISH ESSAY 1', status: 'pending', priority: 'MED', sprintId: spCharacter1, quarterlyGoalId: qgCharacter, annualGoalId: agCharacter, createdAt: p(6), updatedAt: NOW },
    { label: 'BRAINSTORM TOPICS FOR ESSAY 2', status: 'pending', priority: 'LOW', sprintId: spCharacter1, quarterlyGoalId: qgCharacter, annualGoalId: agCharacter, createdAt: p(6), updatedAt: NOW },

    // OTHER Tasks
    { label: 'CONTACT REAL ESTATE AGENT IN AREA', status: 'done', priority: 'HIGH', sprintId: spOther1, quarterlyGoalId: qgOther, annualGoalId: agOther, createdAt: p(8), completedAt: p(7), updatedAt: NOW },
    { label: 'REVIEW ZONING LAWS FOR OFF-GRID SOLAR', status: 'pending', priority: 'HIGH', sprintId: spOther1, quarterlyGoalId: qgOther, annualGoalId: agOther, createdAt: p(7), updatedAt: NOW },
    { label: 'SCHEDULE PROPERTY VIEWINGS FOR WEEKEND', status: 'pending', priority: 'MED', sprintId: spOther1, quarterlyGoalId: qgOther, annualGoalId: agOther, createdAt: p(6), updatedAt: NOW },
  ] as Parameters<typeof db.tasks.bulkAdd>[0]);

  // ══════════════════════════════════════════════════════
  //  DAILY TASKS — Today + past 3 days
  // ══════════════════════════════════════════════════════
  const today = todayStr();
  const days = [-3, -2, -1, 0];
  for (const offset of days) {
    const date = ymd(offset);
    const isToday = offset === 0;
    if (!isToday) {
      await db.dailyTasks.bulkAdd([
        { date, label: 'Deep work session — core feature dev', category: 'deep-work', done: true, order: 0, updatedAt: NOW },
        { date, label: 'Code review + pull request feedback', category: 'deep-work', done: true, order: 1, updatedAt: NOW },
        { date, label: 'Morning 5K run or gym session', category: 'deep-work', done: true, order: 2, updatedAt: NOW },
        { date, label: 'Daily standup & async updates', category: 'admin', done: true, order: 3, updatedAt: NOW },
        { date, label: 'Clear inbox & reply priority emails', category: 'admin', done: true, order: 4, updatedAt: NOW },
      ] as Parameters<typeof db.dailyTasks.bulkAdd>[0]);
    } else {
      await db.dailyTasks.bulkAdd([
        { date: today, label: 'Implement Supabase Authentication', category: 'deep-work', done: true, order: 0, updatedAt: NOW },
        { date: today, label: 'Rehearse lightning talk', category: 'deep-work', done: true, order: 1, updatedAt: NOW },
        { date: today, label: 'Write daily standup + async notes', category: 'admin', done: true, order: 2, updatedAt: NOW },
        { date: today, label: 'Research competitor pricing models', category: 'deep-work', done: false, order: 3, updatedAt: NOW },
        { date: today, label: 'Evening tempo run — 50 min', category: 'deep-work', done: false, order: 4, updatedAt: NOW },
        { date: today, label: 'Reply to investor update emails', category: 'admin', done: false, order: 5, updatedAt: NOW },
      ] as Parameters<typeof db.dailyTasks.bulkAdd>[0]);
    }
  }

  // ══════════════════════════════════════════════════════
  //  DAILY STREAKS
  // ══════════════════════════════════════════════════════
  for (let i = 1; i <= 7; i++) {
    const date = ymd(-i);
    await db.dailyStreaks.add({ date, allDone: true, updatedAt: NOW });
  }

  // ══════════════════════════════════════════════════════
  //  MILESTONES
  // ══════════════════════════════════════════════════════
  await db.milestones.bulkAdd([
    { title: 'MVP SHIPPED TO FIRST USER', targetDate: endOfQ, annualGoalId: agCraft, quarterlyGoalId: qgCraft, sprintId: spCraft1, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
    { title: 'FIRST $1K REVENUE MONTH', targetDate: endOfQ, annualGoalId: agFinance, quarterlyGoalId: qgFinance, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
    { title: 'SUB-25 MIN 5K ACHIEVED', targetDate: endOfQ, annualGoalId: agHealth, quarterlyGoalId: qgHealth, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
    { title: 'LIGHTNING TALK DELIVERED', targetDate: endOfQ, annualGoalId: agSocial, quarterlyGoalId: qgSocial, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
    { title: '5 ESSAYS PUBLISHED', targetDate: endOfQ, annualGoalId: agCharacter, quarterlyGoalId: qgCharacter, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
    { title: 'LAND ACQUISITION CONTRACT SIGNED', targetDate: endOfQ, annualGoalId: agOther, quarterlyGoalId: qgOther, status: 'upcoming', createdAt: NOW, updatedAt: NOW },
  ] as Parameters<typeof db.milestones.bulkAdd>[0]);

  // ══════════════════════════════════════════════════════
  //  FOCUS SESSIONS
  // ══════════════════════════════════════════════════════
  const sessions = [
    { ago: 1, mins: 50, label: 'Email notification system implementation' },
    { ago: 1, mins: 30, label: 'Code review + pull request feedback' },
    { ago: 2, mins: 90, label: 'Build user dashboard UI — deep session' },
    { ago: 2, mins: 25, label: 'Daily standup & async updates' },
    { ago: 3, mins: 60, label: 'Stripe payment gateway integration' },
  ];
  for (const s of sessions) {
    const completedAt = p(s.ago) + 14 * 3600000;
    const secs = s.mins * 60;
    await db.sessions.add({
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
  await db.rewards.bulkAdd([
    { title: 'New Fragrance Purchase', description: 'Treat yourself to that new Sauvage bottle.', icon: '🧴', isUserDefined: false, isUnlocked: true, unlockedAt: p(25), requiredXp: 50, createdAt: p(90), updatedAt: NOW },
    { title: 'New Sneakers', description: 'Reward for the half marathon milestone.', icon: '👟', isUserDefined: true, isUnlocked: true, unlockedAt: p(12), requiredXp: 150, createdAt: p(100), updatedAt: NOW },
    { title: 'Fine Dining Experience', description: 'Premium restaurant — celebrate the $1K milestone.', icon: '🍽️', isUserDefined: false, isUnlocked: false, requiredXp: 300, createdAt: NOW, updatedAt: NOW },
    { title: 'Weekend Getaway', description: 'Airbnb trip — celebrate $5K MRR.', icon: '✈️', isUserDefined: true, isUnlocked: false, requiredXp: 1000, createdAt: NOW, updatedAt: NOW },
  ] as Parameters<typeof db.rewards.bulkAdd>[0]);
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
    db.rewards.clear(),
    db.dailyStreaks.clear(),
    db.multiYearGoals.clear(),
  ]);
}
