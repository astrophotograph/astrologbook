export interface DatabaseConnection {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
  transaction<T>(callback: (db: DatabaseConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface DatabaseConfig {
  type: 'neon' | 'sqlite';
  connectionString?: string;
  filePath?: string;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface ExecuteResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export type DatabaseType = 'neon' | 'sqlite';
