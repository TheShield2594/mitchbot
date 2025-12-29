const cooldowns = new Map();

const DEFAULT_COOLDOWN = 3000; // 3 seconds

/**
 * Check if a user is on cooldown for a command
 * @param {string} userId - Discord user ID
 * @param {string} commandName - Name of the command
 * @param {number} cooldownMs - Cooldown duration in milliseconds (default: 3000)
 * @returns {Object} - { onCooldown: boolean, remainingTime: number }
 */
function checkCooldown(userId, commandName, cooldownMs = DEFAULT_COOLDOWN) {
  const key = `${userId}-${commandName}`;
  const now = Date.now();
  const cooldownData = cooldowns.get(key);

  if (cooldownData && now < cooldownData.expiresAt) {
    return {
      onCooldown: true,
      remainingTime: Math.ceil((cooldownData.expiresAt - now) / 1000),
    };
  }

  return { onCooldown: false, remainingTime: 0 };
}

/**
 * Set a cooldown for a user on a command
 * @param {string} userId - Discord user ID
 * @param {string} commandName - Name of the command
 * @param {number} cooldownMs - Cooldown duration in milliseconds (default: 3000)
 */
function setCooldown(userId, commandName, cooldownMs = DEFAULT_COOLDOWN) {
  const key = `${userId}-${commandName}`;
  const expiresAt = Date.now() + cooldownMs;

  cooldowns.set(key, { expiresAt });

  // Auto-cleanup after cooldown expires
  setTimeout(() => cooldowns.delete(key), cooldownMs);
}

module.exports = {
  checkCooldown,
  setCooldown,
  DEFAULT_COOLDOWN,
};
