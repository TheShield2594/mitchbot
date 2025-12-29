const fs = require('fs');
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

// Sanitize context to avoid logging sensitive data
function sanitizeContext(context) {
  const sanitized = { ...context };

  // Remove sensitive fields
  const sensitiveKeys = ['token', 'password', 'secret', 'apiKey', 'sessionId'];
  for (const key of sensitiveKeys) {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  }

  // Sanitize error objects
  if (sanitized.error && sanitized.error instanceof Error) {
    sanitized.error = {
      name: sanitized.error.name,
      message: sanitized.error.message,
      code: sanitized.error.code,
      // Don't include full stack in production
      stack: process.env.NODE_ENV === 'development' ? sanitized.error.stack : undefined,
    };
  }

  return sanitized;
}

// Write to log file
function writeToFile(level, entry) {
  const filename = path.join(LOG_DIR, `${level.toLowerCase()}.log`);
  fs.appendFileSync(filename, entry + '\n', 'utf8');
}

// Main logging function
function log(level, message, context = {}) {
  const entry = formatLogEntry(level, message, context);

  // Always write to file
  writeToFile(level, entry);

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
