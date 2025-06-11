import { DatabaseConnection, DatabaseConfig } from './types';
import { NeonAdapter } from './neon-adapter';
import { SQLiteAdapter } from './sqlite-adapter';

export class DatabaseFactory {
  private static connections: Map<string, DatabaseConnection> = new Map();

  static async createConnection(config: DatabaseConfig): Promise<DatabaseConnection> {
    const key = this.getConnectionKey(config);

    if (this.connections.has(key)) {
      return this.connections.get(key)!;
    }

    let connection: DatabaseConnection;

    switch (config.type) {
      case 'neon':
        if (!config.connectionString) {
          throw new Error('Connection string is required for Neon database');
        }
        connection = new NeonAdapter(config.connectionString);
        break;

      case 'sqlite':
        if (!config.filePath) {
          throw new Error('File path is required for SQLite database');
        }
        connection = new SQLiteAdapter(config.filePath);
        break;

      default:
        throw new Error(`Unsupported database type: ${(config as any).type}`);
    }

    this.connections.set(key, connection);
    return connection;
  }

  static async closeConnection(config: DatabaseConfig): Promise<void> {
    const key = this.getConnectionKey(config);
    const connection = this.connections.get(key);

    if (connection) {
      await connection.close();
      this.connections.delete(key);
    }
  }

  static async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.values()).map(conn => conn.close());
    await Promise.all(closePromises);
    this.connections.clear();
  }

  private static getConnectionKey(config: DatabaseConfig): string {
    return config.type === 'neon' 
      ? `neon:${config.connectionString}`
      : `sqlite:${config.filePath}`;
  }
}
