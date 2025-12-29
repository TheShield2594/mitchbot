const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

const achievementsPath = path.join(__dirname, '..', 'data', 'achievements.json');
let achievementsData = {};
let writeQueue = Promise.resolve();
let hasLoaded = false;

function getDefaultGuildAchievements() {
  return {
    users: {}, // { userId: { unlocked: [], stats: {}, username: '' } }
  };
}

function ensureAchievementsFile() {
  try {
    if (!fs.existsSync(achievementsPath)) {
      fs.mkdirSync(path.dirname(achievementsPath), { recursive: true });
      fs.writeFileSync(achievementsPath, JSON.stringify({}, null, 2));
    }
  } catch (error) {
    console.warn('Failed to ensure achievements file', { error });
  }
}

async function loadAchievementsData() {
  ensureAchievementsFile();

  try {
    const data = await fsp.readFile(achievementsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load achievements data', { error });
    return {};
  }
}

function loadAchievementsDataSync() {
  ensureAchievementsFile();

  try {
    const data = fs.readFileSync(achievementsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load achievements data', { error });
    return {};
  }
}

function saveAchievementsData() {
  const payload = JSON.stringify(achievementsData, null, 2);
  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${achievementsPath}.tmp`;
      await fsp.writeFile(tmpPath, payload, 'utf8');
      await fsp.rename(tmpPath, achievementsPath);
    })
    .catch((error) => {
      console.warn('Failed to save achievements data', { error });
    });

  return writeQueue;
}

async function initAchievements() {
  if (hasLoaded) {
    return;
  }

  achievementsData = await loadAchievementsData();
  hasLoaded = true;
}

function ensureAchievementsDataLoaded() {
  if (hasLoaded) {
    return;
  }

  achievementsData = loadAchievementsDataSync();
  hasLoaded = true;
}

function getGuildAchievements(guildId) {
  ensureAchievementsDataLoaded();

  if (!achievementsData[guildId]) {
    achievementsData[guildId] = getDefaultGuildAchievements();
  }

  return achievementsData[guildId];
}

function getUserData(guildId, userId, username = 'Unknown') {
  const guildData = getGuildAchievements(guildId);

  if (!guildData.users[userId]) {
    guildData.users[userId] = {
      unlocked: [],
      stats: {
        commandsUsed: 0,
        daysSeen: 0,
        firstSeen: new Date().toISOString(),
      },
      username: username,
    };
  }

  // Update username
  guildData.users[userId].username = username;

  return guildData.users[userId];
}

// Achievement definitions
const ACHIEVEMENTS = [
  {
    id: 'first_command',
    name: 'First Steps',
    description: 'Used your first command. Regrettable.',
    emoji: '🏆',
    condition: (stats) => stats.commandsUsed >= 1,
  },
  {
    id: 'persistent',
    name: 'Persistent',
    description: 'Used 10 commands. Commitment issues resolved.',
    emoji: '🏆',
    condition: (stats) => stats.commandsUsed >= 10,
  },
  {
    id: 'regular',
    name: 'Regular',
    description: 'Used 50 commands. You\'re here a lot.',
    emoji: '🏆',
    condition: (stats) => stats.commandsUsed >= 50,
  },
  {
    id: 'obsessed',
    name: 'Obsessed',
    description: 'Used 100 commands. Get help.',
    emoji: '🏆',
    condition: (stats) => stats.commandsUsed >= 100,
  },
  {
    id: 'no_life',
    name: 'No Life',
    description: 'Used 500 commands. Go outside.',
    emoji: '🏆',
    condition: (stats) => stats.commandsUsed >= 500,
  },
  {
    id: 'week_veteran',
    name: 'Week Veteran',
    description: 'Been here a week. Questionable.',
    emoji: '📅',
    condition: (stats) => {
      const daysSince = Math.floor((Date.now() - new Date(stats.firstSeen).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= 7;
    },
  },
  {
    id: 'month_veteran',
    name: 'Month Veteran',
    description: 'Been here a month. Concerning.',
    emoji: '📅',
    condition: (stats) => {
      const daysSince = Math.floor((Date.now() - new Date(stats.firstSeen).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= 30;
    },
  },
  {
    id: 'trivia_novice',
    name: 'Trivia Novice',
    description: 'Won 5 trivia questions. Knowledge seeker.',
    emoji: '🧠',
    condition: (stats) => (stats.triviaWins || 0) >= 5,
  },
  {
    id: 'trivia_expert',
    name: 'Trivia Expert',
    description: 'Won 25 trivia questions. Show-off.',
    emoji: '🧠',
    condition: (stats) => (stats.triviaWins || 0) >= 25,
  },
  {
    id: 'quest_starter',
    name: 'Quest Starter',
    description: 'Completed 5 quests. The grind begins.',
    emoji: '🗺️',
    condition: (stats) => (stats.questsCompleted || 0) >= 5,
  },
  {
    id: 'quest_addict',
    name: 'Quest Addict',
    description: 'Completed 30 quests. Dedication noted.',
    emoji: '🗺️',
    condition: (stats) => (stats.questsCompleted || 0) >= 30,
  },
  {
    id: 'streak_week',
    name: 'Streak Week',
    description: '7-day quest streak. Impressive commitment.',
    emoji: '🔥',
    condition: (stats) => (stats.bestQuestStreak || 0) >= 7,
  },
  {
    id: 'streak_month',
    name: 'Streak Month',
    description: '30-day quest streak. I have concerns.',
    emoji: '🔥',
    condition: (stats) => (stats.bestQuestStreak || 0) >= 30,
  },
];

function checkAchievements(guildId, userId, username, userStats) {
  const userData = getUserData(guildId, userId, username);
  const newlyUnlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (userData.unlocked.includes(achievement.id)) {
      continue;
    }

    // Check condition
    if (achievement.condition(userStats)) {
      userData.unlocked.push(achievement.id);
      newlyUnlocked.push(achievement);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveAchievementsData();
  }

  return newlyUnlocked;
}

function updateUserStats(guildId, userId, username, statUpdates) {
  const userData = getUserData(guildId, userId, username);

  // Merge stat updates
  for (const [key, value] of Object.entries(statUpdates)) {
    if (typeof value === 'number' && typeof userData.stats[key] === 'number') {
      userData.stats[key] += value;
    } else {
      userData.stats[key] = value;
    }
  }

  saveAchievementsData();

  // Check for new achievements
  return checkAchievements(guildId, userId, username, userData.stats);
}

function getUserAchievements(guildId, userId, username = 'Unknown') {
  const userData = getUserData(guildId, userId, username);

  const unlocked = ACHIEVEMENTS.filter(a => userData.unlocked.includes(a.id));
  const locked = ACHIEVEMENTS.filter(a => !userData.unlocked.includes(a.id));

  return {
    unlocked,
    locked,
    stats: userData.stats,
    progress: `${unlocked.length}/${ACHIEVEMENTS.length}`,
  };
}

function getAchievementById(achievementId) {
  return ACHIEVEMENTS.find(a => a.id === achievementId);
}

module.exports = {
  initAchievements,
  updateUserStats,
  getUserAchievements,
  getAchievementById,
  ACHIEVEMENTS,
};
