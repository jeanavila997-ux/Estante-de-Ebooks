declare module "node:sqlite" {
  export interface StatementResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface DatabaseSync {
    constructor(location: string): this;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export interface StatementSync {
    run(...params: any[]): StatementResult;
    get(...params: any[]): any;
    all(...params: any[]): any[];
    iterate(...params: any[]): IterableIterator<any>;
  }

  export class DatabaseSync implements DatabaseSync {
    constructor(location: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}