const fsp = require('fs').promises;
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'xp.json');
let xpData = {};
let writeQueue = Promise.resolve();

/**
 * Initialize the XP system
 */
async function initXP() {
  try {
    const data = await fsp.readFile(dataPath, 'utf8');
    xpData = JSON.parse(data);
    console.log('[XP] XP system initialized');
  } catch (err) {
    if (err.code === 'ENOENT') {
      xpData = {};
      await saveXPData();
      console.log('[XP] Created new xp.json file');
    } else {
      console.error('[XP] Error loading XP data:', err);
    }
  }
}

/**
 * Save XP data to file with atomic write
 */
async function saveXPData() {
  const payload = JSON.stringify(xpData, null, 2);
  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${dataPath}.tmp`;
      await fsp.writeFile(tmpPath, payload, 'utf8');
      await fsp.rename(tmpPath, dataPath);
    })
    .catch((err) => {
      console.error('[XP] Error saving XP data:', err);
    });
  return writeQueue;
}

/**
 * Get default guild XP configuration
 */
function getDefaultGuildConfig() {
  return {
    enabled: true,
    xpPerMessage: 15,
    xpPerCommand: 25,
    minXpPerMessage: 10,
    maxXpPerMessage: 20,
    cooldown: 60, // seconds between XP gains
    levelUpChannel: null, // Channel ID for level-up announcements
    levelUpMessage: '🎉 {user} just reached **Level {level}**! Keep it up!',
    announceLevelUp: true,
    levelRoles: [], // Array of { level: number, roleId: string }
    channelMultipliers: {}, // { channelId: multiplier }
    roleMultipliers: {}, // { roleId: multiplier }
    xpGainChannels: [], // If set, only these channels give XP (empty = all channels)
    noXpChannels: [], // Channels that don't give XP
    noXpRoles: [], // Roles that don't gain XP
  };
}

/**
 * Get default user XP data
 */
function getDefaultUserData(username = 'Unknown') {
  return {
    xp: 0,
    level: 1,
    totalXp: 0,
    lastXpGain: 0,
    messageCount: 0,
    username: username,
  };
}

/**
 * Get guild XP data
 */
function getGuildData(guildId) {
  if (!xpData[guildId]) {
    xpData[guildId] = {
      config: getDefaultGuildConfig(),
      users: {},
    };
    saveXPData();
  }
  return xpData[guildId];
}

/**
 * Get user XP data
 */
function getUserData(guildId, userId, username = 'Unknown') {
  const guildData = getGuildData(guildId);

  if (!guildData.users[userId]) {
    guildData.users[userId] = getDefaultUserData(username);
    saveXPData();
  } else if (username !== 'Unknown' && guildData.users[userId].username !== username) {
    guildData.users[userId].username = username;
    saveXPData();
  }

  return guildData.users[userId];
}

/**
 * Calculate level from XP
 * Formula: level = floor(sqrt(xp / 100))
 * XP needed for level n: n^2 * 100
 */
function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

/**
 * Calculate XP needed for next level
 */
function getXpForLevel(level) {
  return Math.pow(level - 1, 2) * 100;
}

/**
 * Calculate XP needed for next level
 */
function getXpForNextLevel(currentLevel) {
  return getXpForLevel(currentLevel + 1);
}

/**
 * Award XP to a user for sending a message
 */
function awardMessageXP(guildId, userId, username, channelId, userRoles = []) {
  const guildData = getGuildData(guildId);
  const config = guildData.config;

  // Check if XP system is enabled
  if (!config.enabled) {
    return null;
  }

  // Check cooldown
  const userData = getUserData(guildId, userId, username);
  const now = Date.now();
  if (now - userData.lastXpGain < config.cooldown * 1000) {
    return null;
  }

  // Check if user has no-XP role
  if (config.noXpRoles.length > 0) {
    const hasNoXpRole = userRoles.some(roleId => config.noXpRoles.includes(roleId));
    if (hasNoXpRole) return null;
  }

  // Check if channel is blocked
  if (config.noXpChannels.includes(channelId)) {
    return null;
  }

  // Check if we're limiting to specific channels
  if (config.xpGainChannels.length > 0 && !config.xpGainChannels.includes(channelId)) {
    return null;
  }

  // Calculate base XP (random between min and max)
  const baseXP = Math.floor(
    Math.random() * (config.maxXpPerMessage - config.minXpPerMessage + 1) + config.minXpPerMessage
  );

  // Apply channel multiplier
  let multiplier = 1;
  if (config.channelMultipliers[channelId]) {
    multiplier *= config.channelMultipliers[channelId];
  }

  // Apply role multipliers (stack them)
  userRoles.forEach(roleId => {
    if (config.roleMultipliers[roleId]) {
      multiplier *= config.roleMultipliers[roleId];
    }
  });

  const xpGained = Math.floor(baseXP * multiplier);
  const oldLevel = userData.level;

  // Award XP
  userData.xp += xpGained;
  userData.totalXp += xpGained;
  userData.messageCount += 1;
  userData.lastXpGain = now;

  // Calculate new level
  const newLevel = calculateLevel(userData.totalXp);
  userData.level = newLevel;

  saveXPData();

  return {
    xpGained,
    totalXp: userData.totalXp,
    currentXp: userData.xp,
    level: newLevel,
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
  };
}

/**
 * Award XP to a user for using a command
 */
function awardCommandXP(guildId, userId, username, channelId, userRoles = []) {
  const guildData = getGuildData(guildId);
  const config = guildData.config;

  // Check if XP system is enabled
  if (!config.enabled) {
    return null;
  }

  // Commands ignore cooldown
  const userData = getUserData(guildId, userId, username);

  // Check if user has no-XP role
  if (config.noXpRoles.length > 0) {
    const hasNoXpRole = userRoles.some(roleId => config.noXpRoles.includes(roleId));
    if (hasNoXpRole) return null;
  }

  // Calculate XP with multipliers
  let xpGained = config.xpPerCommand;
  let multiplier = 1;

  // Apply channel multiplier
  if (config.channelMultipliers[channelId]) {
    multiplier *= config.channelMultipliers[channelId];
  }

  // Apply role multipliers
  userRoles.forEach(roleId => {
    if (config.roleMultipliers[roleId]) {
      multiplier *= config.roleMultipliers[roleId];
    }
  });

  xpGained = Math.floor(xpGained * multiplier);
  const oldLevel = userData.level;

  // Award XP
  userData.xp += xpGained;
  userData.totalXp += xpGained;

  // Calculate new level
  const newLevel = calculateLevel(userData.totalXp);
  userData.level = newLevel;

  saveXPData();

  return {
    xpGained,
    totalXp: userData.totalXp,
    currentXp: userData.xp,
    level: newLevel,
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
  };
}

/**
 * Get XP leaderboard for a guild
 */
function getLeaderboard(guildId, limit = 10) {
  const guildData = getGuildData(guildId);

  const leaderboard = Object.entries(guildData.users)
    .map(([userId, data]) => ({
      userId,
      username: data.username,
      level: data.level,
      totalXp: data.totalXp,
      xp: data.xp,
      messageCount: data.messageCount || 0,
    }))
    .sort((a, b) => b.totalXp - a.totalXp)
    .slice(0, limit);

  return leaderboard;
}

/**
 * Get user's rank in the guild
 */
function getUserRank(guildId, userId) {
  const guildData = getGuildData(guildId);

  const sortedUsers = Object.entries(guildData.users)
    .sort((a, b) => b[1].totalXp - a[1].totalXp);

  const rank = sortedUsers.findIndex(([id]) => id === userId) + 1;
  return rank || null;
}

/**
 * Get guild XP configuration
 */
function getGuildConfig(guildId) {
  const guildData = getGuildData(guildId);
  return guildData.config;
}

/**
 * Update guild XP configuration
 */
async function updateGuildConfig(guildId, updates) {
  const guildData = getGuildData(guildId);

  // Deep merge the updates
  guildData.config = {
    ...guildData.config,
    ...updates,
  };

  await saveXPData();
  return guildData.config;
}

/**
 * Set a level role reward
 */
async function setLevelRole(guildId, level, roleId) {
  const config = getGuildConfig(guildId);

  // Remove existing role for this level if any
  config.levelRoles = config.levelRoles.filter(lr => lr.level !== level);

  // Add new role
  config.levelRoles.push({ level, roleId });

  // Sort by level
  config.levelRoles.sort((a, b) => a.level - b.level);

  await saveXPData();
  return config.levelRoles;
}

/**
 * Remove a level role reward
 */
async function removeLevelRole(guildId, level) {
  const config = getGuildConfig(guildId);

  config.levelRoles = config.levelRoles.filter(lr => lr.level !== level);

  await saveXPData();
  return config.levelRoles;
}

/**
 * Get roles that should be awarded for a level
 */
function getRolesForLevel(guildId, level) {
  const config = getGuildConfig(guildId);

  return config.levelRoles
    .filter(lr => lr.level <= level)
    .map(lr => lr.roleId);
}

/**
 * Set channel XP multiplier
 */
async function setChannelMultiplier(guildId, channelId, multiplier) {
  const config = getGuildConfig(guildId);

  if (multiplier === 1) {
    delete config.channelMultipliers[channelId];
  } else {
    config.channelMultipliers[channelId] = multiplier;
  }

  await saveXPData();
  return config.channelMultipliers;
}

/**
 * Set role XP multiplier
 */
async function setRoleMultiplier(guildId, roleId, multiplier) {
  const config = getGuildConfig(guildId);

  if (multiplier === 1) {
    delete config.roleMultipliers[roleId];
  } else {
    config.roleMultipliers[roleId] = multiplier;
  }

  await saveXPData();
  return config.roleMultipliers;
}

/**
 * Reset user XP
 */
async function resetUserXP(guildId, userId) {
  const guildData = getGuildData(guildId);

  if (guildData.users[userId]) {
    const username = guildData.users[userId].username;
    guildData.users[userId] = getDefaultUserData(username);
    await saveXPData();
    return true;
  }

  return false;
}

/**
 * Reset all XP for a guild
 */
async function resetGuildXP(guildId) {
  const guildData = getGuildData(guildId);

  // Keep usernames but reset all XP
  Object.keys(guildData.users).forEach(userId => {
    const username = guildData.users[userId].username;
    guildData.users[userId] = getDefaultUserData(username);
  });

  await saveXPData();
  return true;
}

module.exports = {
  initXP,
  awardMessageXP,
  awardCommandXP,
  getUserData,
  getLeaderboard,
  getUserRank,
  getGuildConfig,
  updateGuildConfig,
  setLevelRole,
  removeLevelRole,
  getRolesForLevel,
  setChannelMultiplier,
  setRoleMultiplier,
  resetUserXP,
  resetGuildXP,
  calculateLevel,
  getXpForLevel,
  getXpForNextLevel,
};
