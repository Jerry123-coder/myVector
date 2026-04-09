import { useState } from 'react';
import { TopNavBar } from './components/layout/TopNavBar';
import { SideNavBar } from './components/layout/SideNavBar';
import { BottomNavBar } from './components/layout/BottomNavBar';
import { TimerView } from './pages/TimerView';
import { GoalsView } from './pages/GoalsView';
import { MetricsView } from './pages/MetricsView';
import { SystemView } from './pages/Views';
import { DevTools } from './components/DevTools';

export type Route = 'timer' | 'goals' | 'metrics' | 'system';

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('timer');

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden select-none">

      {/* === Atmospheric Background Layers === */}
      {/* Radial glow center */}
      <div className="fixed inset-0 pointer-events-none z-0 atmo-glow" />
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 grid-bg opacity-100" />
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 hud-scanline" />
      {/* Ambient light blobs */}
      <div className="fixed pointer-events-none z-0 w-[600px] h-[600px] -top-48 -left-48 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,219,233,0.04) 0%, transparent 70%)' }} />
      <div className="fixed pointer-events-none z-0 w-[500px] h-[500px] -bottom-32 -right-32 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,228,117,0.03) 0%, transparent 70%)' }} />

      {/* === Chrome: Top Bar === */}
      <TopNavBar currentRoute={currentRoute} />

      {/* === Chrome: Desktop Sidebar === */}
      <SideNavBar currentRoute={currentRoute} setRoute={setCurrentRoute} />

      {/* === Main Content === */}
      <main className="relative z-10 pt-16 md:pl-64 pb-20 md:pb-0 min-h-screen">
        {currentRoute === 'timer'   && <TimerView />}
        {currentRoute === 'goals'   && <GoalsView />}
        {currentRoute === 'metrics' && <MetricsView />}
        {currentRoute === 'system'  && <SystemView />}
      </main>

      {/* === Chrome: Mobile Bottom Nav === */}
      <BottomNavBar currentRoute={currentRoute} setRoute={setCurrentRoute} />

      {/* === Dev Tools (dismiss via localStorage) === */}
      <DevTools />
    </div>
  );
}

export default App;
