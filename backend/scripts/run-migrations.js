/**
 * Migration Runner Script
 * Runs all migrations in the migrations folder in order
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sequelize, Sequelize } = require('../config/sequelize');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function runMigrations() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL successfully\n');

    // Get all migration files sorted by name (timestamp order)
    const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.js'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration(s):\n`);

    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migration = require(path.join(MIGRATIONS_DIR, file));

      // Create a queryInterface-like object for compatibility
      const queryInterface = sequelize.getQueryInterface();

      await migration.up(queryInterface, Sequelize);
      console.log(`  ✓ Completed: ${file}\n`);
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigrations();
