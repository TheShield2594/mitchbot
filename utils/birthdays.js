const fs = require('fs');
const path = require('path');

const birthdaysPath = path.join(__dirname, '..', 'data', 'birthdays.json');

function ensureBirthdaysFile() {
  try {
    if (!fs.existsSync(birthdaysPath)) {
      fs.mkdirSync(path.dirname(birthdaysPath), { recursive: true });
      fs.writeFileSync(birthdaysPath, JSON.stringify({}, null, 4));
    }
  } catch (error) {
    console.warn('Failed to ensure birthdays file', { error });
  }
}

function loadBirthdays() {
  ensureBirthdaysFile();

  try {
    const data = fs.readFileSync(birthdaysPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(error);
    return {};
  }
}

function saveBirthdays(birthdays) {
  try {
    fs.writeFileSync(birthdaysPath, JSON.stringify(birthdays, null, 4));
  } catch (error) {
    console.error(error);
  }
}

let birthdays = loadBirthdays();

/**
 * Migrate from old global format to new per-guild format
 * Old format: { "userId": "MM-DD" }
 * New format: { "guildId": { "userId": "MM-DD" } }
 *
 * @param {Array<string>} guildIds - Array of guild IDs to migrate birthdays to
 * @returns {boolean} - True if migration was performed, false if already migrated
 */
function migrateToPerGuild(guildIds) {
  // Validate guildIds parameter
  if (!guildIds || !Array.isArray(guildIds) || guildIds.length === 0) {
    console.log('[Birthdays] No guilds provided for migration');
    return false;
  }

  // Filter out any empty/invalid guild IDs
  const validGuildIds = guildIds.filter(id => id && typeof id === 'string' && id.trim().length > 0);
  if (validGuildIds.length === 0) {
    console.log('[Birthdays] No valid guild IDs provided for migration');
    return false;
  }

  const keys = Object.keys(birthdays);
  if (keys.length === 0) {
    return false; // No data to migrate
  }

  // Check if ALL values are strings (old format) or ANY value is an object (new format)
  // Old format: all values should be strings (date format "MM-DD")
  // New format: all values should be objects (nested guild data)
  const values = Object.values(birthdays);
  const allValuesAreStrings = values.every(v => typeof v === 'string');
  const anyValueIsObject = values.some(v => typeof v === 'object' && v !== null);

  if (anyValueIsObject) {
    console.log('[Birthdays] Already in new per-guild format');
    return false;
  }

  if (!allValuesAreStrings) {
    console.error('[Birthdays] Unexpected data format - not all values are strings or objects');
    return false;
  }

  console.log('[Birthdays] Migrating from global to per-guild format...');
  const oldBirthdays = { ...birthdays };
  const newBirthdays = {};

  // Copy all existing birthdays to each valid guild
  for (const guildId of validGuildIds) {
    newBirthdays[guildId] = { ...oldBirthdays };
  }

  birthdays = newBirthdays;
  saveBirthdays(birthdays);

  console.log(`[Birthdays] Migration complete. Copied ${Object.keys(oldBirthdays).length} birthdays to ${validGuildIds.length} guilds`);
  return true;
}

/**
 * Get all birthdays for a specific guild (read-only)
 * @param {string} guildId - Guild ID
 * @returns {Object} - Object with userId as key and date as value
 */
function getBirthdays(guildId) {
  if (!guildId) {
    // Return empty object if no guildId provided
    console.warn('[Birthdays] getBirthdays called without guildId');
    return {};
  }

  // Return guild birthdays or empty object without modifying state
  return birthdays[guildId] || {};
}

/**
 * Get all birthdays across all guilds (for dashboard overview)
 * @returns {Object} - Object with guildId as key and birthdays object as value (copy)
 */
function getAllBirthdays() {
  // Return a deep copy to prevent external mutation of internal state
  return JSON.parse(JSON.stringify(birthdays));
}

/**
 * Add a birthday for a user in a specific guild
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {string} date - Birthday in MM-DD format
 */
function addBirthday(guildId, userId, date) {
  if (!guildId) {
    console.error('[Birthdays] addBirthday called without guildId');
    return;
  }

  if (!birthdays[guildId]) {
    birthdays[guildId] = {};
  }

  birthdays[guildId][userId] = date;
  saveBirthdays(birthdays);
}

/**
 * Remove a birthday for a user in a specific guild
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 */
function removeBirthday(guildId, userId) {
  if (!guildId) {
    console.error('[Birthdays] removeBirthday called without guildId');
    return;
  }

  if (!birthdays[guildId]) {
    return;
  }

  delete birthdays[guildId][userId];
  saveBirthdays(birthdays);
}

module.exports = {
  addBirthday,
  getBirthdays,
  getAllBirthdays,
  loadBirthdays,
  removeBirthday,
  saveBirthdays,
  migrateToPerGuild,
};
