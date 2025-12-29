const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

const questsPath = path.join(__dirname, '..', 'data', 'quests.json');
let questData = {};
let writeQueue = Promise.resolve();
let hasLoaded = false;

function getDefaultGuildQuests() {
  return {
    streaks: {}, // { userId: { currentStreak, lastQuestDate, totalQuests, bestStreak } }
  };
}

function ensureQuestsFile() {
  if (!fs.existsSync(questsPath)) {
    fs.mkdirSync(path.dirname(questsPath), { recursive: true });
    fs.writeFileSync(questsPath, JSON.stringify({}, null, 2));
  }
}

async function loadQuestData() {
  ensureQuestsFile();

  try {
    const data = await fsp.readFile(questsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load quest data', { error });
    return {};
  }
}

function loadQuestDataSync() {
  ensureQuestsFile();

  try {
    const data = fs.readFileSync(questsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load quest data', { error });
    return {};
  }
}

function saveQuestData() {
  const payload = JSON.stringify(questData, null, 2);
  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${questsPath}.tmp`;
      await fsp.writeFile(tmpPath, payload, 'utf8');
      await fsp.rename(tmpPath, questsPath);
    })
    .catch((error) => {
      console.warn('Failed to save quest data', { error });
    });

  return writeQueue;
}

async function initQuests() {
  if (hasLoaded) {
    return;
  }

  questData = await loadQuestData();
  hasLoaded = true;
}

function ensureQuestDataLoaded() {
  if (hasLoaded) {
    return;
  }

  questData = loadQuestDataSync();
  hasLoaded = true;
}

function getGuildQuests(guildId) {
  ensureQuestDataLoaded();

  if (!questData[guildId]) {
    questData[guildId] = getDefaultGuildQuests();
  }

  return questData[guildId];
}

function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function recordQuestCompletion(guildId, userId) {
  const guildData = getGuildQuests(guildId);
  const today = getTodayDateString();

  if (!guildData.streaks[userId]) {
    guildData.streaks[userId] = {
      currentStreak: 0,
      lastQuestDate: null,
      totalQuests: 0,
      bestStreak: 0,
    };
  }

  const userStreak = guildData.streaks[userId];
  const lastDate = userStreak.lastQuestDate;

  // Check if already completed today
  if (lastDate === today) {
    return {
      alreadyCompleted: true,
      streak: userStreak.currentStreak,
      totalQuests: userStreak.totalQuests,
      bestStreak: userStreak.bestStreak,
    };
  }

  // Calculate if streak continues
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (lastDate === yesterdayString) {
    // Streak continues
    userStreak.currentStreak += 1;
  } else if (lastDate === null) {
    // First quest ever
    userStreak.currentStreak = 1;
  } else {
    // Streak broken
    userStreak.currentStreak = 1;
  }

  userStreak.lastQuestDate = today;
  userStreak.totalQuests += 1;
  userStreak.bestStreak = Math.max(userStreak.bestStreak, userStreak.currentStreak);

  saveQuestData();

  return {
    alreadyCompleted: false,
    streak: userStreak.currentStreak,
    totalQuests: userStreak.totalQuests,
    bestStreak: userStreak.bestStreak,
    isNewRecord: userStreak.currentStreak === userStreak.bestStreak && userStreak.currentStreak > 1,
  };
}

function getStreakMessage(streak, isNewRecord) {
  if (isNewRecord && streak > 1) {
    return `🏆 Day ${streak}. New personal record. Confusing.`;
  }

  if (streak === 1) {
    return 'Day 1. Here we go again.';
  } else if (streak === 2) {
    return 'Day 2. You came back.';
  } else if (streak === 3) {
    return 'Day 3. Commitment issues resolved, apparently.';
  } else if (streak === 5) {
    return 'Day 5. Still going for some reason.';
  } else if (streak === 7) {
    return 'Day 7. A full week. Impressive in the worst way.';
  } else if (streak === 14) {
    return 'Day 14. Two weeks of this.';
  } else if (streak === 30) {
    return 'Day 30. A month. I have concerns.';
  } else if (streak === 100) {
    return 'Day 100. Triple digits. Get help.';
  } else if (streak % 10 === 0) {
    return `Day ${streak}. Multiples of ten don't make it better.`;
  } else {
    return `Day ${streak}. Still counting.`;
  }
}

function getUserStreak(guildId, userId) {
  const guildData = getGuildQuests(guildId);
  return guildData.streaks[userId] || {
    currentStreak: 0,
    lastQuestDate: null,
    totalQuests: 0,
    bestStreak: 0,
  };
}

module.exports = {
  initQuests,
  recordQuestCompletion,
  getStreakMessage,
  getUserStreak,
  getTodayDateString,
};
