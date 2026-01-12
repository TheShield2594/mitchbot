/**
 * Migration versioning system
 * Ensures data migrations only run once, even across restarts
 */

const fs = require('fs');
const path = require('path');
const fsp = fs.promises;
const logger = require('./logger');
const { migrateToPerGuild } = require('./birthdays');

const MIGRATION_FILE = path.join(__dirname, '..', 'data', 'migrations.json');
const CURRENT_VERSION = 2;

/**
 * Load migration status
 * @returns {Promise<Object>} - Migration status object
 */
async function loadMigrationStatus() {
  try {
    const data = await fsp.readFile(MIGRATION_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return default
      return {
        version: 0,
        migrations: {},
        lastRun: null,
      };
    }
    throw error;
  }
}

/**
 * Save migration status
 * @param {Object} status - Migration status to save
 * @returns {Promise<void>}
 */
async function saveMigrationStatus(status) {
  const payload = JSON.stringify(status, null, 2);
  const tmpPath = `${MIGRATION_FILE}.tmp`;

  await fsp.writeFile(tmpPath, payload, 'utf8');
  await fsp.rename(tmpPath, MIGRATION_FILE);
}

/**
 * Migration 1: Birthday data from global to per-guild format
 * @param {Array<string>} guildIds - Array of guild IDs
 * @returns {Promise<Object>} - Migration result
 */
async function migration001_birthdayPerGuild(guildIds) {
  logger.info('Running migration 001: Birthday per-guild format', {
    guildCount: guildIds.length,
  });

  try {
    const migrated = migrateToPerGuild(guildIds);

    return {
      success: true,
      migrated,
      guildCount: guildIds.length,
    };
  } catch (error) {
    logger.error('Migration 001 failed', { error });
    throw error;
  }
}

/**
 * Migration 2: Example future migration
 * @returns {Promise<Object>} - Migration result
 */
async function migration002_example() {
  logger.info('Running migration 002: Example migration');

  // This is a placeholder for future migrations
  // Example: Add new field to economy data structure

  return {
    success: true,
    message: 'Example migration completed',
  };
}

/**
 * Run all pending migrations
 * @param {Object} context - Context object with client and guild IDs
 * @returns {Promise<Object>} - Migration results
 */
async function runMigrations(context = {}) {
  const status = await loadMigrationStatus();
  const currentVersion = status.version || 0;

  if (currentVersion >= CURRENT_VERSION) {
    logger.info('All migrations up to date', {
      currentVersion,
      latestVersion: CURRENT_VERSION,
    });
    return {
      upToDate: true,
      currentVersion,
      latestVersion: CURRENT_VERSION,
    };
  }

  logger.info('Running pending migrations', {
    fromVersion: currentVersion,
    toVersion: CURRENT_VERSION,
  });

  const results = [];

  try {
    // Migration 001: Birthday per-guild format
    if (currentVersion < 1) {
      const guildIds = context.guildIds || [];
      const result = await migration001_birthdayPerGuild(guildIds);

      status.migrations['001_birthday_per_guild'] = {
        completedAt: new Date().toISOString(),
        result,
      };
      status.version = 1;
      await saveMigrationStatus(status);

      results.push({
        migration: '001_birthday_per_guild',
        success: true,
        result,
      });

      logger.info('Migration 001 completed successfully');
    }

    // Migration 002: Example (placeholder)
    if (currentVersion < 2) {
      // Skip this for now - it's just a placeholder
      // Uncomment when you have an actual migration to run
      /*
      const result = await migration002_example();

      status.migrations['002_example'] = {
        completedAt: new Date().toISOString(),
        result,
      };
      status.version = 2;
      await saveMigrationStatus(status);

      results.push({
        migration: '002_example',
        success: true,
        result,
      });

      logger.info('Migration 002 completed successfully');
      */

      // For now, just increment version
      status.version = 2;
      status.lastRun = new Date().toISOString();
      await saveMigrationStatus(status);
    }

    logger.info('All migrations completed successfully', {
      fromVersion: currentVersion,
      toVersion: CURRENT_VERSION,
      migrationsRun: results.length,
    });

    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: CURRENT_VERSION,
      migrations: results,
    };
  } catch (error) {
    logger.error('Migration failed', {
      error,
      currentVersion: status.version,
      targetVersion: CURRENT_VERSION,
    });

    throw error;
  }
}

/**
 * Check if migrations need to be run
 * @returns {Promise<Object>} - Migration status info
 */
async function checkMigrationStatus() {
  const status = await loadMigrationStatus();

  return {
    currentVersion: status.version || 0,
    latestVersion: CURRENT_VERSION,
    needsMigration: (status.version || 0) < CURRENT_VERSION,
    migrations: status.migrations || {},
    lastRun: status.lastRun,
  };
}

/**
 * Reset migration status (dangerous - use only for testing)
 * @param {number} version - Version to reset to (default: 0)
 * @returns {Promise<void>}
 */
async function resetMigrations(version = 0) {
  logger.warn('DANGER: Resetting migration status', { version });

  const status = {
    version,
    migrations: {},
    lastRun: new Date().toISOString(),
    resetBy: 'manual',
  };

  await saveMigrationStatus(status);
}

module.exports = {
  runMigrations,
  checkMigrationStatus,
  resetMigrations,
  CURRENT_VERSION,
};
