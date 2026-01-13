/**
 * Automated backup system for bot data
 * Creates daily backups and manages retention
 */

const fs = require('fs');
const path = require('path');
const fsp = fs.promises;
const schedule = require('node-schedule');
const logger = require('./logger');

const dataPath = path.join(__dirname, '..', 'data');
const backupPath = path.join(__dirname, '..', 'backups');

// Configuration
const BACKUP_RETENTION_DAYS = 7; // Keep backups for 7 days
const BACKUP_TIME = '3 0 * * *'; // 3 AM daily

// Track scheduled job to prevent duplicates
let backupJob = null;

/**
 * Ensure backup directory exists
 */
async function ensureBackupDirectory() {
  try {
    await fsp.mkdir(backupPath, { recursive: true });
  } catch (error) {
    logger.error('Failed to create backup directory', { error });
    throw error;
  }
}

/**
 * Create a timestamped backup of all data files
 * @returns {Promise<Object>} - Backup summary
 */
async function createBackup() {
  try {
    await ensureBackupDirectory();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(backupPath, timestamp);

    await fsp.mkdir(backupDir, { recursive: true });

    // Get all JSON files from data directory
    const files = await fsp.readdir(dataPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const backedUp = [];
    const failed = [];

    for (const file of jsonFiles) {
      try {
        const sourcePath = path.join(dataPath, file);
        const destPath = path.join(backupDir, file);

        // Check if source exists before copying
        await fsp.access(sourcePath);
        await fsp.copyFile(sourcePath, destPath);

        const stats = await fsp.stat(destPath);
        backedUp.push({
          file,
          size: stats.size,
        });
      } catch (error) {
        logger.warn('Failed to backup file', { file, error });
        failed.push({ file, error: error.message });
      }
    }

    // Create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      backupDir: timestamp,
      files: backedUp,
      failed,
      totalSize: backedUp.reduce((sum, f) => sum + f.size, 0),
    };

    await fsp.writeFile(
      path.join(backupDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    logger.info('Backup created successfully', {
      backupDir: timestamp,
      filesBackedUp: backedUp.length,
      filesFailed: failed.length,
      totalSize: manifest.totalSize,
    });

    return manifest;
  } catch (error) {
    logger.error('Failed to create backup', { error });
    throw error;
  }
}

/**
 * Clean up old backups beyond retention period
 * @returns {Promise<Object>} - Cleanup summary
 */
async function cleanupOldBackups() {
  try {
    const now = Date.now();
    const retentionMs = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Ensure backup directory exists
    try {
      await fsp.access(backupPath);
    } catch (error) {
      logger.warn('Backup directory does not exist, nothing to clean up');
      return { deleted: [], kept: [] };
    }

    const entries = await fsp.readdir(backupPath, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());

    const deleted = [];
    const kept = [];

    for (const dir of directories) {
      try {
        const dirPath = path.join(backupPath, dir.name);
        const stats = await fsp.stat(dirPath);
        const age = now - stats.mtimeMs;

        if (age > retentionMs) {
          // Delete old backup
          await fsp.rm(dirPath, { recursive: true, force: true });
          deleted.push({
            dir: dir.name,
            ageInDays: Math.floor(age / (24 * 60 * 60 * 1000)),
          });
        } else {
          kept.push(dir.name);
        }
      } catch (error) {
        logger.warn('Failed to process backup directory', {
          dir: dir.name,
          error,
        });
      }
    }

    if (deleted.length > 0) {
      logger.info('Old backups cleaned up', {
        deleted: deleted.length,
        kept: kept.length,
        retentionDays: BACKUP_RETENTION_DAYS,
      });
    }

    return { deleted, kept };
  } catch (error) {
    logger.error('Failed to cleanup old backups', { error });
    throw error;
  }
}

/**
 * List all available backups
 * @returns {Promise<Array>} - Array of backup info
 */
async function listBackups() {
  try {
    // Ensure backup directory exists
    try {
      await fsp.access(backupPath);
    } catch (error) {
      logger.warn('Backup directory does not exist');
      return [];
    }

    const entries = await fsp.readdir(backupPath, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());

    const backups = [];

    for (const dir of directories) {
      try {
        const manifestPath = path.join(backupPath, dir.name, 'manifest.json');
        const manifestData = await fsp.readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(manifestData);

        backups.push({
          name: dir.name,
          ...manifest,
        });
      } catch (error) {
        // No manifest or invalid, use directory info
        const stats = await fsp.stat(path.join(backupPath, dir.name));
        backups.push({
          name: dir.name,
          timestamp: stats.mtime.toISOString(),
          hasManifest: false,
        });
      }
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return backups;
  } catch (error) {
    logger.error('Failed to list backups', { error });
    return [];
  }
}

/**
 * Restore data from a specific backup
 * @param {string} backupName - Name of the backup directory to restore
 * @returns {Promise<Object>} - Restore summary
 */
async function restoreBackup(backupName) {
  try {
    const backupDir = path.join(backupPath, backupName);

    // Verify backup exists
    await fsp.access(backupDir);

    const files = await fsp.readdir(backupDir);
    const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'manifest.json');

    const restored = [];
    const failed = [];

    const restoreTimestamp = new Date().toISOString().replace(/[:.]/g, '-');

    for (const file of jsonFiles) {
      try {
        const sourcePath = path.join(backupDir, file);
        const destPath = path.join(dataPath, file);

        // Create backup of current file before overwriting with unique timestamp
        try {
          await fsp.access(destPath); // Check if file exists
          const preRestorePath = `${destPath}.pre-restore-${restoreTimestamp}`;
          await fsp.copyFile(destPath, preRestorePath);
          logger.info('Created pre-restore backup', { file, preRestorePath });
        } catch (error) {
          // File might not exist, that's okay
        }

        await fsp.copyFile(sourcePath, destPath);
        restored.push(file);
      } catch (error) {
        logger.error('Failed to restore file', { file, error });
        failed.push({ file, error: error.message });
      }
    }

    logger.info('Backup restored', {
      backupName,
      filesRestored: restored.length,
      filesFailed: failed.length,
    });

    return { restored, failed };
  } catch (error) {
    logger.error('Failed to restore backup', { backupName, error });
    throw error;
  }
}

/**
 * Get backup statistics
 * @returns {Promise<Object>} - Statistics object
 */
async function getBackupStats() {
  try {
    const backups = await listBackups();

    const stats = {
      totalBackups: backups.length,
      oldestBackup: backups[backups.length - 1]?.timestamp || null,
      newestBackup: backups[0]?.timestamp || null,
      totalSize: 0,
      retentionDays: BACKUP_RETENTION_DAYS,
      backupTime: BACKUP_TIME,
    };

    for (const backup of backups) {
      if (backup.totalSize) {
        stats.totalSize += backup.totalSize;
      }
    }

    return stats;
  } catch (error) {
    logger.error('Failed to get backup stats', { error });
    return null;
  }
}

/**
 * Initialize backup system and schedule automatic backups
 * @param {boolean} runImmediately - Whether to run a backup immediately
 */
async function initBackupSystem(runImmediately = false) {
  try {
    await ensureBackupDirectory();
    logger.info('Backup system initialized', { backupPath, retentionDays: BACKUP_RETENTION_DAYS });

    // Cancel existing job if it exists to prevent duplicates
    if (backupJob) {
      backupJob.cancel();
      logger.info('Cancelled existing backup job');
    }

    // Schedule daily backups
    backupJob = schedule.scheduleJob(BACKUP_TIME, async () => {
      try {
        await createBackup();
        await cleanupOldBackups();
      } catch (error) {
        logger.error('Scheduled backup failed', { error });
      }
    });

    if (!backupJob) {
      throw new Error('Failed to schedule backup job');
    }

    logger.info('Backup scheduler started', { schedule: BACKUP_TIME });

    // Run immediately if requested
    if (runImmediately) {
      logger.info('Running immediate backup');
      await createBackup();
      await cleanupOldBackups();
    }
  } catch (error) {
    logger.error('Failed to initialize backup system', { error });
    throw error;
  }
}

module.exports = {
  createBackup,
  cleanupOldBackups,
  listBackups,
  restoreBackup,
  getBackupStats,
  initBackupSystem,
  BACKUP_RETENTION_DAYS,
};
