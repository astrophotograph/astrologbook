import Database from 'better-sqlite3';
import { DatabaseConnection, ExecuteResult } from './types';

export class SQLiteAdapter implements DatabaseConnection {
  private db: Database.Database;

  constructor(filePath: string) {
    this.db = new Database(filePath);
    // Enable WAL mode for better concurrent access
    this.db.pragma('journal_mode = WAL');
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.all(params) as T[];
      return result;
    } catch (error) {
      console.error('SQLite query error:', error);
      throw error;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(params);

      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      };
    } catch (error) {
      console.error('SQLite execute error:', error);
      throw error;
    }
  }

  async transaction<T>(callback: (db: DatabaseConnection) => Promise<T>): Promise<T> {
    const transaction = this.db.transaction(async () => {
      return await callback(this);
    });

    return transaction();
  }

  async close(): Promise<void> {
    this.db.close();
  }

  // SQLite-specific method for backup
  backup(destinationPath: string): void {
    const backup = this.db.backup(destinationPath);
    backup.step(-1); // Complete backup in one step
    backup.finish();
  }

  // SQLite-specific method for running pragmas
  pragma(statement: string): any {
    return this.db.pragma(statement);
  }
}
