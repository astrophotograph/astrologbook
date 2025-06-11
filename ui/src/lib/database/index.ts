import { Sequelize } from 'sequelize';
import { getDatabaseConfig, createSequelizeOptions } from './config';

// Initialize Sequelize
const config = getDatabaseConfig();
const options = createSequelizeOptions(config);

export const sequelize = new Sequelize(options);

// Import all models to register them
import './models/User';
import './models/AstronomyTodo';
import './models/AstroObject';
import './models/Collection';
import './models/Image';

// Test connection and sync models
export const initializeDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

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

// Re-export models for easy import
export { User } from './models/User';
export { AstronomyTodo } from './models/AstronomyTodo';
export { AstroObject } from './models/AstroObject';
export { Collection } from './models/Collection';
export { Image } from './models/Image';

// Helper for transactions
export const withTransaction = async <T>(callback: (transaction: any) => Promise<T>): Promise<T> => {
  return await sequelize.transaction(callback);
};

// Helper to get sequelize instance
export const getSequelize = (): Sequelize => sequelize;

// Re-export Sequelize types for convenience
export { Op, Transaction, QueryTypes } from 'sequelize';
