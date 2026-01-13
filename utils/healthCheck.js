/**
 * Health check system for data integrity monitoring
 * Detects issues like corrupted files, negative balances, and orphaned data
 */

const fs = require('fs');
const path = require('path');
const fsp = fs.promises;
const schedule = require('node-schedule');
const logger = require('./logger');

const dataPath = path.join(__dirname, '..', 'data');

// Data files to monitor
const DATA_FILES = [
  'economy.json',
  'achievements.json',
  'moderation.json',
  'xp.json',
  'stats.json',
  'quests.json',
  'reminders.json',
  'trivia.json',
  'snark.json',
  'birthdays.json',
  'reactionRoles.json',
  'analytics.json',
  'activeGames.json',
];

/**
 * Check if data files exist and are readable
 * @returns {Promise<Array>} - Array of check results
 */
async function checkDataFilesExist() {
  const results = [];

  for (const file of DATA_FILES) {
    const filePath = path.join(dataPath, file);
    try {
      await fsp.access(filePath, fs.constants.R_OK);
      const stats = await fsp.stat(filePath);
      results.push({
        check: 'file_exists',
        file,
        status: 'OK',
        size: stats.size,
        modified: stats.mtime,
      });
    } catch (error) {
      results.push({
        check: 'file_exists',
        file,
        status: 'FAIL',
        error: error.code === 'ENOENT' ? 'File not found' : error.message,
      });
    }
  }

  return results;
}

/**
 * Check if data files contain valid JSON
 * @returns {Promise<Array>} - Array of check results
 */
async function checkDataFilesValid() {
  const results = [];

  for (const file of DATA_FILES) {
    const filePath = path.join(dataPath, file);
    try {
      const data = await fsp.readFile(filePath, 'utf8');
      JSON.parse(data); // Will throw if invalid
      results.push({
        check: 'json_valid',
        file,
        status: 'OK',
        size: data.length,
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, skip (will be caught by existence check)
        continue;
      }
      results.push({
        check: 'json_valid',
        file,
        status: 'FAIL',
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Check for negative balances in economy data
 * @returns {Promise<Array>} - Array of check results
 */
async function checkNegativeBalances() {
  const results = [];
  const economyPath = path.join(dataPath, 'economy.json');

  try {
    const data = await fsp.readFile(economyPath, 'utf8');
    const economyData = JSON.parse(data);

    for (const [guildId, guildData] of Object.entries(economyData)) {
      if (!guildData.balances) continue;

      for (const [userId, balance] of Object.entries(guildData.balances)) {
        if (balance < 0) {
          results.push({
            check: 'negative_balance',
            status: 'FAIL',
            guildId,
            userId,
            balance,
          });
        }
      }
    }

    if (results.length === 0) {
      results.push({
        check: 'negative_balance',
        status: 'OK',
        message: 'No negative balances found',
      });
    }
  } catch (error) {
    results.push({
      check: 'negative_balance',
      status: 'ERROR',
      error: error.message,
    });
  }

  return results;
}

/**
 * Check for orphaned inventory items (items with no shop entry)
 * @returns {Promise<Array>} - Array of check results
 */
async function checkOrphanedInventory() {
  const results = [];
  const economyPath = path.join(dataPath, 'economy.json');

  try {
    const data = await fsp.readFile(economyPath, 'utf8');
    const economyData = JSON.parse(data);

    let orphanedCount = 0;

    for (const [guildId, guildData] of Object.entries(economyData)) {
      if (!guildData.inventory || !guildData.shop) continue;

      const shopItemIds = new Set(guildData.shop.map(item => item.id));

      for (const [userId, inventory] of Object.entries(guildData.inventory)) {
        for (const item of inventory) {
          if (item.itemId && !shopItemIds.has(item.itemId)) {
            orphanedCount++;
            // Don't log every single one, just count
          }
        }
      }
    }

    results.push({
      check: 'orphaned_inventory',
      status: orphanedCount > 0 ? 'WARN' : 'OK',
      orphanedCount,
      message: orphanedCount > 0 ?
        `Found ${orphanedCount} inventory items with no shop entry` :
        'No orphaned inventory items found',
    });
  } catch (error) {
    results.push({
      check: 'orphaned_inventory',
      status: 'ERROR',
      error: error.message,
    });
  }

  return results;
}

/**
 * Check for very large files that might cause performance issues
 * @param {number} maxSizeMB - Maximum acceptable file size in MB
 * @returns {Promise<Array>} - Array of check results
 */
async function checkFileSizes(maxSizeMB = 10) {
  const results = [];
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  for (const file of DATA_FILES) {
    const filePath = path.join(dataPath, file);
    try {
      const stats = await fsp.stat(filePath);
      const sizeMB = stats.size / (1024 * 1024);

      if (stats.size > maxSizeBytes) {
        results.push({
          check: 'file_size',
          file,
          status: 'WARN',
          sizeMB: sizeMB.toFixed(2),
          maxSizeMB,
          message: `File size ${sizeMB.toFixed(2)}MB exceeds recommended ${maxSizeMB}MB`,
        });
      } else {
        results.push({
          check: 'file_size',
          file,
          status: 'OK',
          sizeMB: sizeMB.toFixed(2),
        });
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        results.push({
          check: 'file_size',
          file,
          status: 'ERROR',
          error: error.message,
        });
      }
    }
  }

  return results;
}

/**
 * Check for expired reminders that should have been sent
 * @returns {Promise<Array>} - Array of check results
 */
async function checkStaleReminders() {
  const results = [];
  const remindersPath = path.join(dataPath, 'reminders.json');

  try {
    const data = await fsp.readFile(remindersPath, 'utf8');
    const remindersData = JSON.parse(data);

    const now = Date.now();
    let staleCount = 0;

    for (const [reminderId, reminder] of Object.entries(remindersData)) {
      if (reminder.triggerAt && new Date(reminder.triggerAt).getTime() < now) {
        staleCount++;
      }
    }

    results.push({
      check: 'stale_reminders',
      status: staleCount > 10 ? 'WARN' : 'OK',
      staleCount,
      message: staleCount > 10 ?
        `Found ${staleCount} reminders that should have triggered` :
        `${staleCount} past-due reminders (normal during recent restart)`,
    });
  } catch (error) {
    results.push({
      check: 'stale_reminders',
      status: 'ERROR',
      error: error.message,
    });
  }

  return results;
}

/**
 * Check disk space availability
 * @returns {Promise<Array>} - Array of check results
 */
async function checkDiskSpace() {
  const results = [];

  try {
    // This is a basic check - in production you'd want to use a proper disk space library
    // For now, we'll just check if we can write to the data directory
    const testFile = path.join(dataPath, '.health-check-test');
    await fsp.writeFile(testFile, 'test');
    await fsp.unlink(testFile);

    results.push({
      check: 'disk_space',
      status: 'OK',
      message: 'Data directory is writable',
    });
  } catch (error) {
    results.push({
      check: 'disk_space',
      status: 'FAIL',
      error: error.message,
      message: 'Cannot write to data directory - disk full or permission issue',
    });
  }

  return results;
}

/**
 * Run all health checks
 * @returns {Promise<Object>} - Comprehensive health report
 */
async function runAllHealthChecks() {
  logger.info('Running health checks');

  const results = {
    timestamp: new Date().toISOString(),
    checks: {},
    summary: {
      total: 0,
      ok: 0,
      warn: 0,
      fail: 0,
      error: 0,
    },
  };

  try {
    // Run all checks
    const checks = await Promise.all([
      checkDataFilesExist(),
      checkDataFilesValid(),
      checkNegativeBalances(),
      checkOrphanedInventory(),
      checkFileSizes(),
      checkStaleReminders(),
      checkDiskSpace(),
    ]);

    // Flatten and categorize results
    const allChecks = checks.flat();

    for (const check of allChecks) {
      const checkType = check.check;
      if (!results.checks[checkType]) {
        results.checks[checkType] = [];
      }
      results.checks[checkType].push(check);

      results.summary.total++;
      if (check.status === 'OK') results.summary.ok++;
      else if (check.status === 'WARN') results.summary.warn++;
      else if (check.status === 'FAIL') results.summary.fail++;
      else if (check.status === 'ERROR') results.summary.error++;
    }

    // Log summary
    if (results.summary.fail > 0 || results.summary.error > 0) {
      logger.error('Health check completed with failures', results.summary);
    } else if (results.summary.warn > 0) {
      logger.warn('Health check completed with warnings', results.summary);
    } else {
      logger.info('Health check completed - all systems healthy', results.summary);
    }

    return results;
  } catch (error) {
    logger.error('Health check failed to complete', { error });
    throw error;
  }
}

/**
 * Initialize health check system with scheduled checks
 * @param {string} schedulePattern - Cron schedule (default: hourly)
 * @param {boolean} runImmediately - Whether to run a health check immediately
 */
async function initHealthCheckSystem(schedulePattern = '0 * * * *', runImmediately = false) {
  logger.info('Health check system initialized', { schedule: schedulePattern });

  // Schedule regular health checks
  schedule.scheduleJob(schedulePattern, async () => {
    try {
      await runAllHealthChecks();
    } catch (error) {
      logger.error('Scheduled health check failed', { error });
    }
  });

  // Run immediately if requested
  if (runImmediately) {
    logger.info('Running immediate health check');
    try {
      await runAllHealthChecks();
    } catch (error) {
      logger.error('Immediate health check failed', { error });
    }
  }
}

module.exports = {
  checkDataFilesExist,
  checkDataFilesValid,
  checkNegativeBalances,
  checkOrphanedInventory,
  checkFileSizes,
  checkStaleReminders,
  checkDiskSpace,
  runAllHealthChecks,
  initHealthCheckSystem,
};
