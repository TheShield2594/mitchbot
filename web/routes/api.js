const express = require('express');
const router = express.Router();
const { ensureServerManager } = require('../middleware/auth');
const { getGuildConfig, updateGuildConfig, getLogs, getWarnings, clearWarnings } = require('../../utils/moderation');
const { getBirthdays, addBirthday, removeBirthday } = require('../../utils/birthdays');
const {
  getEconomyConfig,
  updateEconomyConfig,
  getShopItems,
  addShopItem,
  updateShopItem,
  deleteShopItem,
} = require('../../utils/economy');
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
const {
  getMemberGrowthData,
  getCommandAnalytics,
  getTopUsers,
  getAutomodViolations,
  getAnalyticsSummary
} = require('../../utils/analytics');
const {
  getGuildConfig: getReactionRolesConfig,
  updateGuildConfig: updateReactionRolesConfig,
  addReactionRoleMessage,
  removeReactionRoleMessage,
  addRoleToMessage,
  removeRoleFromMessage,
  getAllReactionRoleMessages,
  setEnabled: setReactionRolesEnabled,
} = require('../../utils/reactionRoles');

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

// ============== ANALYTICS ENDPOINTS ==============

// Get comprehensive analytics summary
router.get('/guild/:guildId/analytics', ensureServerManager, async (req, res) => {
  try {
    let days = parseInt(req.query.days, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      days = 30; // Default to 30 days
    }
    const analytics = await getAnalyticsSummary(req.params.guildId, days);
    res.json(analytics);
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get member growth data
router.get('/guild/:guildId/analytics/member-growth', ensureServerManager, async (req, res) => {
  try {
    let days = parseInt(req.query.days, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      days = 30; // Default to 30 days
    }
    const data = await getMemberGrowthData(req.params.guildId, days);
    res.json(data);
  } catch (error) {
    console.error('Error getting member growth data:', error);
    res.status(500).json({ error: 'Failed to get member growth data' });
  }
});

// Get command usage analytics
router.get('/guild/:guildId/analytics/commands', ensureServerManager, async (req, res) => {
  try {
    let days = parseInt(req.query.days, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      days = 30; // Default to 30 days
    }
    const data = await getCommandAnalytics(req.params.guildId, days);
    res.json(data);
  } catch (error) {
    console.error('Error getting command analytics:', error);
    res.status(500).json({ error: 'Failed to get command analytics' });
  }
});

// Get top active users
router.get('/guild/:guildId/analytics/top-users', ensureServerManager, async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit)) {
      limit = 10;
    }
    // Clamp limit between 1 and 100
    limit = Math.max(1, Math.min(100, limit));
    const data = await getTopUsers(req.params.guildId, limit);

    // Fetch user details from Discord
    try {
      const client = req.app.get('client');
      const guild = await client.guilds.fetch(req.params.guildId);

      const usersWithDetails = await Promise.all(
        data.map(async (user) => {
          try {
            const member = await guild.members.fetch(user.userId);
            return {
              ...user,
              username: member.user.username,
              displayName: member.displayName,
              avatar: member.user.displayAvatarURL(),
            };
          } catch (memberError) {
            // User may have left the server
            return {
              ...user,
              username: 'Unknown User',
              displayName: 'Unknown User',
              avatar: null,
            };
          }
        })
      );

      res.json(usersWithDetails);
    } catch (guildError) {
      console.warn('Could not fetch Discord user details:', guildError.message);
      // If we can't fetch Discord data, return without user details
      res.json(data);
    }
  } catch (error) {
    console.error('Error getting top users:', error);
    res.status(500).json({ error: 'Failed to get top users' });
  }
});

// Get automod violation analytics
router.get('/guild/:guildId/analytics/automod-violations', ensureServerManager, async (req, res) => {
  try {
    let days = parseInt(req.query.days, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      days = 30; // Default to 30 days
    }
    const data = await getAutomodViolations(req.params.guildId, days);

    // Fetch user details for top violators
    try {
      const client = req.app.get('client');
      const guild = await client.guilds.fetch(req.params.guildId);

      const violatorsWithDetails = await Promise.all(
        data.topViolators.map(async (violator) => {
          try {
            const member = await guild.members.fetch(violator.userId);
            return {
              ...violator,
              username: member.user.username,
              displayName: member.displayName,
              avatar: member.user.displayAvatarURL(),
            };
          } catch (memberError) {
            // User may have left the server
            return {
              ...violator,
              username: 'Unknown User',
              displayName: 'Unknown User',
              avatar: null,
            };
          }
        })
      );

      res.json({
        ...data,
        topViolators: violatorsWithDetails,
      });
    } catch (guildError) {
      console.warn('Could not fetch Discord user details:', guildError.message);
      // If we can't fetch Discord data, return without user details
      res.json(data);
    }
  } catch (error) {
    console.error('Error getting automod violations:', error);
    res.status(500).json({ error: 'Failed to get automod violations' });
  }
});

// ============================================
// ECONOMY SYSTEM ENDPOINTS
// ============================================

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

// ============================================
// ECONOMY SHOP ROUTES
// ============================================

// Get all shop items
router.get('/guild/:guildId/economy/shop', ensureServerManager, async (req, res) => {
  try {
    const items = getShopItems(req.params.guildId);
    res.json({ items });
  } catch (error) {
    console.error('Error fetching shop items:', error);
    res.status(500).json({ error: 'Failed to fetch shop items' });
  }
});

// Create a shop item
router.post('/guild/:guildId/economy/shop', ensureServerManager, async (req, res) => {
  try {
    const { name, description, price, type, roleId, stock } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'name and price are required' });
    }

    if (name.length > 100) {
      return res.status(400).json({ error: 'name must be 100 characters or less' });
    }

    if (description && description.length > 500) {
      return res.status(400).json({ error: 'description must be 500 characters or less' });
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }

    if (type === 'role' && !roleId) {
      return res.status(400).json({ error: 'roleId is required for role items' });
    }

    const stockNum = stock !== undefined ? Number(stock) : -1;
    if (isNaN(stockNum) || stockNum < -1) {
      return res.status(400).json({ error: 'stock must be -1 (unlimited) or a non-negative number' });
    }

    const item = addShopItem(req.params.guildId, {
      name: name.trim(),
      description: description?.trim() || '',
      price: priceNum,
      type: type || 'item',
      roleId: roleId || null,
      stock: stockNum,
    });

    res.json({ item });
  } catch (error) {
    console.error('Error creating shop item:', error);
    res.status(500).json({ error: 'Failed to create shop item' });
  }
});

// Update a shop item
router.put('/guild/:guildId/economy/shop/:itemId', ensureServerManager, async (req, res) => {
  try {
    const { name, description, price, type, roleId, stock } = req.body;
    const updates = {};

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length > 100) {
        return res.status(400).json({ error: 'name must be 100 characters or less' });
      }
      updates.name = trimmedName;
    }

    if (description !== undefined) {
      const trimmedDescription = description.trim();
      if (trimmedDescription.length > 500) {
        return res.status(400).json({ error: 'description must be 500 characters or less' });
      }
      updates.description = trimmedDescription;
    }
    if (price !== undefined) {
      const trimmedPrice = typeof price === 'string' ? price.trim() : price;
      const priceNum = Number(trimmedPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: 'price must be a non-negative number' });
      }
      updates.price = priceNum;
    }
    if (type !== undefined) updates.type = type;
    if (roleId !== undefined) updates.roleId = roleId;
    if (stock !== undefined) {
      const trimmedStock = typeof stock === 'string' ? stock.trim() : stock;
      const stockNum = Number(trimmedStock);
      if (isNaN(stockNum) || stockNum < -1) {
        return res.status(400).json({ error: 'stock must be -1 (unlimited) or a non-negative number' });
      }
      updates.stock = stockNum;
    }

    const item = updateShopItem(req.params.guildId, req.params.itemId, updates);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ item });
  } catch (error) {
    console.error('Error updating shop item:', error);
    res.status(500).json({ error: 'Failed to update shop item' });
  }
});

// Delete a shop item
router.delete('/guild/:guildId/economy/shop/:itemId', ensureServerManager, async (req, res) => {
  try {
    const success = deleteShopItem(req.params.guildId, req.params.itemId);

    if (!success) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shop item:', error);
    res.status(500).json({ error: 'Failed to delete shop item' });
  }
});

// ============================================
// REACTION ROLES ROUTES
// ============================================

// Get reaction roles configuration
router.get('/guild/:guildId/reactionroles', ensureServerManager, (req, res) => {
  try {
    const config = getReactionRolesConfig(req.params.guildId);
    res.json(config);
  } catch (error) {
    console.error('Error getting reaction roles config:', error);
    res.status(500).json({ error: 'Failed to get reaction roles configuration' });
  }
});

// Update reaction roles enabled status
router.post('/guild/:guildId/reactionroles/enabled', ensureServerManager, async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    await setReactionRolesEnabled(req.params.guildId, enabled);
    res.json({ success: true, enabled });
  } catch (error) {
    console.error('Error updating reaction roles enabled status:', error);
    res.status(500).json({ error: 'Failed to update reaction roles status' });
  }
});

// Create a new reaction role message
router.post('/guild/:guildId/reactionroles/messages', ensureServerManager, async (req, res) => {
  try {
    const { messageId, channelId, roles } = req.body;

    if (!messageId || !channelId) {
      return res.status(400).json({ error: 'messageId and channelId are required' });
    }

    if (roles && !Array.isArray(roles)) {
      return res.status(400).json({ error: 'roles must be an array' });
    }

    const message = await addReactionRoleMessage(req.params.guildId, messageId, channelId, roles || []);
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error creating reaction role message:', error);
    res.status(500).json({ error: 'Failed to create reaction role message' });
  }
});

// Delete a reaction role message
router.delete('/guild/:guildId/reactionroles/messages/:messageId', ensureServerManager, async (req, res) => {
  try {
    const success = await removeReactionRoleMessage(req.params.guildId, req.params.messageId);

    if (!success) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting reaction role message:', error);
    res.status(500).json({ error: 'Failed to delete reaction role message' });
  }
});

// Add a role to a message
router.post('/guild/:guildId/reactionroles/messages/:messageId/roles', ensureServerManager, async (req, res) => {
  try {
    const { emoji, roleId, description } = req.body;

    if (!emoji || !roleId) {
      return res.status(400).json({ error: 'emoji and roleId are required' });
    }

    const message = await addRoleToMessage(req.params.guildId, req.params.messageId, emoji, roleId, description);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error adding role to message:', error);
    res.status(500).json({ error: 'Failed to add role to message' });
  }
});

// Remove a role from a message
router.delete('/guild/:guildId/reactionroles/messages/:messageId/roles/:emoji', ensureServerManager, async (req, res) => {
  try {
    const success = await removeRoleFromMessage(req.params.guildId, req.params.messageId, req.params.emoji);

    if (!success) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing role from message:', error);
    res.status(500).json({ error: 'Failed to remove role from message' });
  }
});

// ============================================
// WELCOME MESSAGE ROUTES
// ============================================

// Get welcome/leave message configuration
router.get('/guild/:guildId/welcome', ensureServerManager, (req, res) => {
  try {
    const config = getGuildConfig(req.params.guildId);
    res.json({
      welcome: config.welcome || {
        enabled: false,
        channelId: null,
        message: 'Welcome to the server, {user}!',
      },
      leave: config.leave || {
        enabled: false,
        channelId: null,
        message: '{username} has left the server.',
      },
    });
  } catch (error) {
    console.error('Error getting welcome config:', error);
    res.status(500).json({ error: 'Failed to get welcome configuration' });
  }
});

// Update welcome message configuration
router.post('/guild/:guildId/welcome', ensureServerManager, async (req, res) => {
  try {
    const config = getGuildConfig(req.params.guildId);
    const { welcome, leave } = req.body;

    if (welcome) {
      if (welcome.message && welcome.message.length > 2000) {
        return res.status(400).json({ error: 'Welcome message must be 2000 characters or less' });
      }

      config.welcome = {
        enabled: welcome.enabled !== undefined ? welcome.enabled : config.welcome.enabled,
        channelId: welcome.channelId !== undefined ? welcome.channelId : config.welcome.channelId,
        message: welcome.message !== undefined ? welcome.message : config.welcome.message,
      };
    }

    if (leave) {
      if (leave.message && leave.message.length > 2000) {
        return res.status(400).json({ error: 'Leave message must be 2000 characters or less' });
      }

      config.leave = {
        enabled: leave.enabled !== undefined ? leave.enabled : config.leave.enabled,
        channelId: leave.channelId !== undefined ? leave.channelId : config.leave.channelId,
        message: leave.message !== undefined ? leave.message : config.leave.message,
      };
    }

    await updateGuildConfig(req.params.guildId, config);
    res.json({ success: true, welcome: config.welcome, leave: config.leave });
  } catch (error) {
    console.error('Error updating welcome config:', error);
    res.status(500).json({ error: 'Failed to update welcome configuration' });
  }
});

module.exports = router;
