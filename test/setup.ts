import { vi } from 'vitest';

// Mock node:sqlite for tests
vi.mock('node:sqlite', () => ({
  DatabaseSync: class DatabaseSync {
    constructor(_path: string) {}
    prepare(_sql: string) {
      return {
        run: (..._params: any[]) => ({ lastInsertRowId: 1, changes: 1 }),
        get: (..._params: any[]) => null,
        all: (..._params: any[]) => [],
      };
    }
    exec(_sql: string) {}
    close() {}
  },
}));
