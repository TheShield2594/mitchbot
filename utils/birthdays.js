const fs = require('fs');
const path = require('path');

const fsp = fs.promises;
const birthdaysPath = path.join(__dirname, '..', 'data', 'birthdays.json');

// Write queue to serialize writes and prevent race conditions
let writeQueue = Promise.resolve();

// Prototype pollution protection
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Validate that a key is safe to use as an object property
 * Prevents prototype pollution attacks
 * @param {string} key - The key to validate
 * @returns {boolean} - True if safe, false if dangerous
 */
function isSafeKey(key) {
  if (!key || typeof key !== 'string') return false;
  return !DANGEROUS_KEYS.includes(key);
}

async function ensureBirthdaysFile() {
  try {
    if (!fs.existsSync(birthdaysPath)) {
      await fsp.mkdir(path.dirname(birthdaysPath), { recursive: true });
      await fsp.writeFile(birthdaysPath, JSON.stringify({}, null, 4));
    }
  } catch (error) {
    console.warn('Failed to ensure birthdays file', { error });
  }
}

// Synchronous version for initial load
function loadBirthdaysSync() {
  try {
    if (!fs.existsSync(birthdaysPath)) {
      fs.mkdirSync(path.dirname(birthdaysPath), { recursive: true });
      fs.writeFileSync(birthdaysPath, JSON.stringify({}, null, 4));
    }
    const data = fs.readFileSync(birthdaysPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(error);
    return {};
  }
}

async function loadBirthdays() {
  await ensureBirthdaysFile();

  try {
    const data = await fsp.readFile(birthdaysPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(error);
    return {};
  }
}

async function saveBirthdays(birthdays) {
  const payload = JSON.stringify(birthdays, null, 4);
  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${birthdaysPath}.tmp`;
      await fsp.writeFile(tmpPath, payload, 'utf8');
      await fsp.rename(tmpPath, birthdaysPath);
    })
    .catch((error) => {
      console.error('Failed to save birthdays', { error });
    });

  return writeQueue;
}

let birthdays = loadBirthdaysSync();

/**
 * Migrate from old global format to new per-guild format
 * Old format: { "userId": "MM-DD" }
 * New format: { "guildId": { "userId": "MM-DD" } }
 *
 * @param {Array<string>} guildIds - Array of guild IDs to migrate birthdays to
 * @returns {boolean} - True if migration was performed, false if already migrated
 */
async function migrateToPerGuild(guildIds) {
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
  const stringCount = values.filter(v => typeof v === 'string').length;
  const objectCount = values.filter(v => typeof v === 'object' && v !== null).length;

  // Detect mixed state (partial migration or corruption)
  if (stringCount > 0 && objectCount > 0) {
    console.error('[Birthdays] MIXED STATE DETECTED! Data contains both old-format strings and new-format objects');
    console.error(`[Birthdays] Found ${stringCount} string values and ${objectCount} object values`);
    console.error('[Birthdays] This indicates a partial migration or data corruption');
    console.error('[Birthdays] Manual intervention required - please backup and fix data/birthdays.json');
    return false;
  }

  // Already fully migrated
  if (objectCount === values.length) {
    console.log('[Birthdays] Already in new per-guild format');
    return false;
  }

  // Check all values are strings (old format)
  if (stringCount !== values.length) {
    console.error('[Birthdays] Unexpected data format - values are neither all strings nor all objects');
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
  await saveBirthdays(birthdays);

  console.log(`[Birthdays] Migration complete. Copied ${Object.keys(oldBirthdays).length} birthdays to ${validGuildIds.length} guilds`);
  return true;
}

/**
 * Get all birthdays for a specific guild (read-only)
 * @param {string} guildId - Guild ID
 * @returns {Object} - Object with userId as key and date as value (shallow copy)
 */
function getBirthdays(guildId) {
  if (!guildId) {
    console.warn('[Birthdays] getBirthdays called without guildId');
    return {};
  }

  // Prevent prototype pollution
  if (!isSafeKey(guildId)) {
    console.error('[Birthdays] Unsafe guildId detected (prototype pollution attempt)');
    return {};
  }

  // Return shallow copy of guild birthdays to prevent external mutation
  return birthdays[guildId] ? { ...birthdays[guildId] } : {};
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
async function addBirthday(guildId, userId, date) {
  if (!guildId) {
    console.error('[Birthdays] addBirthday called without guildId');
    return;
  }

  // Prevent prototype pollution
  if (!isSafeKey(guildId)) {
    console.error('[Birthdays] Unsafe guildId detected (prototype pollution attempt)');
    return;
  }

  // Validate userId
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    console.error('[Birthdays] addBirthday called with invalid userId');
    return;
  }

  // Prevent prototype pollution on userId
  if (!isSafeKey(userId)) {
    console.error('[Birthdays] Unsafe userId detected (prototype pollution attempt)');
    return;
  }

  // Validate date format (MM-DD)
  if (!date || typeof date !== 'string') {
    console.error('[Birthdays] addBirthday called with invalid date type');
    return;
  }

  const datePattern = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  if (!datePattern.test(date)) {
    console.error('[Birthdays] addBirthday called with invalid date format (expected MM-DD)');
    return;
  }

  // Validate it's a real date (e.g., not 02-30)
  const [month, day] = date.split('-').map(Number);
  const testDate = new Date(2024, month - 1, day); // Use leap year for Feb 29
  if (testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
    console.error('[Birthdays] addBirthday called with invalid calendar date');
    return;
  }

  if (!birthdays[guildId]) {
    birthdays[guildId] = {};
  }

  birthdays[guildId][userId] = date;
  await saveBirthdays(birthdays);
}

/**
 * Remove a birthday for a user in a specific guild
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 */
async function removeBirthday(guildId, userId) {
  if (!guildId) {
    console.error('[Birthdays] removeBirthday called without guildId');
    return;
  }

  // Prevent prototype pollution
  if (!isSafeKey(guildId)) {
    console.error('[Birthdays] Unsafe guildId detected (prototype pollution attempt)');
    return;
  }

  // Validate userId
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    console.error('[Birthdays] removeBirthday called with invalid userId');
    return;
  }

  // Prevent prototype pollution on userId
  if (!isSafeKey(userId)) {
    console.error('[Birthdays] Unsafe userId detected (prototype pollution attempt)');
    return;
  }

  if (!birthdays[guildId]) {
    return;
  }

  delete birthdays[guildId][userId];
  await saveBirthdays(birthdays);
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
