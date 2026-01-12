/**
 * Single-instance enforcement to prevent multi-instance data corruption
 * Uses Redis (if available) or filesystem lock as fallback
 */

const fs = require('fs');
const path = require('path');
const fsp = fs.promises;
const logger = require('./logger');

const LOCK_KEY = 'mitchbot:instance:lock';
const LOCK_FILE = path.join(__dirname, '..', 'data', '.instance.lock');
const LOCK_TTL_SECONDS = 30; // Lock expires after 30 seconds
const REFRESH_INTERVAL_MS = 15000; // Refresh every 15 seconds

let redisClient = null;
let lockRefreshInterval = null;
let currentPid = process.pid;

/**
 * Try to create Redis client if REDIS_URL is configured
 * @returns {Promise<Object|null>} - Redis client or null
 */
async function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.info('REDIS_URL not configured, using filesystem lock fallback');
    return null;
  }

  try {
    const redis = require('redis');
    const client = redis.createClient({ url: redisUrl });

    client.on('error', (err) => {
      logger.error('Redis client error', { error: err });
    });

    await client.connect();
    logger.info('Redis client connected for instance locking');
    return client;
  } catch (error) {
    logger.warn('Failed to connect to Redis, falling back to filesystem lock', { error });
    return null;
  }
}

/**
 * Acquire instance lock using Redis
 * @returns {Promise<boolean>} - True if lock acquired
 */
async function acquireRedisLock() {
  try {
    const lockValue = JSON.stringify({
      pid: currentPid,
      hostname: require('os').hostname(),
      startedAt: new Date().toISOString(),
    });

    // Try to set lock with NX (only if not exists) and EX (expiry)
    const result = await redisClient.set(LOCK_KEY, lockValue, {
      NX: true,
      EX: LOCK_TTL_SECONDS,
    });

    return result === 'OK';
  } catch (error) {
    logger.error('Failed to acquire Redis lock', { error });
    return false;
  }
}

/**
 * Refresh Redis lock TTL
 * @returns {Promise<boolean>} - True if refresh succeeded
 */
async function refreshRedisLock() {
  try {
    const result = await redisClient.expire(LOCK_KEY, LOCK_TTL_SECONDS);
    return result === 1;
  } catch (error) {
    logger.error('Failed to refresh Redis lock', { error });
    return false;
  }
}

/**
 * Release Redis lock
 * @returns {Promise<void>}
 */
async function releaseRedisLock() {
  try {
    await redisClient.del(LOCK_KEY);
    logger.info('Redis instance lock released');
  } catch (error) {
    logger.error('Failed to release Redis lock', { error });
  }
}

/**
 * Acquire instance lock using filesystem (fallback)
 * @returns {Promise<boolean>} - True if lock acquired
 */
async function acquireFilesystemLock() {
  try {
    const lockData = {
      pid: currentPid,
      hostname: require('os').hostname(),
      startedAt: new Date().toISOString(),
    };

    // Check if lock file exists
    try {
      const existingData = await fsp.readFile(LOCK_FILE, 'utf8');
      const existing = JSON.parse(existingData);

      // Check if the process is still running
      try {
        process.kill(existing.pid, 0); // Signal 0 checks if process exists
        // Process exists - lock is held
        logger.error('Another instance is already running', {
          existingPid: existing.pid,
          existingHostname: existing.hostname,
          existingStartedAt: existing.startedAt,
        });
        return false;
      } catch (err) {
        // Process doesn't exist - stale lock, remove it
        logger.warn('Removing stale lock file', { stalePid: existing.pid });
        await fsp.unlink(LOCK_FILE);
      }
    } catch (error) {
      // Lock file doesn't exist or can't be read - proceed
    }

    // Create lock file
    await fsp.writeFile(LOCK_FILE, JSON.stringify(lockData, null, 2));
    logger.info('Filesystem instance lock acquired');
    return true;
  } catch (error) {
    logger.error('Failed to acquire filesystem lock', { error });
    return false;
  }
}

/**
 * Refresh filesystem lock (update timestamp)
 * @returns {Promise<boolean>} - True if refresh succeeded
 */
async function refreshFilesystemLock() {
  try {
    const lockData = {
      pid: currentPid,
      hostname: require('os').hostname(),
      refreshedAt: new Date().toISOString(),
    };
    await fsp.writeFile(LOCK_FILE, JSON.stringify(lockData, null, 2));
    return true;
  } catch (error) {
    logger.error('Failed to refresh filesystem lock', { error });
    return false;
  }
}

/**
 * Release filesystem lock
 * @returns {Promise<void>}
 */
async function releaseFilesystemLock() {
  try {
    await fsp.unlink(LOCK_FILE);
    logger.info('Filesystem instance lock released');
  } catch (error) {
    // Ignore errors on cleanup
  }
}

/**
 * Acquire instance lock (tries Redis, falls back to filesystem)
 * @returns {Promise<boolean>} - True if lock acquired
 */
async function acquireInstanceLock() {
  // Try Redis first if available
  redisClient = await createRedisClient();

  if (redisClient) {
    const acquired = await acquireRedisLock();
    if (!acquired) {
      const existingLock = await redisClient.get(LOCK_KEY);
      logger.error('Failed to acquire instance lock - another instance is running', {
        existingLock: existingLock ? JSON.parse(existingLock) : null,
        currentPid,
        currentHostname: require('os').hostname(),
      });
      await redisClient.disconnect();
      return false;
    }
  } else {
    // Fallback to filesystem lock
    const acquired = await acquireFilesystemLock();
    if (!acquired) {
      return false;
    }
  }

  // Start lock refresh interval
  startLockRefresh();

  // Setup cleanup on exit
  setupExitHandlers();

  logger.info('Instance lock acquired successfully', {
    method: redisClient ? 'redis' : 'filesystem',
    pid: currentPid,
  });

  return true;
}

/**
 * Start lock refresh interval
 */
function startLockRefresh() {
  lockRefreshInterval = setInterval(async () => {
    try {
      let refreshed;
      if (redisClient) {
        refreshed = await refreshRedisLock();
      } else {
        refreshed = await refreshFilesystemLock();
      }

      if (!refreshed) {
        logger.error('Failed to refresh instance lock - shutting down to prevent conflicts');
        process.exit(1);
      }
    } catch (error) {
      logger.error('Error refreshing instance lock', { error });
    }
  }, REFRESH_INTERVAL_MS);

  // Prevent interval from keeping process alive
  lockRefreshInterval.unref();
}

/**
 * Release instance lock
 * @returns {Promise<void>}
 */
async function releaseInstanceLock() {
  // Stop refresh interval
  if (lockRefreshInterval) {
    clearInterval(lockRefreshInterval);
    lockRefreshInterval = null;
  }

  // Release lock
  if (redisClient) {
    await releaseRedisLock();
    await redisClient.disconnect();
  } else {
    await releaseFilesystemLock();
  }
}

/**
 * Setup exit handlers to ensure lock is released
 */
function setupExitHandlers() {
  const cleanup = async (signal) => {
    logger.info('Received shutdown signal, releasing instance lock', { signal });
    await releaseInstanceLock();
    process.exit(0);
  };

  // Handle various exit signals
  process.on('SIGTERM', () => cleanup('SIGTERM'));
  process.on('SIGINT', () => cleanup('SIGINT'));
  process.on('SIGHUP', () => cleanup('SIGHUP'));

  // Handle uncaught errors
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception, releasing lock and exiting', { error });
    await releaseInstanceLock();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason) => {
    logger.error('Unhandled rejection, releasing lock and exiting', { reason });
    await releaseInstanceLock();
    process.exit(1);
  });
}

/**
 * Check if instance lock is held
 * @returns {Promise<Object>} - Lock status information
 */
async function getInstanceLockStatus() {
  try {
    if (redisClient) {
      const lockValue = await redisClient.get(LOCK_KEY);
      const ttl = await redisClient.ttl(LOCK_KEY);
      return {
        method: 'redis',
        locked: !!lockValue,
        lockData: lockValue ? JSON.parse(lockValue) : null,
        ttl,
      };
    } else {
      try {
        const lockData = await fsp.readFile(LOCK_FILE, 'utf8');
        return {
          method: 'filesystem',
          locked: true,
          lockData: JSON.parse(lockData),
        };
      } catch (error) {
        return {
          method: 'filesystem',
          locked: false,
          lockData: null,
        };
      }
    }
  } catch (error) {
    logger.error('Failed to get instance lock status', { error });
    return { error: error.message };
  }
}

module.exports = {
  acquireInstanceLock,
  releaseInstanceLock,
  getInstanceLockStatus,
};
