import { createContext, useContext, useState, type ReactNode } from 'react';
import { db as realDb } from './db';
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
  return (
    <DbContext.Provider value={{ db: isTestMode ? testDb : realDb, isTestMode, setTestMode }}>
      {children}
    </DbContext.Provider>
  );
};
