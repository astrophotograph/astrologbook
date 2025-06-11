// Import sequelize connection
import { sequelize } from './connection';
export { sequelize, withTransaction, getSequelize, Op, Transaction, QueryTypes } from './connection';

// Import all models to register them
export * from './models/User';
export * from './models/AstronomyTodo';
export * from './models/AstroObject';
export * from './models/Collection';
export * from './models/Image';

// Import associations after all models are defined
import './associations';
import { initializeAssociations } from './associations';
import { initializeSQLite } from './hooks';

// Test connection and sync models
export const initializeDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Initialize SQLite-specific settings
    await initializeSQLite();

    // Initialize model associations
    initializeAssociations();

    // Sync models in development
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized.');
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  await sequelize.close();
};

