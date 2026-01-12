/**
 * Persistent game state manager to prevent data loss on bot crashes/restarts
 * All active games are saved to disk and can be restored on startup
 */

const fs = require('fs');
const path = require('path');
const fsp = fs.promises;

const gameStatePath = path.join(__dirname, '..', 'data', 'activeGames.json');
let writeQueue = Promise.resolve();

// Maximum game age before auto-refund (2 hours)
const MAX_GAME_AGE_MS = 2 * 60 * 60 * 1000;

/**
 * Ensure game state file exists
 */
function ensureGameStateFile() {
  try {
    if (!fs.existsSync(gameStatePath)) {
      fs.mkdirSync(path.dirname(gameStatePath), { recursive: true });
      fs.writeFileSync(gameStatePath, JSON.stringify({}, null, 2));
    }
  } catch (error) {
    console.warn('Failed to ensure game state file', { error });
  }
}

/**
 * Load all active games from disk
 * @returns {Promise<Object>} - Object mapping gameId to game data
 */
async function loadActiveGames() {
  ensureGameStateFile();

  try {
    const data = await fsp.readFile(gameStatePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to load active games', { error });
    return {};
  }
}

/**
 * Save all active games to disk
 * @param {Object} games - Object mapping gameId to game data
 * @returns {Promise<void>}
 */
async function saveActiveGames(games) {
  const payload = JSON.stringify(games, null, 2);

  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${gameStatePath}.tmp`;
      await fsp.writeFile(tmpPath, payload, 'utf8');
      await fsp.rename(tmpPath, gameStatePath);
    })
    .catch((error) => {
      console.error('Failed to save active games', { error });
      throw error;
    });

  return writeQueue;
}

/**
 * Save a single game to persistent storage
 * @param {string} gameId - Unique game identifier
 * @param {Object} gameData - Game state data
 * @returns {Promise<void>}
 */
async function saveGame(gameId, gameData) {
  const games = await loadActiveGames();

  games[gameId] = {
    ...gameData,
    savedAt: Date.now(),
  };

  await saveActiveGames(games);
}

/**
 * Remove a game from persistent storage
 * @param {string} gameId - Unique game identifier
 * @returns {Promise<void>}
 */
async function removeGame(gameId) {
  const games = await loadActiveGames();
  delete games[gameId];
  await saveActiveGames(games);
}

/**
 * Get a specific game from persistent storage
 * @param {string} gameId - Unique game identifier
 * @returns {Promise<Object|null>} - Game data or null if not found
 */
async function getGame(gameId) {
  const games = await loadActiveGames();
  return games[gameId] || null;
}

/**
 * Clean up expired games and refund bets
 * @param {Function} refundCallback - Callback function to refund bet (guildId, userId, amount, details)
 * @returns {Promise<Array>} - Array of refunded games
 */
async function cleanupExpiredGames(refundCallback) {
  const games = await loadActiveGames();
  const now = Date.now();
  const expiredGames = [];
  const activeGames = {};

  for (const [gameId, game] of Object.entries(games)) {
    const gameAge = now - (game.savedAt || game.startedAt || 0);

    if (gameAge > MAX_GAME_AGE_MS) {
      // Game is too old, refund it
      try {
        if (refundCallback && game.bet && game.userId && game.guildId) {
          await refundCallback(game.guildId, game.userId, game.bet, {
            type: game.gameType || 'game',
            action: 'refund_on_restart',
            reason: `Game expired after bot restart (${game.gameType || 'unknown'})`,
          });
        }
        expiredGames.push({ gameId, ...game });
      } catch (error) {
        console.error('Failed to refund expired game', { gameId, error });
        // Keep in active games for manual review
        activeGames[gameId] = game;
      }
    } else {
      // Game is still valid, keep it
      activeGames[gameId] = game;
    }
  }

  // Save only active games
  await saveActiveGames(activeGames);

  return expiredGames;
}

/**
 * Get statistics about active games
 * @returns {Promise<Object>} - Statistics object
 */
async function getGameStats() {
  const games = await loadActiveGames();
  const now = Date.now();

  const stats = {
    total: 0,
    byType: {},
    byAge: {
      lessThan5Min: 0,
      lessThan30Min: 0,
      lessThan1Hour: 0,
      moreThan1Hour: 0,
    },
  };

  for (const game of Object.values(games)) {
    stats.total++;

    // Count by type
    const type = game.gameType || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // Count by age
    const age = now - (game.savedAt || game.startedAt || 0);
    if (age < 5 * 60 * 1000) {
      stats.byAge.lessThan5Min++;
    } else if (age < 30 * 60 * 1000) {
      stats.byAge.lessThan30Min++;
    } else if (age < 60 * 60 * 1000) {
      stats.byAge.lessThan1Hour++;
    } else {
      stats.byAge.moreThan1Hour++;
    }
  }

  return stats;
}

module.exports = {
  loadActiveGames,
  saveActiveGames,
  saveGame,
  removeGame,
  getGame,
  cleanupExpiredGames,
  getGameStats,
  MAX_GAME_AGE_MS,
};
