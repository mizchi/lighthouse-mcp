declare module 'node:sqlite' {
  export interface SqliteStatement {
    run(...params: any[]): { changes: number; lastInsertRowId: number | bigint };
    get(...params: any[]): any;
    all(...params: any[]): any[];
  }

  export class DatabaseSync {
    constructor(path: string);
    prepare(sql: string): SqliteStatement;
    exec(sql: string): void;
    close(): void;
  }
}