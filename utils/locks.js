/**
 * In-memory lock manager to prevent race conditions
 * Provides mutex-style locking for critical sections
 */

const locks = new Map();
const lockQueues = new Map();

/**
 * Acquire a lock for a given key
 * @param {string} key - The lock identifier
 * @returns {Promise<Function>} - Release function to unlock
 */
async function acquireLock(key) {
  // If lock exists, wait in queue
  while (locks.has(key)) {
    await new Promise((resolve) => {
      if (!lockQueues.has(key)) {
        lockQueues.set(key, []);
      }
      lockQueues.get(key).push(resolve);
    });
  }

  // Acquire lock
  locks.set(key, {
    acquiredAt: Date.now(),
    stack: new Error().stack, // For debugging deadlocks
  });

  // Return release function
  return () => releaseLock(key);
}

/**
 * Release a lock and wake up next waiter
 * @param {string} key - The lock identifier
 */
function releaseLock(key) {
  locks.delete(key);

  // Wake up next waiter
  const queue = lockQueues.get(key);
  if (queue && queue.length > 0) {
    const resolve = queue.shift();
    resolve();
  } else {
    lockQueues.delete(key);
  }
}

/**
 * Execute a function with a lock held
 * @param {string} key - The lock identifier
 * @param {Function} fn - The function to execute
 * @returns {Promise<any>} - Result of the function
 */
async function withLock(key, fn) {
  const release = await acquireLock(key);
  try {
    return await fn();
  } finally {
    release();
  }
}

/**
 * Check for locks held longer than timeout (potential deadlocks)
 * @param {number} timeoutMs - Timeout in milliseconds (default 30s)
 * @returns {Array} - Array of potentially deadlocked keys
 */
function checkDeadlocks(timeoutMs = 30000) {
  const now = Date.now();
  const deadlocks = [];

  for (const [key, lockInfo] of locks.entries()) {
    if (now - lockInfo.acquiredAt > timeoutMs) {
      deadlocks.push({
        key,
        heldFor: now - lockInfo.acquiredAt,
        stack: lockInfo.stack,
      });
    }
  }

  return deadlocks;
}

/**
 * Get lock statistics for monitoring
 * @returns {Object} - Lock statistics
 */
function getLockStats() {
  return {
    activeLocks: locks.size,
    queuedWaiters: Array.from(lockQueues.values()).reduce(
      (sum, queue) => sum + queue.length,
      0
    ),
    locks: Array.from(locks.keys()),
  };
}

module.exports = {
  acquireLock,
  releaseLock,
  withLock,
  checkDeadlocks,
  getLockStats,
};
