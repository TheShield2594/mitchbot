const fs = require("fs");
const path = require("path");
const { randomUUID } = require("node:crypto");

const fsp = fs.promises;

const economyPath = path.join(__dirname, "..", "data", "economy.json");
const DAILY_REWARD = 100;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_TRANSACTIONS = 1000;
const ECONOMY_EMBED_COLOR = "#2b6cb0";

let economyData = {};
let writeQueue = Promise.resolve();
let hasLoaded = false;

function getDefaultGuildEconomy() {
  return {
    balances: {},
    daily: {},
    transactions: [],
  };
}

function ensureEconomyFile() {
  if (!fs.existsSync(economyPath)) {
    fs.mkdirSync(path.dirname(economyPath), { recursive: true });
    fs.writeFileSync(economyPath, JSON.stringify({}, null, 2));
  }
}

async function loadEconomyData() {
  ensureEconomyFile();

  try {
    const data = await fsp.readFile(economyPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.warn("Failed to load economy data", { error });
    return {};
  }
}

function loadEconomyDataSync() {
  ensureEconomyFile();

  try {
    const data = fs.readFileSync(economyPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.warn("Failed to load economy data", { error });
    return {};
  }
}

function saveEconomyData() {
  const payload = JSON.stringify(economyData, null, 2);
  writeQueue = writeQueue
    .then(async () => {
      const tmpPath = `${economyPath}.tmp`;
      await fsp.writeFile(tmpPath, payload, "utf8");
      await fsp.rename(tmpPath, economyPath);
    })
    .catch((error) => {
      console.warn("Failed to save economy data", { error });
    });

  return writeQueue;
}

async function initEconomy() {
  if (hasLoaded) {
    return;
  }

  economyData = await loadEconomyData();
  hasLoaded = true;
}

function ensureEconomyDataLoaded() {
  if (hasLoaded) {
    return;
  }

  economyData = loadEconomyDataSync();
  hasLoaded = true;
}

function getGuildEconomy(guildId) {
  ensureEconomyDataLoaded();

  if (!economyData[guildId]) {
    economyData[guildId] = getDefaultGuildEconomy();
  }

  return economyData[guildId];
}

function getBalance(guildId, userId) {
  const guildData = getGuildEconomy(guildId);
  return Number(guildData.balances[userId] || 0);
}

function setBalance(guildId, userId, amount) {
  const guildData = getGuildEconomy(guildId);
  guildData.balances[userId] = amount;
}

function logTransaction(guildId, entry) {
  const guildData = getGuildEconomy(guildId);
  const transaction = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  guildData.transactions.push(transaction);
  if (guildData.transactions.length > MAX_TRANSACTIONS) {
    guildData.transactions.splice(0, guildData.transactions.length - MAX_TRANSACTIONS);
  }

  return transaction;
}

function addBalance(guildId, userId, amount, details = {}) {
  const current = getBalance(guildId, userId);
  const updated = current + amount;
  setBalance(guildId, userId, updated);

  const transaction = logTransaction(guildId, {
    userId,
    amount,
    balanceAfter: updated,
    type: details.type || "adjustment",
    reason: details.reason || null,
    metadata: details.metadata || null,
  });

  saveEconomyData();

  return { balance: updated, transaction };
}

function getDailyCooldown(lastClaimAt, nowMs) {
  if (!lastClaimAt) {
    return { remainingMs: 0, nextClaimAt: null };
  }

  const lastClaimMs = new Date(lastClaimAt).getTime();
  if (Number.isNaN(lastClaimMs)) {
    return { remainingMs: 0, nextClaimAt: null };
  }

  const elapsed = nowMs - lastClaimMs;
  if (elapsed >= DAILY_COOLDOWN_MS) {
    return { remainingMs: 0, nextClaimAt: null };
  }

  const remainingMs = DAILY_COOLDOWN_MS - elapsed;
  return {
    remainingMs,
    nextClaimAt: new Date(nowMs + remainingMs).toISOString(),
  };
}

function claimDaily(guildId, userId, now = new Date()) {
  const nowMs = now.getTime();
  const guildData = getGuildEconomy(guildId);
  const dailyData = guildData.daily[userId] || {};

  const { remainingMs, nextClaimAt } = getDailyCooldown(dailyData.lastClaimAt, nowMs);
  if (remainingMs > 0) {
    return {
      ok: false,
      remainingMs,
      nextClaimAt,
      balance: getBalance(guildId, userId),
    };
  }

  dailyData.lastClaimAt = new Date(nowMs).toISOString();
  dailyData.totalClaims = (dailyData.totalClaims || 0) + 1;
  guildData.daily[userId] = dailyData;

  const result = addBalance(guildId, userId, DAILY_REWARD, {
    type: "daily_reward",
    reason: "Daily reward claim",
  });

  return {
    ok: true,
    reward: DAILY_REWARD,
    balance: result.balance,
    nextClaimAt: new Date(nowMs + DAILY_COOLDOWN_MS).toISOString(),
  };
}

function formatCoins(amount) {
  return `${Number(amount || 0).toLocaleString()} coins`;
}

module.exports = {
  DAILY_REWARD,
  DAILY_COOLDOWN_MS,
  ECONOMY_EMBED_COLOR,
  addBalance,
  claimDaily,
  formatCoins,
  getBalance,
  getDailyCooldown,
  initEconomy,
  loadEconomyData,
  logTransaction,
  saveEconomyData,
};
