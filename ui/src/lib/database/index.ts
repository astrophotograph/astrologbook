import { DatabaseFactory } from './factory';
import { DatabaseConfig, DatabaseConnection } from './types';

// Environment-based configuration
const getDatabaseConfig = (): DatabaseConfig => {
  const dbType = process.env.DATABASE_TYPE as 'neon' | 'sqlite' || 'sqlite';

  if (dbType === 'neon') {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for Neon database');
    }
    return {
      type: 'neon',
      connectionString
    };
  }

  // Default to SQLite
  const filePath = process.env.DATABASE_PATH || './database.db';
  return {
    type: 'sqlite',
    filePath
  };
};

// Singleton connection
let dbInstance: DatabaseConnection | null = null;

export const getDatabase = async (): Promise<DatabaseConnection> => {
  if (!dbInstance) {
    const config = getDatabaseConfig();
    dbInstance = await DatabaseFactory.createConnection(config);
  }
  return dbInstance;
};

export const closeDatabase = async (): Promise<void> => {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
};

// Create a custom connection with specific config
export const createCustomConnection = async (config: DatabaseConfig): Promise<DatabaseConnection> => {
  return await DatabaseFactory.createConnection(config);
};

// Re-export types and classes
export * from './types';
export { DatabaseFactory } from './factory';
export { NeonAdapter } from './neon-adapter';
export { SQLiteAdapter } from './sqlite-adapter';

// Helper functions for common operations
export const withDatabase = async <T>(callback: (db: DatabaseConnection) => Promise<T>): Promise<T> => {
  const db = await getDatabase();
  return await callback(db);
};

export const withTransaction = async <T>(callback: (db: DatabaseConnection) => Promise<T>): Promise<T> => {
  const db = await getDatabase();
  return await db.transaction(callback);
};
