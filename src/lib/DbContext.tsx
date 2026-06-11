import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { db as realDb, INITIAL_CATEGORIES, INITIAL_REWARDS, INITIAL_PROTOCOLS, INITIAL_MILESTONES, INITIAL_SIDE_QUESTS } from './db';
import { testDb } from './testDb';

export type DbInstance = typeof realDb;

interface DbContextValue {
  db: DbInstance;
  isTestMode: boolean;
  setTestMode: (v: boolean) => void;
}

const DbContext = createContext<DbContextValue>({
  db: realDb,
  isTestMode: false,
  setTestMode: () => {},
});

export const useDb = () => useContext(DbContext);

export const DbProvider = ({ children }: { children: ReactNode }) => {
  const [isTestMode, setTestMode] = useState(false);
  const db = isTestMode ? testDb : realDb;

  useEffect(() => {
    const seedCategories = async () => {
      const count = await db.categories.count();
      if (count === 0) {
        await db.categories.bulkAdd(INITIAL_CATEGORIES);
      }
    };
    const seedRewards = async () => {
      const count = await db.rewards.count();
      if (count === 0) {
        await db.rewards.bulkAdd(INITIAL_REWARDS);
      }
    };
    const seedProtocols = async () => {
      const count = await db.focusProtocols.count();
      if (count === 0) {
        await db.focusProtocols.bulkAdd(INITIAL_PROTOCOLS);
      }
    };
    const seedMilestones = async () => {
      const count = await db.milestones.count();
      if (count === 0) {
        await db.milestones.bulkAdd(INITIAL_MILESTONES as any[]);
      }
    };
    const seedSideQuests = async () => {
      const count = await db.sideQuests.count();
      if (count === 0) {
        await db.sideQuests.bulkAdd(INITIAL_SIDE_QUESTS as any[]);
      }
    };
    seedCategories();
    seedRewards();
    seedProtocols();
    seedMilestones();
    seedSideQuests();
  }, [db]);

  return (
    <DbContext.Provider value={{ db, isTestMode, setTestMode }}>
      {children}
    </DbContext.Provider>
  );
};
