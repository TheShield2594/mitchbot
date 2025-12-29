const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

const statsPath = path.join(__dirname, '..', 'data', 'stats.json');
let statsData = {};
let writeQueue = Promise.resolve();
let hasLoaded = false;

function getDefaultGuildStats() {
  return {
    commandUsage: {}, // { commandName: count }
    userActivity: {}, // { userId: { commands: count, lastActive: timestamp } }
    weeklySnapshots: [], // Array of weekly stats for history
    currentWeekStart: null,
  };
}

function ensureStatsFile() {
  try {
    if (!fs.existsSync(statsPath)) {
      fs.mkdirSync(path.dirname(statsPath), { recursive: true });
      fs.writeFileSync(statsPath, JSON.stringify({}, null, 2));
    }
  } catch (error) {
    console.warn('Failed to ensure stats file', { error });
  }
}

async function loadStatsData() {
  ensureStatsFile();

  try {
    const data = await fsp.readFile(statsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load stats data', { error });
    return {};
  }
}

function loadStatsDataSync() {
  ensureStatsFile();

  try {
    const data = fs.readFileSync(statsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load stats data', { error });
    return {};
  }
}

function saveStatsData() {
  const payload = JSON.stringify(statsData, null, 2);
  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${statsPath}.tmp`;
      await fsp.writeFile(tmpPath, payload, 'utf8');
      await fsp.rename(tmpPath, statsPath);
    })
    .catch((error) => {
      console.warn('Failed to save stats data', { error });
    });

  return writeQueue;
}

async function initStats() {
  if (hasLoaded) {
    return;
  }

  statsData = await loadStatsData();
  hasLoaded = true;
}

function ensureStatsDataLoaded() {
  if (hasLoaded) {
    return;
  }

  statsData = loadStatsDataSync();
  hasLoaded = true;
}

function getGuildStats(guildId) {
  ensureStatsDataLoaded();

  if (!statsData[guildId]) {
    statsData[guildId] = getDefaultGuildStats();
    statsData[guildId].currentWeekStart = getWeekStart(new Date());
  }

  return statsData[guildId];
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Sunday as start of week
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString();
}

function recordCommandUsage(guildId, commandName, userId) {
  const guildData = getGuildStats(guildId);
  const now = new Date();
  const currentWeekStart = getWeekStart(now);

  // Check if we need to rotate to a new week
  if (guildData.currentWeekStart !== currentWeekStart) {
    // Save current week as snapshot
    guildData.weeklySnapshots.push({
      weekStart: guildData.currentWeekStart,
      weekEnd: currentWeekStart,
      commandUsage: { ...guildData.commandUsage },
      totalCommands: Object.values(guildData.commandUsage).reduce((sum, count) => sum + count, 0),
      uniqueUsers: Object.keys(guildData.userActivity).length,
    });

    // Keep only last 12 weeks
    if (guildData.weeklySnapshots.length > 12) {
      guildData.weeklySnapshots = guildData.weeklySnapshots.slice(-12);
    }

    // Reset for new week
    guildData.commandUsage = {};
    guildData.userActivity = {};
    guildData.currentWeekStart = currentWeekStart;
  }

  // Record command usage
  guildData.commandUsage[commandName] = (guildData.commandUsage[commandName] || 0) + 1;

  // Record user activity
  if (!guildData.userActivity[userId]) {
    guildData.userActivity[userId] = { commands: 0, lastActive: null };
  }
  guildData.userActivity[userId].commands += 1;
  guildData.userActivity[userId].lastActive = now.toISOString();

  saveStatsData();
}

function getWeeklyRecap(guildId) {
  const guildData = getGuildStats(guildId);

  const totalCommands = Object.values(guildData.commandUsage).reduce((sum, count) => sum + count, 0);
  const uniqueUsers = Object.keys(guildData.userActivity).length;

  // Get top 3 commands
  const topCommands = Object.entries(guildData.commandUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cmd, count]) => ({ command: cmd, count }));

  // Get most active users (top 3)
  const topUsers = Object.entries(guildData.userActivity)
    .sort((a, b) => b[1].commands - a[1].commands)
    .slice(0, 3)
    .map(([userId, data]) => ({ userId, commands: data.commands }));

  return {
    totalCommands,
    uniqueUsers,
    topCommands,
    topUsers,
    weekStart: guildData.currentWeekStart,
  };
}

// Command-specific snarky messages (update this mapping for new commands)
const COMMAND_SNARK = {
  '8ball': 'Priorities.',
  'meme': 'Predictable.',
  'trivia': 'Knowledge seekers, apparently.',
  'quest': 'The grind continues.',
};

function generateRecapMessage(recap, guild) {
  if (recap.totalCommands === 0) {
    return 'This server ran 0 commands this week. Impressive commitment to silence.';
  }

  const messages = [];

  // Total commands
  messages.push(`This server ran ${recap.totalCommands} command${recap.totalCommands === 1 ? '' : 's'} this week.`);

  // Top commands with snarky commentary
  if (recap.topCommands.length > 0) {
    const topCmd = recap.topCommands[0];
    const percentage = ((topCmd.count / recap.totalCommands) * 100).toFixed(0);

    const snark = COMMAND_SNARK[topCmd.command];
    if (snark) {
      messages.push(`${topCmd.count} were \`/${topCmd.command}\`. ${snark}`);
    } else {
      messages.push(`Most popular: \`/${topCmd.command}\` (${topCmd.count} times). ${percentage}% of all activity.`);
    }
  }

  // Unique users
  if (recap.uniqueUsers === 1) {
    messages.push('Only 1 person used commands. Lonely.');
  } else if (recap.uniqueUsers > 0) {
    messages.push(`${recap.uniqueUsers} different people participated. Community effort.`);
  }

  return messages.join('\n');
}

function getServerStats(guildId) {
  const guildData = getGuildStats(guildId);

  const totalCommands = Object.values(guildData.commandUsage).reduce((sum, count) => sum + count, 0);
  const commandsList = Object.entries(guildData.commandUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    thisWeek: {
      total: totalCommands,
      uniqueUsers: Object.keys(guildData.userActivity).length,
      commands: commandsList,
    },
    history: guildData.weeklySnapshots.slice(-4), // Last 4 weeks
  };
}

module.exports = {
  initStats,
  recordCommandUsage,
  getWeeklyRecap,
  generateRecapMessage,
  getServerStats,
  getWeekStart,
};
