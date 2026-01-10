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

function getDefaultEconomyConfig() {
  return {
    enabled: true,
    currencyName: "coins",
    currencySymbol: "💰",
    dailyReward: 100,
    dailyCooldownHours: 24,
    workRewardMin: 50,
    workRewardMax: 150,
    workCooldownMinutes: 60,
    begRewardMin: 10,
    begRewardMax: 50,
    begCooldownMinutes: 30,
    crimeRewardMin: 100,
    crimeRewardMax: 300,
    crimeCooldownMinutes: 120,
    crimeFailChance: 0.4, // 40% chance to fail and lose money
    crimePenaltyMin: 50,
    crimePenaltyMax: 150,
    robSuccessChance: 0.5, // 50% base success rate
    robCooldownMinutes: 180, // 3 hours
    robPercentageMin: 5, // Minimum % of target's balance to steal
    robPercentageMax: 15, // Maximum % of target's balance to steal
    robMinimumBalance: 100, // Target must have at least this much to be robbed
    robInitiatorMinimumBalance: 50, // Initiator must have at least this much to attempt
    robPenaltyPercentage: 10, // % of your balance lost on failed rob
    fishingCooldownMinutes: 30, // 30 minutes cooldown
    miningCooldownMinutes: 45, // 45 minutes cooldown
    huntingCooldownMinutes: 60, // 60 minutes cooldown
    huntingSuccessChance: 0.7, // 70% success rate
    startingBalance: 100,
  };
}

function getDefaultGuildEconomy() {
  return {
    config: getDefaultEconomyConfig(),
    balances: {},
    daily: {},
    work: {},
    beg: {},
    crime: {},
    rob: {}, // { userId: { lastRobAt: ISO string, totalRobs: number, successfulRobs: number, failedRobs: number, targets: { targetId: ISO string } } }
    fishing: {}, // { userId: { lastFishAt: ISO string, totalFishes: number } }
    mining: {}, // { userId: { lastMineAt: ISO string, totalMines: number } }
    hunting: {}, // { userId: { lastHuntAt: ISO string, totalHunts: number, successfulHunts: number } }
    transactions: [],
    shop: [],
    inventory: {},
  };
}

function ensureEconomyFile() {
  try {
    if (!fs.existsSync(economyPath)) {
      fs.mkdirSync(path.dirname(economyPath), { recursive: true });
      fs.writeFileSync(economyPath, JSON.stringify({}, null, 2));
    }
  } catch (error) {
    console.warn('Failed to ensure economy file', { error });
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

  // Ensure config exists for backward compatibility
  if (!economyData[guildId].config) {
    economyData[guildId].config = getDefaultEconomyConfig();
  }

  return economyData[guildId];
}

function getEconomyConfig(guildId) {
  const guildData = getGuildEconomy(guildId);
  return guildData.config;
}

function updateEconomyConfig(guildId, updates) {
  const guildData = getGuildEconomy(guildId);
  guildData.config = {
    ...guildData.config,
    ...updates,
  };
  saveEconomyData();
  return guildData.config;
}

function getBalance(guildId, userId) {
  const guildData = getGuildEconomy(guildId);
  const config = getEconomyConfig(guildId);

  // If user has no balance set and starting balance is configured, initialize it
  if (guildData.balances[userId] === undefined) {
    const startingBalance = config.startingBalance || 0;
    if (startingBalance > 0) {
      guildData.balances[userId] = startingBalance;
      saveEconomyData();
    }
  }

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

function getDailyCooldown(lastClaimAt, nowMs, cooldownHours = 24) {
  if (!lastClaimAt) {
    return { remainingMs: 0, nextClaimAt: null };
  }

  const lastClaimMs = new Date(lastClaimAt).getTime();
  if (Number.isNaN(lastClaimMs)) {
    return { remainingMs: 0, nextClaimAt: null };
  }

  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const elapsed = nowMs - lastClaimMs;
  if (elapsed >= cooldownMs) {
    return { remainingMs: 0, nextClaimAt: null };
  }

  const remainingMs = cooldownMs - elapsed;
  return {
    remainingMs,
    nextClaimAt: new Date(nowMs + remainingMs).toISOString(),
  };
}

function claimDaily(guildId, userId, now = new Date()) {
  const nowMs = now.getTime();
  const guildData = getGuildEconomy(guildId);
  const config = getEconomyConfig(guildId);
  const dailyData = guildData.daily[userId] || {};

  const { remainingMs, nextClaimAt } = getDailyCooldown(
    dailyData.lastClaimAt,
    nowMs,
    config.dailyCooldownHours
  );
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

  const result = addBalance(guildId, userId, config.dailyReward, {
    type: "daily_reward",
    reason: "Daily reward claim",
  });

  const cooldownMs = config.dailyCooldownHours * 60 * 60 * 1000;
  return {
    ok: true,
    reward: config.dailyReward,
    balance: result.balance,
    nextClaimAt: new Date(nowMs + cooldownMs).toISOString(),
  };
}

function formatCoins(amount, currencyName = "coins") {
  return `${Number(amount || 0).toLocaleString()} ${currencyName}`;
}

function formatRelativeTimestamp(isoString) {
  if (!isoString) {
    return "soon";
  }

  const timestamp = Math.floor(new Date(isoString).getTime() / 1000);
  if (Number.isNaN(timestamp)) {
    return "soon";
  }

  return `<t:${timestamp}:R>`;
}

// Work command functionality
function claimWork(guildId, userId, now = new Date()) {
  const nowMs = now.getTime();
  const guildData = getGuildEconomy(guildId);
  const config = getEconomyConfig(guildId);
  const workData = guildData.work[userId] || {};

  const cooldownMs = (config.workCooldownMinutes || 60) * 60 * 1000;

  if (workData.lastWorkAt) {
    const lastWorkMs = new Date(workData.lastWorkAt).getTime();
    const elapsed = nowMs - lastWorkMs;

    if (elapsed < cooldownMs) {
      const remainingMs = cooldownMs - elapsed;
      return {
        ok: false,
        remainingMs,
        nextWorkAt: new Date(nowMs + remainingMs).toISOString(),
        balance: getBalance(guildId, userId),
      };
    }
  }

  // Calculate random reward between min and max
  const min = config.workRewardMin || 50;
  const max = config.workRewardMax || 150;
  const reward = Math.floor(Math.random() * (max - min + 1)) + min;

  workData.lastWorkAt = new Date(nowMs).toISOString();
  workData.totalWorks = (workData.totalWorks || 0) + 1;
  guildData.work[userId] = workData;

  const result = addBalance(guildId, userId, reward, {
    type: "work_reward",
    reason: "Work command",
  });

  return {
    ok: true,
    reward,
    balance: result.balance,
    nextWorkAt: new Date(nowMs + cooldownMs).toISOString(),
  };
}

function claimBeg(guildId, userId, now = new Date()) {
  const nowMs = now.getTime();
  const guildData = getGuildEconomy(guildId);
  const config = getEconomyConfig(guildId);
  const begData = guildData.beg[userId] || {};

  const cooldownMs = (config.begCooldownMinutes || 30) * 60 * 1000;

  if (begData.lastBegAt) {
    const lastBegMs = new Date(begData.lastBegAt).getTime();
    const elapsed = nowMs - lastBegMs;

    if (elapsed < cooldownMs) {
      const remainingMs = cooldownMs - elapsed;
      return {
        ok: false,
        remainingMs,
        nextBegAt: new Date(nowMs + remainingMs).toISOString(),
        balance: getBalance(guildId, userId),
      };
    }
  }

  // Calculate random reward between min and max
  const min = config.begRewardMin || 10;
  const max = config.begRewardMax || 50;
  const reward = Math.floor(Math.random() * (max - min + 1)) + min;

  begData.lastBegAt = new Date(nowMs).toISOString();
  begData.totalBegs = (begData.totalBegs || 0) + 1;
  guildData.beg[userId] = begData;

  const result = addBalance(guildId, userId, reward, {
    type: "beg_reward",
    reason: "Beg command",
  });

  return {
    ok: true,
    reward,
    balance: result.balance,
    nextBegAt: new Date(nowMs + cooldownMs).toISOString(),
  };
}

function claimCrime(guildId, userId, now = new Date()) {
  const nowMs = now.getTime();
  const guildData = getGuildEconomy(guildId);
  const config = getEconomyConfig(guildId);
  const crimeData = guildData.crime[userId] || {};

  const cooldownMs = (config.crimeCooldownMinutes || 120) * 60 * 1000;

  if (crimeData.lastCrimeAt) {
    const lastCrimeMs = new Date(crimeData.lastCrimeAt).getTime();
    const elapsed = nowMs - lastCrimeMs;

    if (elapsed < cooldownMs) {
      const remainingMs = cooldownMs - elapsed;
      return {
        ok: false,
        remainingMs,
        nextCrimeAt: new Date(nowMs + remainingMs).toISOString(),
        balance: getBalance(guildId, userId),
      };
    }
  }

  crimeData.lastCrimeAt = new Date(nowMs).toISOString();
  crimeData.totalCrimes = (crimeData.totalCrimes || 0) + 1;
  guildData.crime[userId] = crimeData;

  // Check if crime succeeds or fails
  const failChance = config.crimeFailChance || 0.4;
  const success = Math.random() > failChance;

  if (success) {
    // Crime succeeded - get reward
    const min = config.crimeRewardMin || 100;
    const max = config.crimeRewardMax || 300;
    const reward = Math.floor(Math.random() * (max - min + 1)) + min;

    crimeData.successfulCrimes = (crimeData.successfulCrimes || 0) + 1;

    const result = addBalance(guildId, userId, reward, {
      type: "crime_reward",
      reason: "Crime command (success)",
    });

    return {
      ok: true,
      success: true,
      reward,
      balance: result.balance,
      nextCrimeAt: new Date(nowMs + cooldownMs).toISOString(),
    };
  } else {
    // Crime failed - lose money
    const min = config.crimePenaltyMin || 50;
    const max = config.crimePenaltyMax || 150;
    const penalty = Math.floor(Math.random() * (max - min + 1)) + min;

    crimeData.failedCrimes = (crimeData.failedCrimes || 0) + 1;

    const result = addBalance(guildId, userId, -penalty, {
      type: "crime_penalty",
      reason: "Crime command (failed)",
    });

    return {
      ok: true,
      success: false,
      penalty,
      balance: result.balance,
      nextCrimeAt: new Date(nowMs + cooldownMs).toISOString(),
    };
  }
}

function attemptRob(guildId, userId, targetId, now = new Date()) {
  const nowMs = now.getTime();
  const guildData = getGuildEconomy(guildId);
  const config = getEconomyConfig(guildId);
  const robData = guildData.rob[userId] || { targets: {} };

  // Can't rob yourself
  if (userId === targetId) {
    return { ok: false, error: "cant_rob_self" };
  }

  // Check global cooldown
  const cooldownMs = (config.robCooldownMinutes || 180) * 60 * 1000;
  if (robData.lastRobAt) {
    const lastRobMs = new Date(robData.lastRobAt).getTime();
    const elapsed = nowMs - lastRobMs;

    if (elapsed < cooldownMs) {
      const remainingMs = cooldownMs - elapsed;
      return {
        ok: false,
        error: "cooldown",
        remainingMs,
        nextRobAt: new Date(nowMs + remainingMs).toISOString(),
      };
    }
  }

  // Check target-specific cooldown (can't rob same person within 24 hours)
  const targetCooldownMs = 24 * 60 * 60 * 1000;
  if (robData.targets && robData.targets[targetId]) {
    const lastTargetRobMs = new Date(robData.targets[targetId]).getTime();
    const targetElapsed = nowMs - lastTargetRobMs;

    if (targetElapsed < targetCooldownMs) {
      return {
        ok: false,
        error: "target_cooldown",
        targetId,
      };
    }
  }

  const userBalance = getBalance(guildId, userId);
  const targetBalance = getBalance(guildId, targetId);

  // Check if target has minimum balance
  const minimumBalance = config.robMinimumBalance || 100;
  if (targetBalance < minimumBalance) {
    return {
      ok: false,
      error: "target_too_poor",
      minimumBalance,
    };
  }

  // Check if user has enough balance to pay penalty on failure
  const penaltyPercentage = config.robPenaltyPercentage || 10;
  const potentialPenalty = Math.floor(userBalance * (penaltyPercentage / 100));
  const initiatorMinimum = config.robInitiatorMinimumBalance || 50;
  if (userBalance < initiatorMinimum) {
    return {
      ok: false,
      error: "insufficient_funds",
      minimumRequired: initiatorMinimum,
    };
  }

  // Update rob data
  robData.lastRobAt = new Date(nowMs).toISOString();
  robData.totalRobs = (robData.totalRobs || 0) + 1;
  if (!robData.targets) robData.targets = {};
  robData.targets[targetId] = new Date(nowMs).toISOString();
  guildData.rob[userId] = robData;

  // Calculate success chance
  const baseChance = config.robSuccessChance || 0.5;
  const success = Math.random() < baseChance;

  if (success) {
    // Rob succeeded - steal percentage of target's balance
    const percentageMin = config.robPercentageMin || 5;
    const percentageMax = config.robPercentageMax || 15;
    const percentage = Math.random() * (percentageMax - percentageMin) + percentageMin;
    const stolenAmount = Math.floor(targetBalance * (percentage / 100));

    robData.successfulRobs = (robData.successfulRobs || 0) + 1;

    // Transfer money from target to robber
    addBalance(guildId, targetId, -stolenAmount, {
      type: "robbed",
      reason: `Robbed by user ${userId}`,
      robberId: userId,
    });

    addBalance(guildId, userId, stolenAmount, {
      type: "rob_success",
      reason: `Robbed user ${targetId}`,
      victimId: targetId,
      stolen: stolenAmount,
    });

    return {
      ok: true,
      success: true,
      stolenAmount,
      balance: getBalance(guildId, userId),
      targetBalance: getBalance(guildId, targetId),
      nextRobAt: new Date(nowMs + cooldownMs).toISOString(),
    };
  } else {
    // Rob failed - lose money as penalty
    const penalty = potentialPenalty;
    robData.failedRobs = (robData.failedRobs || 0) + 1;

    addBalance(guildId, userId, -penalty, {
      type: "rob_failure",
      reason: `Failed rob attempt on user ${targetId}`,
      targetId,
      penalty,
    });

    return {
      ok: true,
      success: false,
      penalty,
      balance: getBalance(guildId, userId),
      nextRobAt: new Date(nowMs + cooldownMs).toISOString(),
    };
  }
}

// Fishing command functionality
function claimFishing(guildId, userId, now = new Date()) {
  const nowMs = now.getTime();
  const guildData = getGuildEconomy(guildId);
  const config = getEconomyConfig(guildId);
  const fishingData = guildData.fishing[userId] || {};

  const cooldownMs = (config.fishingCooldownMinutes || 30) * 60 * 1000;

  if (fishingData.lastFishAt) {
    const lastFishMs = new Date(fishingData.lastFishAt).getTime();
    const elapsed = nowMs - lastFishMs;

    if (elapsed < cooldownMs) {
      const remainingMs = cooldownMs - elapsed;
      return {
        ok: false,
        remainingMs,
        nextFishAt: new Date(nowMs + remainingMs).toISOString(),
        balance: getBalance(guildId, userId),
      };
    }
  }

  // Define fish types with rarity and rewards
  const fishTypes = [
    // Common (70% total)
    { name: "Boot", emoji: "🥾", rarity: "Common", value: 5, chance: 0.25 },
    { name: "Seaweed", emoji: "🌿", rarity: "Common", value: 8, chance: 0.25 },
    { name: "Sardine", emoji: "🐟", rarity: "Common", value: 15, chance: 0.20 },
    // Uncommon (20% total)
    { name: "Salmon", emoji: "🐠", rarity: "Uncommon", value: 35, chance: 0.12 },
    { name: "Cod", emoji: "🎣", rarity: "Uncommon", value: 40, chance: 0.08 },
    // Rare (8% total)
    { name: "Tuna", emoji: "🐡", rarity: "Rare", value: 80, chance: 0.05 },
    { name: "Swordfish", emoji: "🗡️", rarity: "Rare", value: 100, chance: 0.03 },
    // Legendary (2% total)
    { name: "Golden Fish", emoji: "🐠✨", rarity: "Legendary", value: 250, chance: 0.015 },
    { name: "Whale", emoji: "🐋", rarity: "Legendary", value: 500, chance: 0.005 },
  ];

  // Roll for a fish
  const roll = Math.random();
  let cumulativeChance = 0;
  let caughtFish = fishTypes[0]; // Default to boot

  for (const fish of fishTypes) {
    cumulativeChance += fish.chance;
    if (roll < cumulativeChance) {
      caughtFish = fish;
      break;
    }
  }

  fishingData.lastFishAt = new Date(nowMs).toISOString();
  fishingData.totalFishes = (fishingData.totalFishes || 0) + 1;

  // Track fish by rarity for stats
  if (!fishingData.catchesByRarity) fishingData.catchesByRarity = {};
  fishingData.catchesByRarity[caughtFish.rarity] =
    (fishingData.catchesByRarity[caughtFish.rarity] || 0) + 1;

  guildData.fishing[userId] = fishingData;

  const result = addBalance(guildId, userId, caughtFish.value, {
    type: "fishing_reward",
    reason: `Caught ${caughtFish.name}`,
    fish: caughtFish.name,
    rarity: caughtFish.rarity,
  });

  return {
    ok: true,
    fish: caughtFish,
    balance: result.balance,
    nextFishAt: new Date(nowMs + cooldownMs).toISOString(),
  };
}

// Mining command functionality
function claimMining(guildId, userId, now = new Date()) {
  const nowMs = now.getTime();
  const guildData = getGuildEconomy(guildId);
  const config = getEconomyConfig(guildId);
  const miningData = guildData.mining[userId] || {};

  const cooldownMs = (config.miningCooldownMinutes || 45) * 60 * 1000;

  if (miningData.lastMineAt) {
    const lastMineMs = new Date(miningData.lastMineAt).getTime();
    const elapsed = nowMs - lastMineMs;

    if (elapsed < cooldownMs) {
      const remainingMs = cooldownMs - elapsed;
      return {
        ok: false,
        remainingMs,
        nextMineAt: new Date(nowMs + remainingMs).toISOString(),
        balance: getBalance(guildId, userId),
      };
    }
  }

  // Define ore types with rarity and rewards
  const oreTypes = [
    // Common (65% total)
    { name: "Stone", emoji: "🪨", rarity: "Common", value: 10, chance: 0.35 },
    { name: "Coal", emoji: "⚫", rarity: "Common", value: 20, chance: 0.30 },
    // Uncommon (25% total)
    { name: "Iron Ore", emoji: "⚙️", rarity: "Uncommon", value: 50, chance: 0.15 },
    { name: "Copper Ore", emoji: "🟤", rarity: "Uncommon", value: 45, chance: 0.10 },
    // Rare (8% total)
    { name: "Gold Ore", emoji: "🟡", rarity: "Rare", value: 120, chance: 0.05 },
    { name: "Silver Ore", emoji: "⚪", rarity: "Rare", value: 100, chance: 0.03 },
    // Legendary (2% total)
    { name: "Diamond", emoji: "💎", rarity: "Legendary", value: 300, chance: 0.015 },
    { name: "Emerald", emoji: "💚", rarity: "Legendary", value: 400, chance: 0.005 },
  ];

  // Roll for an ore
  const roll = Math.random();
  let cumulativeChance = 0;
  let minedOre = oreTypes[0]; // Default to stone

  for (const ore of oreTypes) {
    cumulativeChance += ore.chance;
    if (roll < cumulativeChance) {
      minedOre = ore;
      break;
    }
  }

  miningData.lastMineAt = new Date(nowMs).toISOString();
  miningData.totalMines = (miningData.totalMines || 0) + 1;

  // Track ores by rarity for stats
  if (!miningData.minesByRarity) miningData.minesByRarity = {};
  miningData.minesByRarity[minedOre.rarity] =
    (miningData.minesByRarity[minedOre.rarity] || 0) + 1;

  guildData.mining[userId] = miningData;

  const result = addBalance(guildId, userId, minedOre.value, {
    type: "mining_reward",
    reason: `Mined ${minedOre.name}`,
    ore: minedOre.name,
    rarity: minedOre.rarity,
  });

  return {
    ok: true,
    ore: minedOre,
    balance: result.balance,
    nextMineAt: new Date(nowMs + cooldownMs).toISOString(),
  };
}

// Hunting command functionality
function claimHunting(guildId, userId, now = new Date()) {
  const nowMs = now.getTime();
  const guildData = getGuildEconomy(guildId);
  const config = getEconomyConfig(guildId);
  const huntingData = guildData.hunting[userId] || {};

  const cooldownMs = (config.huntingCooldownMinutes || 60) * 60 * 1000;

  if (huntingData.lastHuntAt) {
    const lastHuntMs = new Date(huntingData.lastHuntAt).getTime();
    const elapsed = nowMs - lastHuntMs;

    if (elapsed < cooldownMs) {
      const remainingMs = cooldownMs - elapsed;
      return {
        ok: false,
        remainingMs,
        nextHuntAt: new Date(nowMs + remainingMs).toISOString(),
        balance: getBalance(guildId, userId),
      };
    }
  }

  // Check if hunt is successful
  const successChance = config.huntingSuccessChance || 0.7;
  const success = Math.random() < successChance;

  huntingData.lastHuntAt = new Date(nowMs).toISOString();
  huntingData.totalHunts = (huntingData.totalHunts || 0) + 1;

  if (success) {
    // Define animal types with rarity and rewards
    const animals = [
      // Common (50% of successful hunts)
      { name: "Rabbit", emoji: "🐰", rarity: "Common", value: 30, chance: 0.25 },
      { name: "Duck", emoji: "🦆", rarity: "Common", value: 35, chance: 0.25 },
      // Uncommon (30% of successful hunts)
      { name: "Deer", emoji: "🦌", rarity: "Uncommon", value: 80, chance: 0.15 },
      { name: "Boar", emoji: "🐗", rarity: "Uncommon", value: 90, chance: 0.15 },
      // Rare (15% of successful hunts)
      { name: "Wolf", emoji: "🐺", rarity: "Rare", value: 150, chance: 0.08 },
      { name: "Bear", emoji: "🐻", rarity: "Rare", value: 200, chance: 0.07 },
      // Legendary (5% of successful hunts)
      { name: "Golden Stag", emoji: "🦌✨", rarity: "Legendary", value: 400, chance: 0.03 },
      { name: "Dragon", emoji: "🐉", rarity: "Legendary", value: 750, chance: 0.02 },
    ];

    // Roll for an animal
    const roll = Math.random();
    let cumulativeChance = 0;
    let caughtAnimal = animals[0]; // Default to rabbit

    for (const animal of animals) {
      cumulativeChance += animal.chance;
      if (roll < cumulativeChance) {
        caughtAnimal = animal;
        break;
      }
    }

    huntingData.successfulHunts = (huntingData.successfulHunts || 0) + 1;

    // Track catches by rarity for stats
    if (!huntingData.catchesByRarity) huntingData.catchesByRarity = {};
    huntingData.catchesByRarity[caughtAnimal.rarity] =
      (huntingData.catchesByRarity[caughtAnimal.rarity] || 0) + 1;

    guildData.hunting[userId] = huntingData;

    const result = addBalance(guildId, userId, caughtAnimal.value, {
      type: "hunting_reward",
      reason: `Hunted ${caughtAnimal.name}`,
      animal: caughtAnimal.name,
      rarity: caughtAnimal.rarity,
    });

    return {
      ok: true,
      success: true,
      animal: caughtAnimal,
      balance: result.balance,
      nextHuntAt: new Date(nowMs + cooldownMs).toISOString(),
    };
  } else {
    // Hunt failed - no reward but cooldown still applies
    huntingData.failedHunts = (huntingData.failedHunts || 0) + 1;
    guildData.hunting[userId] = huntingData;

    return {
      ok: true,
      success: false,
      balance: getBalance(guildId, userId),
      nextHuntAt: new Date(nowMs + cooldownMs).toISOString(),
    };
  }
}

// Shop item management
function addShopItem(guildId, itemData) {
  const guildData = getGuildEconomy(guildId);
  const item = {
    id: randomUUID(),
    name: itemData.name,
    description: itemData.description || "",
    price: itemData.price,
    type: itemData.type || "item", // "item", "role"
    roleId: itemData.roleId || null,
    metadata: itemData.metadata || {},
    stock: itemData.stock || -1, // -1 = unlimited
    createdAt: new Date().toISOString(),
  };

  guildData.shop.push(item);
  saveEconomyData();
  return item;
}

function getShopItems(guildId) {
  const guildData = getGuildEconomy(guildId);
  return guildData.shop || [];
}

function getShopItem(guildId, itemId) {
  const guildData = getGuildEconomy(guildId);
  return guildData.shop.find(item => item.id === itemId);
}

function updateShopItem(guildId, itemId, updates) {
  const guildData = getGuildEconomy(guildId);
  const itemIndex = guildData.shop.findIndex(item => item.id === itemId);

  if (itemIndex === -1) {
    return null;
  }

  guildData.shop[itemIndex] = {
    ...guildData.shop[itemIndex],
    ...updates,
    id: itemId, // Preserve ID
  };

  saveEconomyData();
  return guildData.shop[itemIndex];
}

function deleteShopItem(guildId, itemId) {
  const guildData = getGuildEconomy(guildId);
  const itemIndex = guildData.shop.findIndex(item => item.id === itemId);

  if (itemIndex === -1) {
    return false;
  }

  guildData.shop.splice(itemIndex, 1);
  saveEconomyData();
  return true;
}

// Purchase and inventory management
function purchaseItem(guildId, userId, itemId) {
  const guildData = getGuildEconomy(guildId);
  const item = getShopItem(guildId, itemId);

  if (!item) {
    return { ok: false, error: "Item not found" };
  }

  if (item.stock !== -1 && item.stock <= 0) {
    return { ok: false, error: "Item out of stock" };
  }

  const balance = getBalance(guildId, userId);

  if (balance < item.price) {
    return { ok: false, error: "Insufficient funds", balance, price: item.price };
  }

  // Deduct balance
  addBalance(guildId, userId, -item.price, {
    type: "purchase",
    reason: `Purchased ${item.name}`,
    metadata: { itemId: item.id, itemName: item.name },
  });

  // Add to inventory
  if (!guildData.inventory[userId]) {
    guildData.inventory[userId] = [];
  }

  const inventoryItem = {
    id: randomUUID(),
    itemId: item.id,
    name: item.name,
    description: item.description,
    type: item.type,
    roleId: item.roleId,
    metadata: item.metadata,
    purchasedAt: new Date().toISOString(),
  };

  guildData.inventory[userId].push(inventoryItem);

  // Decrease stock if limited
  if (item.stock !== -1) {
    item.stock -= 1;
  }

  saveEconomyData();

  return {
    ok: true,
    item: inventoryItem,
    balance: getBalance(guildId, userId),
  };
}

function getInventory(guildId, userId) {
  const guildData = getGuildEconomy(guildId);
  return guildData.inventory[userId] || [];
}

function removeInventoryItem(guildId, userId, inventoryItemId) {
  const guildData = getGuildEconomy(guildId);

  if (!guildData.inventory[userId]) {
    return false;
  }

  const itemIndex = guildData.inventory[userId].findIndex(item => item.id === inventoryItemId);

  if (itemIndex === -1) {
    return false;
  }

  guildData.inventory[userId].splice(itemIndex, 1);
  saveEconomyData();
  return true;
}

function tradeItem(guildId, fromUserId, toUserId, inventoryItemId) {
  const guildData = getGuildEconomy(guildId);

  // Check if sender has the item
  if (!guildData.inventory[fromUserId]) {
    return { ok: false, error: "no_inventory" };
  }

  const itemIndex = guildData.inventory[fromUserId].findIndex(item => item.id === inventoryItemId);

  if (itemIndex === -1) {
    return { ok: false, error: "item_not_found" };
  }

  const item = guildData.inventory[fromUserId][itemIndex];

  // Remove from sender's inventory
  guildData.inventory[fromUserId].splice(itemIndex, 1);

  // Add to recipient's inventory
  if (!guildData.inventory[toUserId]) {
    guildData.inventory[toUserId] = [];
  }

  guildData.inventory[toUserId].push({
    ...item,
    id: randomUUID(), // Give it a new ID in recipient's inventory
    tradedFrom: fromUserId,
    tradedAt: new Date().toISOString(),
  });

  // Log transaction
  logTransaction(guildId, {
    userId: fromUserId,
    amount: 0,
    balanceAfter: getBalance(guildId, fromUserId),
    type: "item_trade_sent",
    reason: `Traded ${item.name} to user ${toUserId}`,
    metadata: { itemId: inventoryItemId, itemName: item.name, recipientId: toUserId },
  });

  logTransaction(guildId, {
    userId: toUserId,
    amount: 0,
    balanceAfter: getBalance(guildId, toUserId),
    type: "item_trade_received",
    reason: `Received ${item.name} from user ${fromUserId}`,
    metadata: { itemId: inventoryItemId, itemName: item.name, senderId: fromUserId },
  });

  saveEconomyData();

  return {
    ok: true,
    item,
  };
}

// Leaderboard
function getLeaderboard(guildId, limit = 10) {
  const guildData = getGuildEconomy(guildId);
  const balances = Object.entries(guildData.balances || {})
    .map(([userId, balance]) => ({ userId, balance: Number(balance) }))
    .filter(entry => entry.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);

  return balances;
}

// Transfer coins between users
function transferCoins(guildId, fromUserId, toUserId, amount) {
  if (amount <= 0) {
    return { ok: false, error: "Amount must be positive" };
  }

  const fromBalance = getBalance(guildId, fromUserId);

  if (fromBalance < amount) {
    return { ok: false, error: "Insufficient funds", balance: fromBalance };
  }

  // Deduct from sender
  addBalance(guildId, fromUserId, -amount, {
    type: "transfer_out",
    reason: `Transferred to <@${toUserId}>`,
    metadata: { recipientId: toUserId },
  });

  // Add to recipient
  addBalance(guildId, toUserId, amount, {
    type: "transfer_in",
    reason: `Received from <@${fromUserId}>`,
    metadata: { senderId: fromUserId },
  });

  return {
    ok: true,
    amount,
    fromBalance: getBalance(guildId, fromUserId),
    toBalance: getBalance(guildId, toUserId),
  };
}

module.exports = {
  DAILY_REWARD,
  DAILY_COOLDOWN_MS,
  ECONOMY_EMBED_COLOR,
  addBalance,
  claimDaily,
  claimWork,
  claimBeg,
  claimCrime,
  attemptRob,
  claimFishing,
  claimMining,
  claimHunting,
  formatCoins,
  formatRelativeTimestamp,
  getBalance,
  setBalance,
  getDailyCooldown,
  getEconomyConfig,
  updateEconomyConfig,
  initEconomy,
  loadEconomyData,
  logTransaction,
  saveEconomyData,
  addShopItem,
  getShopItems,
  getShopItem,
  updateShopItem,
  deleteShopItem,
  purchaseItem,
  getInventory,
  removeInventoryItem,
  tradeItem,
  getLeaderboard,
  transferCoins,
};
