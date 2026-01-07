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

      // Attachment spam
      attachmentSpam: {
        enabled: false,
        threshold: 5, // Number of attachments
        timeWindow: 10000, // Time window in ms (10 seconds)
        action: 'warn',
        warnThreshold: 2,
      },

      // Emoji spam
      emojiSpam: {
        enabled: false,
        threshold: 10, // Max emojis per message
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

    // Moderation cases
    cases: [],
    caseCounter: 0,

    // Tempban tracking
    tempbans: {}, // { userId: { expiresAt: timestamp, caseId: number } }

    // Mute role
    muteRole: null, // Role ID for permanent mutes

    // Anti-raid settings
    antiRaid: {
      // Account age filter
      accountAge: {
        enabled: false,
        minAgeDays: 7, // Minimum account age in days
        action: 'kick', // 'kick' or 'ban'
      },

      // Join spam detection
      joinSpam: {
        enabled: false,
        threshold: 5, // Number of joins
        timeWindow: 10000, // Time window in ms (10 seconds)
        action: 'kick', // 'kick' or 'ban' for detected raid accounts
      },

      // Emergency lockdown
      lockdown: {
        active: false,
        lockedChannels: [], // Array of channel IDs that were locked
      },

      // Verification system
      verification: {
        enabled: false,
        roleId: null, // Role to give after verification
        channelId: null, // Channel where users verify
        message: 'Welcome! Please verify by reacting to this message.', // Verification message
      },
    },

    // Anti-dehoist (auto-rename users with hoisting characters)
    antiDehoist: {
      enabled: false,
      prefix: 'Dehoisted', // Prefix to add to dehoisted names
    },

    // Birthday settings
    birthday: {
      enabled: false,
      channelId: null, // Channel for birthday announcements
      roleId: null, // Role to assign on birthdays
      customMessage: 'Happy Birthday, {mention}! 🎉', // Custom birthday message ({mention}, {username}, {user} available)
    },

    // Birthday role tracking (persisted for restart survival)
    birthdayRoles: {}, // { userId: { guildId, userId, roleId, expiresAt } }

    // Welcome/Leave messages
    welcome: {
      enabled: false,
      channelId: null,
      message: 'Welcome to the server, {user}!', // {user} = mention, {username} = name, {server} = server name, {memberCount} = member count
    },

    leave: {
      enabled: false,
      channelId: null,
      message: '{username} has left the server.',
    },
  };
}

function ensureModerationFile() {
  try {
    if (!fs.existsSync(moderationPath)) {
      fs.mkdirSync(path.dirname(moderationPath), { recursive: true });
      fs.writeFileSync(moderationPath, JSON.stringify({}, null, 2));
    }
  } catch (error) {
    console.warn('Failed to ensure moderation file', { error });
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
      console.error('Failed to save moderation data', { error });
      throw error; // Re-throw so callers can handle it
    });

  return writeQueue;
}

function migrateGuildConfig(config) {
  if (config._migrated) {
    return config;
  }

  if (!config.cases && Array.isArray(config.logs)) {
    config.cases = config.logs.map((log, index) => ({
      caseId: log.caseId || index + 1,
      timestamp: log.timestamp || new Date().toISOString(),
      ...log,
      actionType: log.actionType || log.type || 'log',
      moderatorId: log.moderatorId || null,
      targetUserId: log.targetUserId || log.targetId || null,
      reason: log.reason || null,
      duration: log.duration ?? null,
    }));
    delete config.logs;
  }

  if (!Array.isArray(config.cases)) {
    config.cases = [];
  }

  const maxCaseId = config.cases.reduce((max, entry) => Math.max(max, entry.caseId || 0), 0);
  if (!config.caseCounter || config.caseCounter < maxCaseId) {
    config.caseCounter = maxCaseId;
  }

  config._migrated = true;
  return config;
}

async function initModeration() {
  moderationData = await loadModerationData();
  for (const [guildId, config] of Object.entries(moderationData)) {
    moderationData[guildId] = migrateGuildConfig(config);
  }
}

// Get or create guild config
// Deep merge utility - recursively merges nested objects
function deepMerge(target, source) {
  // Handle null/undefined
  if (source === null || source === undefined) {
    return target;
  }

  // If source is not a plain object, replace target
  if (typeof source !== 'object' || Array.isArray(source)) {
    return source;
  }

  // Create result starting with target
  const result = { ...target };

  // Merge each property from source
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      // If both are plain objects, recursively merge
      if (
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        sourceValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue) &&
        targetValue !== null
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        // Otherwise, replace with source value
        result[key] = sourceValue;
      }
    }
  }

  return result;
}

function getGuildConfig(guildId) {
  if (!moderationData[guildId]) {
    moderationData[guildId] = getDefaultGuildConfig();
    // Don't await here to keep this function synchronous
    // The save will happen in the background
    saveModerationData().catch(err => {
      console.error('Failed to save new guild config', { guildId, error: err });
    });
  }
  const wasMigrated = Boolean(moderationData[guildId]._migrated);
  moderationData[guildId] = migrateGuildConfig(moderationData[guildId]);
  if (!wasMigrated && moderationData[guildId]._migrated) {
    saveModerationData().catch(err => {
      console.error('Failed to save migrated guild config', { guildId, error: err });
    });
  }
  return moderationData[guildId];
}

// Update guild config
async function updateGuildConfig(guildId, updates) {
  const config = getGuildConfig(guildId);

  // Use deep merge to properly handle nested config updates
  const updatedConfig = deepMerge(config, updates);

  moderationData[guildId] = updatedConfig;
  await saveModerationData();

  return updatedConfig;
}

// Warning system
async function addWarning(guildId, userId, reason, moderatorId) {
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
  await saveModerationData();

  return warning;
}

function getWarnings(guildId, userId) {
  const config = getGuildConfig(guildId);
  return config.warnings[userId] || [];
}

async function clearWarnings(guildId, userId) {
  const config = getGuildConfig(guildId);
  config.warnings[userId] = [];
  await saveModerationData();
}

function addCase(guildId, caseEntry) {
  const config = getGuildConfig(guildId);

  // Increment case counter
  config.caseCounter = (config.caseCounter || 0) + 1;

  const actionType = caseEntry.actionType || caseEntry.type || 'log';
  const moderatorId = caseEntry.moderatorId || null;
  const targetUserId = caseEntry.targetUserId || caseEntry.targetId || null;
  const reason = caseEntry.reason || null;
  const duration = caseEntry.duration ?? null;
  // Explicit/normalized fields below intentionally override any matching properties from caseEntry.
  const caseRecord = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...caseEntry,
    caseId: config.caseCounter,
    actionType,
    moderatorId,
    targetUserId,
    reason,
    duration,
  };

  config.cases.push(caseRecord);

  // Keep only the most recent 1000 cases; caseCounter continues incrementing to avoid caseId reuse.
  if (config.cases.length > 1000) {
    config.cases = config.cases.slice(-1000);
  }

  // Save in background, don't block
  saveModerationData().catch(err => {
    console.error('Failed to save moderation log', { guildId, logId: caseRecord.id, error: err });
  });

  return caseRecord;
}

// Logging system with case management (non-blocking, fires in background)
function addLog(guildId, logEntry) {
  return addCase(guildId, logEntry);
}

function getLogs(guildId, limit = 50) {
  const config = getGuildConfig(guildId);
  return config.cases.slice(-limit).reverse();
}

// Get specific case by case ID
function getCase(guildId, caseId) {
  const config = getGuildConfig(guildId);
  return config.cases.find(log => log.caseId === caseId);
}

// Update case reason
function updateCaseReason(guildId, caseId, newReason) {
  const config = getGuildConfig(guildId);
  const caseLog = config.cases.find(log => log.caseId === caseId);

  if (!caseLog) {
    return null;
  }

  caseLog.reason = newReason;
  caseLog.edited = true;
  caseLog.editedAt = new Date().toISOString();

  // Save in background, don't block
  saveModerationData().catch(err => {
    console.error('Failed to save case update', { guildId, caseId, error: err });
  });
  return caseLog;
}

// Delete case
function deleteCase(guildId, caseId) {
  const config = getGuildConfig(guildId);
  const index = config.cases.findIndex(log => log.caseId === caseId);

  if (index === -1) {
    return false;
  }

  config.cases.splice(index, 1);
  // Save in background, don't block
  saveModerationData().catch(err => {
    console.error('Failed to save case deletion', { guildId, caseId, error: err });
  });
  return true;
}

function getCasesByUser(guildId, userId) {
  const config = getGuildConfig(guildId);
  return config.cases
    .filter(entry => entry.targetUserId === userId)
    .sort((a, b) => b.caseId - a.caseId);
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

// Attachment spam tracking (in-memory, doesn't persist)
const userAttachmentTracking = new Map();

function trackUserAttachment(guildId, userId, attachmentCount) {
  const key = `${guildId}-${userId}`;

  if (!userAttachmentTracking.has(key)) {
    userAttachmentTracking.set(key, []);
  }

  const attachments = userAttachmentTracking.get(key);
  attachments.push({
    count: attachmentCount,
    timestamp: Date.now(),
  });

  // Keep only attachments from last 60 seconds
  const cutoff = Date.now() - 60000;
  const filtered = attachments.filter(att => att.timestamp > cutoff);
  userAttachmentTracking.set(key, filtered);

  return filtered;
}

function getUserRecentAttachments(guildId, userId, timeWindow = 10000) {
  const key = `${guildId}-${userId}`;
  if (!userAttachmentTracking.has(key)) {
    return [];
  }

  const attachments = userAttachmentTracking.get(key);
  const cutoff = Date.now() - timeWindow;
  return attachments.filter(att => att.timestamp > cutoff);
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

  // Save in background, don't block
  saveModerationData().catch(err => {
    console.error('Failed to save tempban', { guildId, userId, error: err });
  });
}

function removeTempban(guildId, userId) {
  const config = getGuildConfig(guildId);

  if (!config.tempbans) {
    return false;
  }

  if (config.tempbans[userId]) {
    delete config.tempbans[userId];
    // Save in background, don't block
    saveModerationData().catch(err => {
      console.error('Failed to save tempban removal', { guildId, userId, error: err });
    });
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

// Join spam tracking (in-memory, doesn't persist)
const guildJoinTracking = new Map();

function trackMemberJoin(guildId, userId) {
  if (!guildJoinTracking.has(guildId)) {
    guildJoinTracking.set(guildId, []);
  }

  const joins = guildJoinTracking.get(guildId);
  joins.push({
    userId,
    timestamp: Date.now(),
  });

  // Keep only joins from last 60 seconds
  const cutoff = Date.now() - 60000;
  const filtered = joins.filter(join => join.timestamp > cutoff);
  guildJoinTracking.set(guildId, filtered);

  return filtered;
}

function getRecentJoins(guildId, timeWindow = 10000) {
  if (!guildJoinTracking.has(guildId)) {
    return [];
  }

  const joins = guildJoinTracking.get(guildId);
  const cutoff = Date.now() - timeWindow;
  return joins.filter(join => join.timestamp > cutoff);
}

// Verification message tracking (in-memory, doesn't persist)
const verificationMessageTracking = new Map();

function trackVerificationMessage(guildId, userId, messageId) {
  const key = `${guildId}-${userId}`;
  verificationMessageTracking.set(key, {
    messageId,
    timestamp: Date.now(),
  });
}

function getVerificationMessage(guildId, userId) {
  const key = `${guildId}-${userId}`;
  return verificationMessageTracking.get(key);
}

function clearVerificationMessage(guildId, userId) {
  const key = `${guildId}-${userId}`;
  verificationMessageTracking.delete(key);
}

// Anti-dehoist utilities
const HOIST_CHARS = /^[^a-zA-Z0-9]/;

function shouldDehoist(displayName) {
  return HOIST_CHARS.test(displayName);
}

function generateDehoistedName(originalName, prefix = 'Dehoisted') {
  // Remove leading special characters
  const cleaned = originalName.replace(/^[^a-zA-Z0-9]+/, '');

  // If nothing left after cleaning, use the prefix
  if (!cleaned) {
    return prefix;
  }

  // If the cleaned name is too short, add prefix
  if (cleaned.length < 2) {
    return `${prefix} ${cleaned}`;
  }

  return cleaned;
}

// Birthday role management
function addBirthdayRole(guildId, userId, roleId, expiresAt) {
  const config = getGuildConfig(guildId);

  if (!config.birthdayRoles) {
    config.birthdayRoles = {};
  }

  config.birthdayRoles[userId] = {
    guildId,
    userId,
    roleId,
    expiresAt,
  };

  // Save in background, don't block
  saveModerationData().catch(err => {
    console.error('Failed to save birthday role', { guildId, userId, error: err });
  });
}

function removeBirthdayRole(guildId, userId) {
  const config = getGuildConfig(guildId);

  if (!config.birthdayRoles) {
    return false;
  }

  if (config.birthdayRoles[userId]) {
    delete config.birthdayRoles[userId];
    // Save in background, don't block
    saveModerationData().catch(err => {
      console.error('Failed to save birthday role removal', { guildId, userId, error: err });
    });
    return true;
  }

  return false;
}

function getExpiredBirthdayRoles(guildId) {
  const config = getGuildConfig(guildId);

  if (!config.birthdayRoles) {
    return [];
  }

  const now = Date.now();
  const expired = [];

  for (const [userId, birthdayRole] of Object.entries(config.birthdayRoles)) {
    if (birthdayRole.expiresAt <= now) {
      expired.push({ userId, ...birthdayRole });
    }
  }

  return expired;
}

function getAllExpiredBirthdayRoles() {
  const allExpired = [];

  for (const [guildId, guildData] of Object.entries(moderationData)) {
    if (guildData.birthdayRoles) {
      const now = Date.now();
      for (const [userId, birthdayRole] of Object.entries(guildData.birthdayRoles)) {
        if (birthdayRole.expiresAt <= now) {
          allExpired.push({ userId, guildId, ...birthdayRole });
        }
      }
    }
  }

  return allExpired;
}

function getAllBirthdayRoles() {
  const allRoles = [];

  for (const [guildId, guildData] of Object.entries(moderationData)) {
    if (guildData.birthdayRoles) {
      for (const [userId, birthdayRole] of Object.entries(guildData.birthdayRoles)) {
        allRoles.push({ userId, guildId, ...birthdayRole });
      }
    }
  }

  return allRoles;
}

// Anti-raid config defaults helper
function ensureAntiRaidConfigDefaults(config) {
  if (!config.antiRaid) {
    config.antiRaid = {
      accountAge: { enabled: false },
      joinSpam: { enabled: false },
      lockdown: { active: false, lockedChannels: [] },
      verification: { enabled: false },
    };
  }

  if (!config.antiRaid.lockdown) {
    config.antiRaid.lockdown = { active: false, lockedChannels: [] };
  }

  return config;
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
  addCase,
  addLog,
  getLogs,
  getCase,
  updateCaseReason,
  deleteCase,
  getCasesByUser,
  trackUserMessage,
  getUserRecentMessages,
  trackUserAttachment,
  getUserRecentAttachments,
  isWhitelisted,
  getDefaultGuildConfig,
  addTempban,
  removeTempban,
  getExpiredTempbans,
  getAllTempbans,
  trackMemberJoin,
  getRecentJoins,
  trackVerificationMessage,
  getVerificationMessage,
  clearVerificationMessage,
  shouldDehoist,
  generateDehoistedName,
  addBirthdayRole,
  removeBirthdayRole,
  getExpiredBirthdayRoles,
  getAllExpiredBirthdayRoles,
  getAllBirthdayRoles,
  ensureAntiRaidConfigDefaults,
  canModerate,
};
