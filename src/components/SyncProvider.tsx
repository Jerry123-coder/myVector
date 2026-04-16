import { useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { syncAllData } from '../lib/sync';

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();

  const performSync = useCallback(async () => {
    if (isAuthenticated && user) {
      console.log('--- Background Sync Initiated ---');
      await syncAllData(user);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // 1. Sync on mount/login
    if (isAuthenticated) {
      performSync();
    }
  }, [isAuthenticated, performSync]);

  useEffect(() => {
    // 2. Sync on window focus (user returning to app)
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        performSync();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [performSync]);

  useEffect(() => {
    // 3. Periodic sync every 2 minutes
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      performSync();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, performSync]);

  return <>{children}</>;
};
