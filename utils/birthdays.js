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
  // Check if already in new format
  // New format has guild IDs as top-level keys (snowflakes are 17-19 digit strings)
  // Old format has user IDs as top-level keys
  // We can detect by checking if any value is an object (new format) or string (old format)

  const keys = Object.keys(birthdays);
  if (keys.length === 0) {
    return false; // No data to migrate
  }

  // Check if first key's value is an object (new format) or string (old format)
  const firstValue = birthdays[keys[0]];
  const isOldFormat = typeof firstValue === 'string';

  if (!isOldFormat) {
    console.log('[Birthdays] Already in new per-guild format');
    return false;
  }

  console.log('[Birthdays] Migrating from global to per-guild format...');
  const oldBirthdays = { ...birthdays };
  const newBirthdays = {};

  // Copy all existing birthdays to each guild
  for (const guildId of guildIds) {
    newBirthdays[guildId] = { ...oldBirthdays };
  }

  birthdays = newBirthdays;
  saveBirthdays(birthdays);

  console.log(`[Birthdays] Migration complete. Copied ${Object.keys(oldBirthdays).length} birthdays to ${guildIds.length} guilds`);
  return true;
}

/**
 * Get all birthdays for a specific guild
 * @param {string} guildId - Guild ID
 * @returns {Object} - Object with userId as key and date as value
 */
function getBirthdays(guildId) {
  if (!guildId) {
    // Return empty object if no guildId provided
    console.warn('[Birthdays] getBirthdays called without guildId');
    return {};
  }

  if (!birthdays[guildId]) {
    birthdays[guildId] = {};
  }

  return birthdays[guildId];
}

/**
 * Get all birthdays across all guilds (for dashboard overview)
 * @returns {Object} - Object with guildId as key and birthdays object as value
 */
function getAllBirthdays() {
  return birthdays;
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
