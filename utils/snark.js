const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

const snarkPath = path.join(__dirname, '..', 'data', 'snark.json');
let snarkData = {};
let writeQueue = Promise.resolve();
let hasLoaded = false;

function getDefaultGuildSnark() {
  return {
    customRoasts: [],
    customCompliments: [],
    customQuests: [],
  };
}

function ensureSnarkFile() {
  try {
    if (!fs.existsSync(snarkPath)) {
      fs.mkdirSync(path.dirname(snarkPath), { recursive: true });
      fs.writeFileSync(snarkPath, JSON.stringify({}, null, 2));
    }
  } catch (error) {
    console.warn('Failed to ensure snark file', { error });
  }
}

async function loadSnarkData() {
  ensureSnarkFile();

  try {
    const data = await fsp.readFile(snarkPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load snark data', { error });
    return {};
  }
}

function loadSnarkDataSync() {
  ensureSnarkFile();

  try {
    const data = fs.readFileSync(snarkPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load snark data', { error });
    return {};
  }
}

function saveSnarkData() {
  const payload = JSON.stringify(snarkData, null, 2);
  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${snarkPath}.tmp`;
      await fsp.writeFile(tmpPath, payload, 'utf8');
      await fsp.rename(tmpPath, snarkPath);
    })
    .catch((error) => {
      console.warn('Failed to save snark data', { error });
    });

  return writeQueue;
}

async function initSnark() {
  if (hasLoaded) {
    return;
  }

  snarkData = await loadSnarkData();
  hasLoaded = true;
}

function ensureSnarkDataLoaded() {
  if (hasLoaded) {
    return;
  }

  snarkData = loadSnarkDataSync();
  hasLoaded = true;
}

function getGuildSnark(guildId) {
  ensureSnarkDataLoaded();

  if (!snarkData[guildId]) {
    snarkData[guildId] = getDefaultGuildSnark();
  }

  return snarkData[guildId];
}

function addCustomSnark(guildId, type, content) {
  const guildData = getGuildSnark(guildId);

  const validTypes = ['roasts', 'compliments', 'quests'];

  // Validate type before using it
  if (!validTypes.includes(type)) {
    return { success: false, error: 'Invalid type. Use: roasts, compliments, or quests' };
  }

  const fieldName = `custom${type.charAt(0).toUpperCase() + type.slice(1)}`;

  if (!guildData[fieldName]) {
    guildData[fieldName] = [];
  }

  // Limit to 50 custom entries per type
  if (guildData[fieldName].length >= 50) {
    return { success: false, error: `Maximum of 50 custom ${type} reached` };
  }

  guildData[fieldName].push(content);
  saveSnarkData();

  return { success: true, count: guildData[fieldName].length };
}

function removeCustomSnark(guildId, type, index) {
  const guildData = getGuildSnark(guildId);

  const validTypes = ['roasts', 'compliments', 'quests'];
  const fieldName = `custom${type.charAt(0).toUpperCase() + type.slice(1)}`;

  if (!validTypes.includes(type)) {
    return { success: false, error: 'Invalid type. Use: roasts, compliments, or quests' };
  }

  if (!guildData[fieldName] || guildData[fieldName].length === 0) {
    return { success: false, error: `No custom ${type} found` };
  }

  if (index < 0 || index >= guildData[fieldName].length) {
    return { success: false, error: `Invalid index. Must be between 0 and ${guildData[fieldName].length - 1}` };
  }

  const removed = guildData[fieldName].splice(index, 1)[0];
  saveSnarkData();

  return { success: true, removed, remaining: guildData[fieldName].length };
}

function listCustomSnark(guildId, type) {
  const guildData = getGuildSnark(guildId);

  const validTypes = ['roasts', 'compliments', 'quests'];

  // Validate type before using it
  if (!validTypes.includes(type)) {
    return { success: false, error: 'Invalid type. Use: roasts, compliments, or quests' };
  }

  const fieldName = `custom${type.charAt(0).toUpperCase() + type.slice(1)}`;

  // Return shallow copy to prevent external mutations
  const items = guildData[fieldName] || [];
  return { success: true, items: [...items] };
}

function getRandomSnark(guildId, type, defaults) {
  const guildData = getGuildSnark(guildId);
  const fieldName = `custom${type.charAt(0).toUpperCase() + type.slice(1)}`;

  const customItems = guildData[fieldName] || [];
  const allItems = [...defaults, ...customItems];

  if (allItems.length === 0) {
    return null;
  }

  return allItems[Math.floor(Math.random() * allItems.length)];
}

module.exports = {
  initSnark,
  addCustomSnark,
  removeCustomSnark,
  listCustomSnark,
  getRandomSnark,
};
