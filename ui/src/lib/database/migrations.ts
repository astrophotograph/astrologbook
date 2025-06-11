import { DatabaseConnection } from './types';
import { getDatabase } from './index';

export interface Migration {
  id: string;
  name: string;
  up: (db: DatabaseConnection) => Promise<void>;
  down: (db: DatabaseConnection) => Promise<void>;
}

export class MigrationRunner {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async initializeMigrationsTable(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await this.db.query<{ id: string }>(
      'SELECT id FROM migrations ORDER BY executed_at'
    );
    return result.map(row => row.id);
  }

  async runMigrations(migrations: Migration[]): Promise<void> {
    await this.initializeMigrationsTable();
    const executedMigrations = await this.getExecutedMigrations();

    const pendingMigrations = migrations.filter(
      migration => !executedMigrations.includes(migration.id)
    );

    for (const migration of pendingMigrations) {
      console.log(`Running migration: ${migration.name}`);

      await this.db.transaction(async (db) => {
        await migration.up(db);
        await db.execute(
          'INSERT INTO migrations (id, name) VALUES (?, ?)',
          [migration.id, migration.name]
        );
      });

      console.log(`Completed migration: ${migration.name}`);
    }
  }

  async rollbackMigration(migrationId: string, migration: Migration): Promise<void> {
    console.log(`Rolling back migration: ${migration.name}`);

    await this.db.transaction(async (db) => {
      await migration.down(db);
      await db.execute('DELETE FROM migrations WHERE id = ?', [migrationId]);
    });

    console.log(`Rolled back migration: ${migration.name}`);
  }
}

// Convenience function to run migrations
export const runMigrations = async (migrations: Migration[]): Promise<void> => {
  const db = await getDatabase();
  const runner = new MigrationRunner(db);
  await runner.runMigrations(migrations);
};
