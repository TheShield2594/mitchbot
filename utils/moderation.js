const fs = require('fs');
const path = require('path');
const { randomUUID } = require('node:crypto');

const fsp = fs.promises;

const moderationPath = path.join(__dirname, '..', 'data', 'moderation.json');
let moderationData = {};
let writeQueue = Promise.resolve();

// Default guild configuration (all automod features DISABLED by default)
function getDefaultGuildConfig() {
  return {
    // Automod settings
    automod: {
      enabled: false,

      // Word filtering
      wordFilter: {
        enabled: false,
        words: [], // Banned words/phrases
        action: 'delete', // 'delete', 'warn', 'timeout', 'kick', 'ban'
        warnThreshold: 3, // Warnings before escalation
      },

      // Invite link filtering
      inviteFilter: {
        enabled: false,
        allowOwnServer: true, // Allow invites to the same server
        action: 'delete',
        warnThreshold: 3,
      },

      // External link filtering
      linkFilter: {
        enabled: false,
        whitelist: [], // Allowed domains
        blacklist: [], // Blocked domains
        action: 'delete',
        warnThreshold: 3,
      },

      // Spam detection
      spam: {
        enabled: false,
        messageThreshold: 5, // Messages in timeWindow
        timeWindow: 5000, // 5 seconds
        duplicateThreshold: 3, // Same message repeated
        action: 'timeout',
        timeoutDuration: 300000, // 5 minutes
      },

      // Mention spam
      mentionSpam: {
        enabled: false,
        threshold: 5, // Max mentions per message
        action: 'warn',
        warnThreshold: 2,
      },

      // Caps spam
      capsSpam: {
        enabled: false,
        percentage: 70, // % of message in caps
        minLength: 10, // Minimum message length to check
        action: 'delete',
      },

      // Whitelisted roles (immune to automod)
      whitelistedRoles: [],

      // Whitelisted channels (automod disabled)
      whitelistedChannels: [],
    },

    // Logging settings
    logging: {
      enabled: false,
      channelId: null, // Mod log channel
      logActions: true,
      logAutomod: true,
      logDeleted: true,
    },

    // Warnings
    warnings: {},

    // Moderation logs with case management
    logs: [],
    caseCounter: 0,

    // Tempban tracking
    tempbans: {}, // { userId: { expiresAt: timestamp, caseId: number } }
  };
}

function ensureModerationFile() {
  if (!fs.existsSync(moderationPath)) {
    fs.mkdirSync(path.dirname(moderationPath), { recursive: true });
    fs.writeFileSync(moderationPath, JSON.stringify({}, null, 2));
  }
}

async function loadModerationData() {
  ensureModerationFile();

  try {
    const data = await fsp.readFile(moderationPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load moderation data', { error });
    return {};
  }
}

function saveModerationData() {
  const payload = JSON.stringify(moderationData, null, 2);
  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${moderationPath}.tmp`;
      await fsp.writeFile(tmpPath, payload, 'utf8');
      await fsp.rename(tmpPath, moderationPath);
    })
    .catch((error) => {
      console.warn('Failed to save moderation data', { error });
    });

  return writeQueue;
}

async function initModeration() {
  moderationData = await loadModerationData();
}

// Get or create guild config
function getGuildConfig(guildId) {
  if (!moderationData[guildId]) {
    moderationData[guildId] = getDefaultGuildConfig();
    saveModerationData();
  }
  return moderationData[guildId];
}

// Update guild config
async function updateGuildConfig(guildId, updates) {
  const config = getGuildConfig(guildId);

  // Deep merge updates
  if (updates.automod) {
    config.automod = { ...config.automod, ...updates.automod };
  }
  if (updates.logging) {
    config.logging = { ...config.logging, ...updates.logging };
  }

  moderationData[guildId] = config;
  await saveModerationData();

  return config;
}

// Warning system
function addWarning(guildId, userId, reason, moderatorId) {
  const config = getGuildConfig(guildId);

  if (!config.warnings[userId]) {
    config.warnings[userId] = [];
  }

  const warning = {
    id: randomUUID(),
    reason,
    moderatorId,
    timestamp: new Date().toISOString(),
  };

  config.warnings[userId].push(warning);
  saveModerationData();

  return warning;
}

function getWarnings(guildId, userId) {
  const config = getGuildConfig(guildId);
  return config.warnings[userId] || [];
}

function clearWarnings(guildId, userId) {
  const config = getGuildConfig(guildId);
  config.warnings[userId] = [];
  saveModerationData();
}

// Logging system with case management
function addLog(guildId, logEntry) {
  const config = getGuildConfig(guildId);

  // Increment case counter
  config.caseCounter = (config.caseCounter || 0) + 1;

  const log = {
    id: randomUUID(),
    caseId: config.caseCounter,
    timestamp: new Date().toISOString(),
    ...logEntry,
  };

  config.logs.push(log);

  // Keep only last 1000 logs per guild
  if (config.logs.length > 1000) {
    config.logs = config.logs.slice(-1000);
  }

  saveModerationData();

  return log;
}

function getLogs(guildId, limit = 50) {
  const config = getGuildConfig(guildId);
  return config.logs.slice(-limit).reverse();
}

// Get specific case by case ID
function getCase(guildId, caseId) {
  const config = getGuildConfig(guildId);
  return config.logs.find(log => log.caseId === caseId);
}

// Update case reason
function updateCaseReason(guildId, caseId, newReason) {
  const config = getGuildConfig(guildId);
  const caseLog = config.logs.find(log => log.caseId === caseId);

  if (!caseLog) {
    return null;
  }

  caseLog.reason = newReason;
  caseLog.edited = true;
  caseLog.editedAt = new Date().toISOString();

  saveModerationData();
  return caseLog;
}

// Delete case
function deleteCase(guildId, caseId) {
  const config = getGuildConfig(guildId);
  const index = config.logs.findIndex(log => log.caseId === caseId);

  if (index === -1) {
    return false;
  }

  config.logs.splice(index, 1);
  saveModerationData();
  return true;
}

// User spam tracking (in-memory, doesn't persist)
const userMessageTracking = new Map();

function trackUserMessage(guildId, userId, messageId, content) {
  const key = `${guildId}-${userId}`;

  if (!userMessageTracking.has(key)) {
    userMessageTracking.set(key, []);
  }

  const messages = userMessageTracking.get(key);
  messages.push({
    id: messageId,
    content,
    timestamp: Date.now(),
  });

  // Keep only messages from last 30 seconds
  const cutoff = Date.now() - 30000;
  const filtered = messages.filter(msg => msg.timestamp > cutoff);
  userMessageTracking.set(key, filtered);

  return filtered;
}

function getUserRecentMessages(guildId, userId) {
  const key = `${guildId}-${userId}`;
  return userMessageTracking.get(key) || [];
}

// Check if user/channel is whitelisted
function isWhitelisted(guildId, member, channelId) {
  const config = getGuildConfig(guildId);

  // Check channel whitelist
  if (config.automod.whitelistedChannels.includes(channelId)) {
    return true;
  }

  // Check role whitelist
  if (member && config.automod.whitelistedRoles.length > 0) {
    const hasWhitelistedRole = member.roles.cache.some(role =>
      config.automod.whitelistedRoles.includes(role.id)
    );
    if (hasWhitelistedRole) {
      return true;
    }
  }

  // Check if user has admin/mod permissions
  if (member && (member.permissions.has('Administrator') || member.permissions.has('ModerateMembers'))) {
    return true;
  }

  return false;
}

// Tempban management
function addTempban(guildId, userId, expiresAt, caseId) {
  const config = getGuildConfig(guildId);

  if (!config.tempbans) {
    config.tempbans = {};
  }

  config.tempbans[userId] = {
    expiresAt,
    caseId,
    guildId,
  };

  saveModerationData();
}

function removeTempban(guildId, userId) {
  const config = getGuildConfig(guildId);

  if (!config.tempbans) {
    return false;
  }

  if (config.tempbans[userId]) {
    delete config.tempbans[userId];
    saveModerationData();
    return true;
  }

  return false;
}

function getExpiredTempbans(guildId) {
  const config = getGuildConfig(guildId);

  if (!config.tempbans) {
    return [];
  }

  const now = Date.now();
  const expired = [];

  for (const [userId, tempban] of Object.entries(config.tempbans)) {
    if (tempban.expiresAt <= now) {
      expired.push({ userId, ...tempban });
    }
  }

  return expired;
}

function getAllTempbans() {
  const allExpired = [];

  for (const [guildId, guildData] of Object.entries(moderationData)) {
    if (guildData.tempbans) {
      const now = Date.now();
      for (const [userId, tempban] of Object.entries(guildData.tempbans)) {
        if (tempban.expiresAt <= now) {
          allExpired.push({ userId, guildId, ...tempban });
        }
      }
    }
  }

  return allExpired;
}

// Safety check helpers
function canModerate(guild, moderator, target) {
  // Can't moderate yourself
  if (moderator.id === target.id) {
    return { canModerate: false, reason: 'You cannot moderate yourself.' };
  }

  // Can't moderate the bot
  if (target.id === guild.members.me.id) {
    return { canModerate: false, reason: 'You cannot moderate the bot.' };
  }

  // Can't moderate the server owner
  if (target.id === guild.ownerId) {
    return { canModerate: false, reason: 'You cannot moderate the server owner.' };
  }

  // If target is a member, check role hierarchy
  if (target.roles) {
    if (target.roles.highest.position >= moderator.roles.highest.position) {
      return { canModerate: false, reason: 'You cannot moderate this user as they have equal or higher role than you.' };
    }

    if (target.roles.highest.position >= guild.members.me.roles.highest.position) {
      return { canModerate: false, reason: 'I cannot moderate this user. They may have higher permissions than me.' };
    }
  }

  return { canModerate: true };
}

module.exports = {
  initModeration,
  getGuildConfig,
  updateGuildConfig,
  addWarning,
  getWarnings,
  clearWarnings,
  addLog,
  getLogs,
  getCase,
  updateCaseReason,
  deleteCase,
  trackUserMessage,
  getUserRecentMessages,
  isWhitelisted,
  getDefaultGuildConfig,
  addTempban,
  removeTempban,
  getExpiredTempbans,
  getAllTempbans,
  canModerate,
};
