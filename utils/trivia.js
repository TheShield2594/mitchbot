const fs = require('fs');
const path = require('path');
const { updateUserStats } = require('./achievements');

const fsp = fs.promises;

const triviaPath = path.join(__dirname, '..', 'data', 'trivia.json');
const POINTS_PER_WIN = 10;
const POINTS_MULTIPLIER = {
  easy: 1,
  medium: 2,
  hard: 3,
};

let triviaData = {};
let writeQueue = Promise.resolve();
let hasLoaded = false;

function getDefaultGuildTrivia() {
  return {
    leaderboard: {}, // { userId: { points, wins, totalAnswered, username } }
  };
}

function ensureTriviaFile() {
  if (!fs.existsSync(triviaPath)) {
    fs.mkdirSync(path.dirname(triviaPath), { recursive: true });
    fs.writeFileSync(triviaPath, JSON.stringify({}, null, 2));
  }
}

async function loadTriviaData() {
  ensureTriviaFile();

  try {
    const data = await fsp.readFile(triviaPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load trivia data', { error });
    return {};
  }
}

function loadTriviaDataSync() {
  ensureTriviaFile();

  try {
    const data = fs.readFileSync(triviaPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load trivia data', { error });
    return {};
  }
}

function saveTriviaData() {
  const payload = JSON.stringify(triviaData, null, 2);
  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${triviaPath}.tmp`;
      await fsp.writeFile(tmpPath, payload, 'utf8');
      await fsp.rename(tmpPath, triviaPath);
    })
    .catch((error) => {
      console.warn('Failed to save trivia data', { error });
    });

  return writeQueue;
}

async function initTrivia() {
  if (hasLoaded) {
    return;
  }

  triviaData = await loadTriviaData();
  hasLoaded = true;
}

function ensureTriviaDataLoaded() {
  if (hasLoaded) {
    return;
  }

  triviaData = loadTriviaDataSync();
  hasLoaded = true;
}

function getGuildTrivia(guildId) {
  ensureTriviaDataLoaded();

  if (!triviaData[guildId]) {
    triviaData[guildId] = getDefaultGuildTrivia();
  }

  return triviaData[guildId];
}

// Helper to initialize or get leaderboard entry for a user
function initLeaderboardUser(guildData, userId, username) {
  if (!guildData.leaderboard[userId]) {
    guildData.leaderboard[userId] = {
      points: 0,
      wins: 0,
      totalAnswered: 0,
      username: username,
    };
  }

  const userData = guildData.leaderboard[userId];
  userData.username = username; // Update username in case it changed

  return userData;
}

function recordTriviaWin(guildId, userId, username, difficulty = 'medium') {
  const guildData = getGuildTrivia(guildId);
  const userData = initLeaderboardUser(guildData, userId, username);
  const pointsEarned = POINTS_PER_WIN * (POINTS_MULTIPLIER[difficulty] || 1);

  userData.points += pointsEarned;
  userData.wins += 1;
  userData.totalAnswered += 1;
  userData.username = username; // Update username in case it changed

  saveTriviaData();

  // Update achievements
  try {
    updateUserStats(guildId, userId, username, { triviaWins: 1 });
  } catch (error) {
    console.warn('Failed to update trivia achievements', { error });
  }

  return {
    pointsEarned,
    totalPoints: userData.points,
    totalWins: userData.wins,
  };
}

function recordTriviaAttempt(guildId, userId, username) {
  const guildData = getGuildTrivia(guildId);
  const userData = initLeaderboardUser(guildData, userId, username);

  userData.totalAnswered += 1;

  saveTriviaData();
}

function getLeaderboard(guildId, limit = 10) {
  const guildData = getGuildTrivia(guildId);

  const sorted = Object.entries(guildData.leaderboard)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);

  return sorted;
}

function getUserStats(guildId, userId) {
  const guildData = getGuildTrivia(guildId);
  return guildData.leaderboard[userId] || {
    points: 0,
    wins: 0,
    totalAnswered: 0,
    username: 'Unknown',
  };
}

function getWinMessage(pointsEarned, difficulty) {
  const messages = {
    easy: [
      'You got it. Low bar, but sure.',
      'Correct. It was easy.',
      'Right. Don\'t let it go to your head.',
    ],
    medium: [
      'Correct. Surprising.',
      'You were right. Somehow.',
      'Right answer. Unexpected.',
    ],
    hard: [
      'Correct. Color me impressed.',
      'Right. Actually impressive.',
      'You got it. I\'m shocked.',
    ],
  };

  const pool = messages[difficulty] || messages.medium;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getTimeoutMessage() {
  const messages = [
    'Time\'s up. Predictable.',
    'Nobody got it. Classic.',
    'Silence. As expected.',
    'No correct answers. Typical.',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

module.exports = {
  initTrivia,
  recordTriviaWin,
  recordTriviaAttempt,
  getLeaderboard,
  getUserStats,
  getWinMessage,
  getTimeoutMessage,
  POINTS_PER_WIN,
  POINTS_MULTIPLIER,
};
