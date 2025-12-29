const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

const LOG_DIR = path.join(__dirname, '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Helper to format log entries
function formatLogEntry(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedContext = sanitizeContext(context);

  return JSON.stringify({
    timestamp,
    level,
    message,
    ...sanitizedContext,
  });
}

// Recursively sanitize values to avoid logging sensitive data
function sanitizeValue(value) {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle Error objects
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      code: value.code,
      // Don't include full stack in production
      stack: process.env.NODE_ENV === 'development' ? value.stack : undefined,
    };
  }

  // Handle arrays recursively
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  // Handle objects recursively
  if (typeof value === 'object') {
    const sanitized = {};
    const sensitiveKeys = ['token', 'password', 'secret', 'apiKey', 'sessionId', 'clientSecret'];

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        // Check if key contains sensitive information
        const isSensitive = sensitiveKeys.some(sensitiveKey =>
          key.toLowerCase().includes(sensitiveKey.toLowerCase())
        );

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitizeValue(value[key]);
        }
      }
    }

    return sanitized;
  }

  // Primitives (string, number, boolean) return as-is
  return value;
}

// Sanitize context to avoid logging sensitive data
function sanitizeContext(context) {
  return sanitizeValue(context);
}

// Write to log file asynchronously
async function writeToFile(level, entry) {
  const filename = path.join(LOG_DIR, `${level.toLowerCase()}.log`);
  try {
    await fsPromises.appendFile(filename, entry + '\n', 'utf8');
  } catch (error) {
    // Fallback to console if file writing fails
    console.error('Failed to write to log file:', error.message);
  }
}

// Main logging function
function log(level, message, context = {}) {
  const entry = formatLogEntry(level, message, context);

  // Always write to file (fire-and-forget async)
  writeToFile(level, entry).catch(err => {
    // Error already handled in writeToFile, this is just to prevent unhandled rejection
  });

  // Also log to console based on level and environment
  if (process.env.NODE_ENV !== 'production' || level === LOG_LEVELS.ERROR) {
    const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' :
                         level === LOG_LEVELS.WARN ? 'warn' : 'log';
    console[consoleMethod](entry);
  }
}

// Public API
const logger = {
  error(message, context = {}) {
    log(LOG_LEVELS.ERROR, message, context);
  },

  warn(message, context = {}) {
    log(LOG_LEVELS.WARN, message, context);
  },

  info(message, context = {}) {
    log(LOG_LEVELS.INFO, message, context);
  },

  debug(message, context = {}) {
    if (process.env.NODE_ENV === 'development') {
      log(LOG_LEVELS.DEBUG, message, context);
    }
  },
};

module.exports = logger;
