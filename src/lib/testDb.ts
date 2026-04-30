import { VectorDB } from './db';

/**
 * Isolated test database — completely separate IndexedDB store ("VectorOS_Dev").
 * Safe to seed/clear without touching real user data.
 */
export const testDb = new VectorDB('VectorOS_Dev');
