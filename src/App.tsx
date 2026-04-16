import { useState } from 'react';
import { TopNavBar } from './components/layout/TopNavBar';
import { SideNavBar } from './components/layout/SideNavBar';
import { BottomNavBar } from './components/layout/BottomNavBar';
import { TimerView } from './pages/TimerView';
import { GoalsView } from './pages/GoalsView';
import { MetricsView } from './pages/MetricsView';
import { SettingsView } from './pages/Views';
import { DevTools } from './components/DevTools';
import { useAuth } from './hooks/useAuth';
import { AuthView } from './pages/AuthView';
import { WalletView } from './pages/WalletView';
import { PeopleView } from './pages/PeopleView';
import { ProfileOverlay } from './components/layout/ProfileOverlay';
import { NotificationCenter } from './components/layout/NotificationCenter';

export type Route = 'timer' | 'goals' | 'wallet' | 'people';

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('timer');
  const { isAuthenticated, user, loading } = useAuth();
  
  // Overlay states
  const [showAuth, setShowAuth] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden select-none">

      {/* === Atmospheric Background Layers === */}
      <div className="fixed inset-0 pointer-events-none z-0 atmo-glow" />
      <div className="fixed inset-0 pointer-events-none z-0 grid-bg opacity-100" />
      <div className="fixed inset-0 pointer-events-none z-0 hud-scanline" />
      <div className="fixed pointer-events-none z-0 w-[600px] h-[600px] -top-48 -left-48 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,219,233,0.04) 0%, transparent 70%)' }} />
      <div className="fixed pointer-events-none z-0 w-[500px] h-[500px] -bottom-32 -right-32 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,228,117,0.03) 0%, transparent 70%)' }} />

      {/* === Chrome: Top Bar === */}
      <TopNavBar 
        currentRoute={currentRoute} 
        setRoute={setCurrentRoute} 
        onOpenAuth={() => setShowAuth(true)}
        onOpenProfile={() => setShowProfile(true)}
        onOpenNotifications={() => setShowNotifications(true)}
      />

      {/* === Chrome: Desktop Sidebar === */}
      <SideNavBar currentRoute={currentRoute} setRoute={setCurrentRoute} />

      {/* === Main Content === */}
      <main className="relative z-10 pt-16 md:pl-64 pb-20 md:pb-0 min-h-screen">
        {!isAuthenticated && showAuth ? (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <AuthView onSuccess={() => setShowAuth(false)} />
          </div>
        ) : (
          <>
            {currentRoute === 'timer' && <TimerView />}
            {currentRoute === 'goals' && <GoalsView />}
            {currentRoute === 'wallet' && <WalletView />}
            {currentRoute === 'people' && <PeopleView />}
          </>
        )}
      </main>

      {/* === Overlays === */}
      <ProfileOverlay isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

      {/* === Chrome: Mobile Bottom Nav === */}
      <BottomNavBar currentRoute={currentRoute} setRoute={setCurrentRoute} />

      {/* === Dev Tools (dismiss via localStorage) === */}
      <DevTools />
    </div>
  );
}

export default App;
