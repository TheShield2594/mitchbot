const express = require('express');
const router = express.Router();
const { ensureServerManager } = require('../middleware/auth');
const { getGuildConfig, updateGuildConfig, getLogs, getWarnings, clearWarnings } = require('../../utils/moderation');
const { getBirthdays, addBirthday, removeBirthday } = require('../../utils/birthdays');
const {
  getMemberGrowthData,
  getCommandAnalytics,
  getTopUsers,
  getAutomodViolations,
  getAnalyticsSummary
} = require('../../utils/analytics');

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
    const days = parseInt(req.query.days) || 30;
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
    const days = parseInt(req.query.days) || 30;
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
    const days = parseInt(req.query.days) || 30;
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
    const limit = parseInt(req.query.limit) || 10;
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
          } catch {
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
    } catch {
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
    const days = parseInt(req.query.days) || 30;
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
          } catch {
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
    } catch {
      // If we can't fetch Discord data, return without user details
      res.json(data);
    }
  } catch (error) {
    console.error('Error getting automod violations:', error);
    res.status(500).json({ error: 'Failed to get automod violations' });
  }
});

module.exports = router;
