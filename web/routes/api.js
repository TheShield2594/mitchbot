const express = require('express');
const router = express.Router();
const { ensureServerManager } = require('../middleware/auth');
const { getGuildConfig, updateGuildConfig, getLogs, getWarnings, clearWarnings } = require('../../utils/moderation');
const { getBirthdays, addBirthday, removeBirthday } = require('../../utils/birthdays');
const { getEconomyConfig, updateEconomyConfig } = require('../../utils/economy');
const {
  getGuildConfig: getXPGuildConfig,
  updateGuildConfig: updateXPGuildConfig,
  setLevelRole,
  removeLevelRole,
  getLeaderboard,
  getUserData,
  getUserRank,
  resetUserXP,
  resetGuildXP,
  setChannelMultiplier,
  setRoleMultiplier,
} = require('../../utils/xp');

// Get bot client ID for OAuth links
router.get('/client-id', (req, res) => {
  const clientId = process.env.CLIENT_ID;

  if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
    console.error('CLIENT_ID environment variable is not configured');
    return res.status(500).json({ error: 'CLIENT_ID not configured' });
  }

  res.json({ clientId });
});

// Get guild configuration
router.get('/guild/:guildId/config', ensureServerManager, (req, res) => {
  try {
    const config = getGuildConfig(req.params.guildId);
    res.json(config);
  } catch (error) {
    console.error('Error getting guild config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Update automod configuration
router.post('/guild/:guildId/automod', ensureServerManager, async (req, res) => {
  try {
    const config = getGuildConfig(req.params.guildId);
    const updates = req.body;

    // Update automod settings
    if (updates.enabled !== undefined) {
      config.automod.enabled = updates.enabled;
    }

    if (updates.wordFilter) {
      config.automod.wordFilter = { ...config.automod.wordFilter, ...updates.wordFilter };
    }

    if (updates.inviteFilter) {
      config.automod.inviteFilter = { ...config.automod.inviteFilter, ...updates.inviteFilter };
    }

    if (updates.linkFilter) {
      config.automod.linkFilter = { ...config.automod.linkFilter, ...updates.linkFilter };
    }

    if (updates.spam) {
      config.automod.spam = { ...config.automod.spam, ...updates.spam };
    }

    if (updates.mentionSpam) {
      config.automod.mentionSpam = { ...config.automod.mentionSpam, ...updates.mentionSpam };
    }

    if (updates.capsSpam) {
      config.automod.capsSpam = { ...config.automod.capsSpam, ...updates.capsSpam };
    }

    if (updates.whitelistedRoles) {
      config.automod.whitelistedRoles = updates.whitelistedRoles;
    }

    if (updates.whitelistedChannels) {
      config.automod.whitelistedChannels = updates.whitelistedChannels;
    }

    await updateGuildConfig(req.params.guildId, { automod: config.automod });

    res.json({ success: true, config: getGuildConfig(req.params.guildId) });
  } catch (error) {
    console.error('Error updating automod config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Update logging configuration
router.post('/guild/:guildId/logging', ensureServerManager, async (req, res) => {
  try {
    const config = getGuildConfig(req.params.guildId);
    const updates = req.body;

    config.logging = { ...config.logging, ...updates };
    await updateGuildConfig(req.params.guildId, { logging: config.logging });

    res.json({ success: true, config: getGuildConfig(req.params.guildId) });
  } catch (error) {
    console.error('Error updating logging config:', error);
    res.status(500).json({ error: 'Failed to update logging configuration' });
  }
});

// Get moderation logs
router.get('/guild/:guildId/logs', ensureServerManager, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = getLogs(req.params.guildId, limit);
    res.json(logs);
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Get warnings for a user
router.get('/guild/:guildId/warnings/:userId', ensureServerManager, (req, res) => {
  try {
    const warnings = getWarnings(req.params.guildId, req.params.userId);
    res.json(warnings);
  } catch (error) {
    console.error('Error getting warnings:', error);
    res.status(500).json({ error: 'Failed to get warnings' });
  }
});

// Clear warnings for a user
router.delete('/guild/:guildId/warnings/:userId', ensureServerManager, (req, res) => {
  try {
    clearWarnings(req.params.guildId, req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing warnings:', error);
    res.status(500).json({ error: 'Failed to clear warnings' });
  }
});

// Get birthdays
router.get('/guild/:guildId/birthdays', ensureServerManager, (req, res) => {
  try {
    const birthdays = getBirthdays();
    res.json(birthdays);
  } catch (error) {
    console.error('Error getting birthdays:', error);
    res.status(500).json({ error: 'Failed to get birthdays' });
  }
});

// Add birthday
router.post('/guild/:guildId/birthdays', ensureServerManager, (req, res) => {
  try {
    const { userId, date } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ error: 'userId and date are required' });
    }

    addBirthday(userId, date);
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding birthday:', error);
    res.status(500).json({ error: 'Failed to add birthday' });
  }
});

// Remove birthday
router.delete('/guild/:guildId/birthdays/:userId', ensureServerManager, (req, res) => {
  try {
    removeBirthday(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing birthday:', error);
    res.status(500).json({ error: 'Failed to remove birthday' });
  }
});

// Update birthday configuration
router.patch('/guild/:guildId/config/birthday', ensureServerManager, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { enabled, channelId, roleId, customMessage } = req.body;

    // Validate snowflake IDs if provided
    const snowflakeRegex = /^\d{17,19}$/;
    if (channelId !== undefined && channelId !== null && channelId !== '' && !snowflakeRegex.test(channelId)) {
      return res.status(400).json({ error: 'Invalid channel ID format' });
    }
    if (roleId !== undefined && roleId !== null && roleId !== '' && !snowflakeRegex.test(roleId)) {
      return res.status(400).json({ error: 'Invalid role ID format' });
    }

    // Validate custom message length
    if (customMessage !== undefined && customMessage !== null) {
      if (typeof customMessage !== 'string') {
        return res.status(400).json({ error: 'Custom message must be a string' });
      }
      if (customMessage.length > 2000) {
        return res.status(400).json({ error: 'Custom message must be 2000 characters or less' });
      }
    }

    // Build update object with only provided fields
    const updates = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (channelId !== undefined) updates.channelId = channelId;
    if (roleId !== undefined) updates.roleId = roleId;
    if (customMessage !== undefined) updates.customMessage = customMessage;

    const config = await updateGuildConfig(guildId, { birthday: updates });
    res.json({ success: true, birthday: config.birthday });
  } catch (error) {
    console.error('Error updating birthday config:', error);
    res.status(500).json({ error: 'Failed to update birthday configuration' });
  }
});

// Get guild info from bot
router.get('/guild/:guildId/info', ensureServerManager, async (req, res) => {
  try {
    const client = req.app.get('client');
    const guild = await client.guilds.fetch(req.params.guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Fetch channels and roles
    const channels = await guild.channels.fetch();
    const roles = await guild.roles.fetch();

    res.json({
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL(),
      memberCount: guild.memberCount,
      channels: channels.map(c => ({ id: c.id, name: c.name, type: c.type })),
      roles: roles.map(r => ({ id: r.id, name: r.name, position: r.position })),
    });
  } catch (error) {
    console.error('Error getting guild info:', error);
    res.status(500).json({ error: 'Failed to get guild info' });
  }
});

// Get economy configuration
router.get('/guild/:guildId/economy/config', ensureServerManager, (req, res) => {
  try {
    const config = getEconomyConfig(req.params.guildId);
    res.json(config);
  } catch (error) {
    console.error('Error getting economy config:', error);
    res.status(500).json({ error: 'Failed to get economy configuration' });
  }
});

// Update economy configuration
router.post('/guild/:guildId/economy/config', ensureServerManager, async (req, res) => {
  try {
    const updates = req.body;

    // Validate inputs
    if (updates.dailyReward !== undefined) {
      const dailyReward = Number(updates.dailyReward);
      if (isNaN(dailyReward) || dailyReward < 0 || dailyReward > 1000000) {
        return res.status(400).json({ error: 'Daily reward must be between 0 and 1,000,000' });
      }
      updates.dailyReward = dailyReward;
    }

    if (updates.dailyCooldownHours !== undefined) {
      const cooldown = Number(updates.dailyCooldownHours);
      if (isNaN(cooldown) || cooldown < 1 || cooldown > 168) {
        return res.status(400).json({ error: 'Daily cooldown must be between 1 and 168 hours' });
      }
      updates.dailyCooldownHours = cooldown;
    }

    if (updates.currencyName !== undefined) {
      if (typeof updates.currencyName !== 'string' || updates.currencyName.trim().length === 0) {
        return res.status(400).json({ error: 'Currency name must be a non-empty string' });
      }
      updates.currencyName = updates.currencyName.trim();
    }

    const config = updateEconomyConfig(req.params.guildId, updates);
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error updating economy config:', error);
    res.status(500).json({ error: 'Failed to update economy configuration' });
  }
});

// ============================================
// XP SYSTEM ENDPOINTS
// ============================================

// Get XP configuration
router.get('/guild/:guildId/xp/config', ensureServerManager, (req, res) => {
  try {
    const config = getXPGuildConfig(req.params.guildId);
    res.json(config);
  } catch (error) {
    console.error('Error getting XP config:', error);
    res.status(500).json({ error: 'Failed to get XP configuration' });
  }
});

// Update XP configuration
router.post('/guild/:guildId/xp/config', ensureServerManager, async (req, res) => {
  try {
    const updates = req.body;

    // Validate inputs
    if (updates.minXpPerMessage !== undefined) {
      const min = Number(updates.minXpPerMessage);
      if (isNaN(min) || min < 1 || min > 100) {
        return res.status(400).json({ error: 'Min XP must be between 1 and 100' });
      }
      updates.minXpPerMessage = min;
    }

    if (updates.maxXpPerMessage !== undefined) {
      const max = Number(updates.maxXpPerMessage);
      if (isNaN(max) || max < 1 || max > 100) {
        return res.status(400).json({ error: 'Max XP must be between 1 and 100' });
      }
      updates.maxXpPerMessage = max;
    }

    if (updates.cooldown !== undefined) {
      const cooldown = Number(updates.cooldown);
      if (isNaN(cooldown) || cooldown < 0 || cooldown > 3600) {
        return res.status(400).json({ error: 'Cooldown must be between 0 and 3600 seconds' });
      }
      updates.cooldown = cooldown;
    }

    // Cross-validate min and max XP
    if (updates.minXpPerMessage !== undefined && updates.maxXpPerMessage !== undefined) {
      if (updates.minXpPerMessage > updates.maxXpPerMessage) {
        return res.status(400).json({ error: 'Min XP must not exceed Max XP' });
      }
    }

    const config = await updateXPGuildConfig(req.params.guildId, updates);
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error updating XP config:', error);
    res.status(500).json({ error: 'Failed to update XP configuration' });
  }
});

// Get XP leaderboard
router.get('/guild/:guildId/xp/leaderboard', ensureServerManager, (req, res) => {
  try {
    let limit = parseInt(req.query.limit);
    if (isNaN(limit)) {
      limit = 10;
    }
    // Clamp limit between 1 and 100
    limit = Math.max(1, Math.min(100, limit));
    const leaderboard = getLeaderboard(req.params.guildId, limit);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error getting XP leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get user XP data
router.get('/guild/:guildId/xp/user/:userId', ensureServerManager, (req, res) => {
  try {
    const userData = getUserData(req.params.guildId, req.params.userId);
    const rank = getUserRank(req.params.guildId, req.params.userId);
    res.json({ ...userData, rank });
  } catch (error) {
    console.error('Error getting user XP:', error);
    res.status(500).json({ error: 'Failed to get user XP data' });
  }
});

// Add level role reward
router.post('/guild/:guildId/xp/level-roles', ensureServerManager, async (req, res) => {
  try {
    const { level, roleId } = req.body;

    if (!level || !roleId) {
      return res.status(400).json({ error: 'level and roleId are required' });
    }

    const levelNum = Number(level);
    if (isNaN(levelNum) || levelNum < 1 || levelNum > 1000) {
      return res.status(400).json({ error: 'Level must be between 1 and 1000' });
    }

    // Check for duplicate level
    const config = getXPGuildConfig(req.params.guildId);
    const existingReward = config.levelRoles?.find(r => r.level === levelNum);
    if (existingReward) {
      return res.status(400).json({ error: `A role reward already exists for level ${levelNum}` });
    }

    await setLevelRole(req.params.guildId, levelNum, roleId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding level role:', error);
    res.status(500).json({ error: 'Failed to add level role' });
  }
});

// Remove level role reward
router.delete('/guild/:guildId/xp/level-roles/:level', ensureServerManager, async (req, res) => {
  try {
    const level = Number(req.params.level);
    if (isNaN(level)) {
      return res.status(400).json({ error: 'Invalid level' });
    }

    // Check if level role exists before deleting
    const config = getXPGuildConfig(req.params.guildId);
    const existingReward = config.levelRoles?.find(r => r.level === level);
    if (!existingReward) {
      return res.status(404).json({ error: 'Level role not found' });
    }

    await removeLevelRole(req.params.guildId, level);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing level role:', error);
    res.status(500).json({ error: 'Failed to remove level role' });
  }
});

// Set channel XP multiplier
router.post('/guild/:guildId/xp/channel-multiplier', ensureServerManager, async (req, res) => {
  try {
    const { channelId, multiplier } = req.body;

    if (!channelId || multiplier === undefined) {
      return res.status(400).json({ error: 'channelId and multiplier are required' });
    }

    const mult = Number(multiplier);
    if (isNaN(mult) || mult < 0 || mult > 10) {
      return res.status(400).json({ error: 'Multiplier must be between 0 and 10' });
    }

    await setChannelMultiplier(req.params.guildId, channelId, mult);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting channel multiplier:', error);
    res.status(500).json({ error: 'Failed to set channel multiplier' });
  }
});

// Set role XP multiplier
router.post('/guild/:guildId/xp/role-multiplier', ensureServerManager, async (req, res) => {
  try {
    const { roleId, multiplier } = req.body;

    if (!roleId || multiplier === undefined) {
      return res.status(400).json({ error: 'roleId and multiplier are required' });
    }

    const mult = Number(multiplier);
    if (isNaN(mult) || mult < 0 || mult > 10) {
      return res.status(400).json({ error: 'Multiplier must be between 0 and 10' });
    }

    await setRoleMultiplier(req.params.guildId, roleId, mult);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting role multiplier:', error);
    res.status(500).json({ error: 'Failed to set role multiplier' });
  }
});

// Reset user XP
router.delete('/guild/:guildId/xp/user/:userId', ensureServerManager, async (req, res) => {
  try {
    const success = await resetUserXP(req.params.guildId, req.params.userId);
    res.json({ success });
  } catch (error) {
    console.error('Error resetting user XP:', error);
    res.status(500).json({ error: 'Failed to reset user XP' });
  }
});

// Reset all guild XP
router.delete('/guild/:guildId/xp/reset', ensureServerManager, async (req, res) => {
  try {
    const success = await resetGuildXP(req.params.guildId);
    res.json({ success });
  } catch (error) {
    console.error('Error resetting guild XP:', error);
    res.status(500).json({ error: 'Failed to reset guild XP' });
  }
});

module.exports = router;
