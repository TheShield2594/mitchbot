const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

const reactionRolesPath = path.join(__dirname, '..', 'data', 'reactionRoles.json');
let reactionRolesData = {};
let writeQueue = Promise.resolve();

/**
 * Default guild reaction roles configuration
 * @returns {Object} Default configuration
 */
function getDefaultGuildConfig() {
  return {
    enabled: false,
    messages: {}, // { messageId: { channelId, roles: [{ emoji, roleId, description }] } }
  };
}

/**
 * Ensure the reaction roles data file exists
 */
function ensureReactionRolesFile() {
  try {
    if (!fs.existsSync(reactionRolesPath)) {
      fs.mkdirSync(path.dirname(reactionRolesPath), { recursive: true });
      fs.writeFileSync(reactionRolesPath, JSON.stringify({}, null, 2));
    }
  } catch (error) {
    console.warn('Failed to ensure reaction roles file', { error });
  }
}

/**
 * Load reaction roles data from disk
 * @returns {Promise<Object>} The loaded data
 */
async function loadReactionRolesData() {
  ensureReactionRolesFile();

  try {
    const data = await fsp.readFile(reactionRolesPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load reaction roles data', { error });
    return {};
  }
}

/**
 * Save reaction roles data to disk
 * @returns {Promise<void>}
 */
function saveReactionRolesData() {
  const payload = JSON.stringify(reactionRolesData, null, 2);
  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${reactionRolesPath}.tmp`;
      await fsp.writeFile(tmpPath, payload, 'utf8');
      await fsp.rename(tmpPath, reactionRolesPath);
    })
    .catch((error) => {
      console.error('Failed to save reaction roles data', { error });
      throw error;
    });

  return writeQueue;
}

/**
 * Initialize reaction roles system
 * @returns {Promise<void>}
 */
async function initReactionRoles() {
  reactionRolesData = await loadReactionRolesData();
}

/**
 * Get guild configuration
 * @param {string} guildId - The guild ID
 * @returns {Object} The guild configuration
 */
function getGuildConfig(guildId) {
  if (!reactionRolesData[guildId]) {
    reactionRolesData[guildId] = getDefaultGuildConfig();
  }
  return reactionRolesData[guildId];
}

/**
 * Update guild configuration
 * @param {string} guildId - The guild ID
 * @param {Object} config - The new configuration
 * @returns {Promise<void>}
 */
async function updateGuildConfig(guildId, config) {
  reactionRolesData[guildId] = { ...getDefaultGuildConfig(), ...config };
  await saveReactionRolesData();
}

/**
 * Add a reaction role message
 * @param {string} guildId - The guild ID
 * @param {string} messageId - The message ID
 * @param {string} channelId - The channel ID
 * @param {Array} roles - Array of {emoji, roleId, description}
 * @returns {Promise<Object>} The created message config
 */
async function addReactionRoleMessage(guildId, messageId, channelId, roles = []) {
  const config = getGuildConfig(guildId);

  config.messages[messageId] = {
    channelId,
    roles,
    createdAt: new Date().toISOString(),
  };

  await saveReactionRolesData();
  return config.messages[messageId];
}

/**
 * Remove a reaction role message
 * @param {string} guildId - The guild ID
 * @param {string} messageId - The message ID
 * @returns {Promise<boolean>} True if removed, false if not found
 */
async function removeReactionRoleMessage(guildId, messageId) {
  const config = getGuildConfig(guildId);

  if (!config.messages[messageId]) {
    return false;
  }

  delete config.messages[messageId];
  await saveReactionRolesData();
  return true;
}

/**
 * Add a role to a reaction role message
 * @param {string} guildId - The guild ID
 * @param {string} messageId - The message ID
 * @param {string} emoji - The emoji (can be unicode or custom emoji ID)
 * @param {string} roleId - The role ID
 * @param {string} description - Optional description
 * @returns {Promise<Object|null>} The updated message config or null if message not found
 */
async function addRoleToMessage(guildId, messageId, emoji, roleId, description = '') {
  const config = getGuildConfig(guildId);

  if (!config.messages[messageId]) {
    return null;
  }

  // Remove existing role with same emoji if it exists
  config.messages[messageId].roles = config.messages[messageId].roles.filter(
    (r) => r.emoji !== emoji
  );

  // Add new role
  config.messages[messageId].roles.push({ emoji, roleId, description });

  await saveReactionRolesData();
  return config.messages[messageId];
}

/**
 * Remove a role from a reaction role message
 * @param {string} guildId - The guild ID
 * @param {string} messageId - The message ID
 * @param {string} emoji - The emoji to remove
 * @returns {Promise<boolean>} True if removed, false if not found
 */
async function removeRoleFromMessage(guildId, messageId, emoji) {
  const config = getGuildConfig(guildId);

  if (!config.messages[messageId]) {
    return false;
  }

  const initialLength = config.messages[messageId].roles.length;
  config.messages[messageId].roles = config.messages[messageId].roles.filter(
    (r) => r.emoji !== emoji
  );

  if (config.messages[messageId].roles.length === initialLength) {
    return false; // No role was removed
  }

  await saveReactionRolesData();
  return true;
}

/**
 * Get reaction role message configuration
 * @param {string} guildId - The guild ID
 * @param {string} messageId - The message ID
 * @returns {Object|null} The message configuration or null if not found
 */
function getReactionRoleMessage(guildId, messageId) {
  const config = getGuildConfig(guildId);
  return config.messages[messageId] || null;
}

/**
 * Get role ID for a specific emoji on a message
 * @param {string} guildId - The guild ID
 * @param {string} messageId - The message ID
 * @param {string} emoji - The emoji identifier
 * @returns {string|null} The role ID or null if not found
 */
function getRoleForEmoji(guildId, messageId, emoji) {
  const message = getReactionRoleMessage(guildId, messageId);
  if (!message) return null;

  const roleConfig = message.roles.find((r) => r.emoji === emoji);
  return roleConfig ? roleConfig.roleId : null;
}

/**
 * Get all reaction role messages for a guild
 * @param {string} guildId - The guild ID
 * @returns {Object} All messages with their configurations
 */
function getAllReactionRoleMessages(guildId) {
  const config = getGuildConfig(guildId);
  return config.messages;
}

/**
 * Check if reaction roles are enabled for a guild
 * @param {string} guildId - The guild ID
 * @returns {boolean} True if enabled
 */
function isEnabled(guildId) {
  const config = getGuildConfig(guildId);
  return config.enabled === true;
}

/**
 * Enable or disable reaction roles for a guild
 * @param {string} guildId - The guild ID
 * @param {boolean} enabled - True to enable, false to disable
 * @returns {Promise<void>}
 */
async function setEnabled(guildId, enabled) {
  const config = getGuildConfig(guildId);
  config.enabled = enabled;
  await saveReactionRolesData();
}

module.exports = {
  initReactionRoles,
  getGuildConfig,
  updateGuildConfig,
  addReactionRoleMessage,
  removeReactionRoleMessage,
  addRoleToMessage,
  removeRoleFromMessage,
  getReactionRoleMessage,
  getRoleForEmoji,
  getAllReactionRoleMessages,
  isEnabled,
  setEnabled,
};
