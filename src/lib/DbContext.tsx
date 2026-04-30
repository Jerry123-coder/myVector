import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { db as realDb, INITIAL_CATEGORIES } from './db';
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
    seedCategories();
  }, [db]);

  return (
    <DbContext.Provider value={{ db, isTestMode, setTestMode }}>
      {children}
    </DbContext.Provider>
  );
};
