# MyVector // Kinetic Command Center

![Version](https://img.shields.io/badge/Version-1.2.0--stable-00dbe9?style=for-the-badge&labelColor=0b0e12)
![License](https://img.shields.io/badge/Protocol-Proprietary-00e475?style=for-the-badge&labelColor=0b0e12)

**MyVector** (formerly Vector OS) is a high-performance, immersive productivity application designed to eliminate friction from personal growth. Built with a "Systems-First" philosophy, it transforms abstract goals into linear, tactical execution.

---

## ⚡ Core Systems

### 1. The Directive Hub (Goals v2)
A tiered hierarchy for master-level planning and tactical execution.
- **Master Directives**: Track annual macro-objectives with progress rings and "Victory Glow" trophy status.
- **Tactical Targets**: Manage quarterly focus windows with a streamlined grid layout.
- **Goal Dashboards**: Full-screen, deep-dive views for managing specific directive timelines and milestones.

### 2. The Focus Engine
A distraction-free terminal for high-intensity work sessions.
- **Kinetic Timer**: 25/5 POMODORO logic with state-of-the-art visual feedback.
- **Tactical Strips**: Check off goal-linked tasks directly within the focus environment.
- **System Integration**: Automatically links recorded sessions to their respective directives.

### 3. Velocity Metrics
Real-time diagnostics of your operational output.
- **Trajectory Tracking**: Visual progress bars and completion percentages across all levels.
- **Day Tracker**: A chronological timeline of your recent activity and output consistency.

### 4. Cloud Integration
Seamless synchronization across all operative terminals.
- **Dexie/IndexedDB**: Local-first architecture ensures 100% availability, even offline.
- **Supabase Orthogonality**: Real-time cloud sync and hardened authentication protocols.

---

## 🛠 Technical Architecture

- **Core**: React 19 + TypeScript 6.0
- **Build Engine**: Vite 8.0
- **Styling**: Tailwind CSS 4.0 (Vanilla CSS Architecture)
- **Database**: Dexie.js (IndexedDB) with Supabase Cloud Integration
- **State**: Zustand (Operational Stats) + useLiveQuery (Reactive UI)

---

## 🚀 Initialization

To boot the system in your local environment:

1. **Clone the terminal**:
   ```bash
   git clone [repository-url]
   cd myVector
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize Environment**:
   Create a `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```

4. **Boot System**:
   ```bash
   npm run dev
   ```

---

## 📡 System Status: v1.2.0 // STABLE
Maintain focus. Execute directives. Outperform yourself.

*Vector OS is an operational tool for high-performance individuals.*
