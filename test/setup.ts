import { vi } from 'vitest';

// Mock node:sqlite for tests
vi.mock('node:sqlite', () => ({
  DatabaseSync: class DatabaseSync {
    constructor(path: string) {}
    prepare(sql: string) {
      return {
        run: (...params: any[]) => ({ lastInsertRowId: 1, changes: 1 }),
        get: (...params: any[]) => null,
        all: (...params: any[]) => [],
      };
    }
    exec(sql: string) {}
    close() {}
  },
}));
