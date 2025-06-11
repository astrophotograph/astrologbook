import { neon } from '@neondatabase/serverless';
import { DatabaseConnection, ExecuteResult } from './types';

export class NeonAdapter implements DatabaseConnection {
  private sql: ReturnType<typeof neon>;

  constructor(connectionString: string) {
    this.sql = neon(connectionString);
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.sql(sql, params);
      return result as T[];
    } catch (error) {
      console.error('Neon query error:', error);
      throw error;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
    try {
      const result = await this.sql(sql, params);

      // For Neon, we need to handle the result differently based on the operation
      if (Array.isArray(result)) {
        return {
          changes: result.length,
          lastInsertRowid: 0
        };
      }

      return {
        changes: (result as any).changes || 0,
        lastInsertRowid: (result as any).lastInsertRowid || 0
      };
    } catch (error) {
      console.error('Neon execute error:', error);
      throw error;
    }
  }

  async transaction<T>(callback: (db: DatabaseConnection) => Promise<T>): Promise<T> {
    // Neon doesn't have explicit transaction support in the same way as SQLite
    // We'll execute the callback with the current instance
    return await callback(this);
  }

  async close(): Promise<void> {
    // Neon connections are serverless, no explicit close needed
  }
}
