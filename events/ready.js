const { Events } = require('discord.js');
const schedule = require('node-schedule');
const { getBirthdays } = require('../utils/birthdays');
const { initReminders, schedulePendingReminders } = require('../utils/reminders');
const { initModeration, getAllTempbans, removeTempban, addLog, getGuildConfig, addBirthdayRole, removeBirthdayRole, getAllBirthdayRoles } = require('../utils/moderation');
const { initEconomy } = require('../utils/economy');
const { initQuests } = require('../utils/quests');
const { initTrivia } = require('../utils/trivia');
const { initStats, getWeeklyRecap, generateRecapMessage } = require('../utils/stats');
const { initSnark } = require('../utils/snark');
const { initAchievements } = require('../utils/achievements');
const { initXP } = require('../utils/xp');
const { initReactionRoles } = require('../utils/reactionRoles');
const logger = require('../utils/logger');

// Track active birthday roles for removal after 24 hours (in-memory cache, backed by persistent storage)
const activeBirthdayRoles = new Map(); // key: `${guildId}-${userId}`, value: { guildId, userId, roleId, expiresAt }

// Track announced birthdays to prevent duplicates on same day
const announcedBirthdays = new Map(); // key: `${guildId}-${userId}-${today}`, value: timestamp

async function checkBirthdays(client) {
  const now = new Date();
  const today = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const birthdays = getBirthdays();

  // Process birthdays for each guild
  for (const guild of client.guilds.cache.values()) {
    const config = getGuildConfig(guild.id);

    // Skip if birthday feature is not enabled for this guild
    if (!config.birthday || !config.birthday.enabled) {
      continue;
    }

    // Skip if no channel configured
    if (!config.birthday.channelId) {
      continue;
    }

    let channel;
    try {
      channel = await client.channels.fetch(config.birthday.channelId);
    } catch (error) {
      logger.error('Failed to fetch birthday channel', {
        error,
        guildId: guild.id,
        channelId: config.birthday.channelId
      });
      continue;
    }

    // Check each birthday
    for (const [userId, birthday] of Object.entries(birthdays)) {
      if (birthday === today) {
        try {
          // Check if we already announced this birthday today
          const announceKey = `${guild.id}-${userId}-${today}`;
          if (announcedBirthdays.has(announceKey)) {
            continue; // Skip, already announced
          }

          // Fetch the user
          const user = await client.users.fetch(userId);
          if (!user) continue;

          // Try to get the member in this guild
          let member;
          try {
            member = await guild.members.fetch(userId);
          } catch (error) {
            // User is not in this guild, skip
            continue;
          }

          // Prepare and send birthday message
          let message = config.birthday.customMessage || 'Happy Birthday, {mention}! 🎉';
          message = message
            .replace(/{mention}/g, `<@${userId}>`)
            .replace(/{username}/g, user.username)
            .replace(/{user}/g, user.username);

          await channel.send(message);

          // Mark this birthday as announced for today
          announcedBirthdays.set(announceKey, Date.now());

          logger.info('Birthday message sent', {
            guildId: guild.id,
            userId,
            username: user.username
          });

          // Assign birthday role if configured
          if (config.birthday.roleId && member) {
            try {
              const role = guild.roles.cache.get(config.birthday.roleId);
              if (role) {
                const memberHasRole = member.roles.cache.has(config.birthday.roleId);

                // Add role if member doesn't have it
                if (!memberHasRole) {
                  await member.roles.add(config.birthday.roleId, 'Birthday role');
                }

                // Schedule role removal after 24 hours (regardless of whether we just added it)
                const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
                const key = `${guild.id}-${userId}`;

                // Store in memory cache
                activeBirthdayRoles.set(key, {
                  guildId: guild.id,
                  userId,
                  roleId: config.birthday.roleId,
                  expiresAt
                });

                // Persist to config
                addBirthdayRole(guild.id, userId, config.birthday.roleId, expiresAt);

                logger.info('Birthday role tracked for removal', {
                  guildId: guild.id,
                  userId,
                  roleId: config.birthday.roleId,
                  alreadyHadRole: memberHasRole
                });
              }
            } catch (error) {
              logger.error('Failed to assign birthday role', {
                error,
                guildId: guild.id,
                userId,
                roleId: config.birthday.roleId
              });
            }
          }
        } catch (error) {
          logger.error('Failed to send birthday message', {
            error,
            userId,
            guildId: guild.id,
            channelId: config.birthday.channelId,
          });
        }
      }
    }
  }

  // Clean up old announcement entries (remove entries older than today)
  const cutoffTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
  for (const [key, timestamp] of announcedBirthdays.entries()) {
    if (timestamp < cutoffTime) {
      announcedBirthdays.delete(key);
    }
  }
}

async function checkExpiredBirthdayRoles(client) {
  const now = Date.now();
  const expiredEntries = [];

  // Check in-memory cache for expired roles
  for (const [key, entry] of activeBirthdayRoles.entries()) {
    if (entry.expiresAt <= now) {
      expiredEntries.push({ key, ...entry });
    }
  }

  for (const entry of expiredEntries) {
    try {
      const guild = await client.guilds.fetch(entry.guildId);
      if (!guild) {
        // Guild not found, clean up
        removeBirthdayRole(entry.guildId, entry.userId);
        activeBirthdayRoles.delete(entry.key);
        continue;
      }

      const member = await guild.members.fetch(entry.userId);
      if (!member) {
        // Member not found, clean up
        removeBirthdayRole(entry.guildId, entry.userId);
        activeBirthdayRoles.delete(entry.key);
        continue;
      }

      // Remove the birthday role
      if (member.roles.cache.has(entry.roleId)) {
        await member.roles.remove(entry.roleId, 'Birthday role expired');
        logger.info('Birthday role removed', {
          guildId: entry.guildId,
          userId: entry.userId,
          roleId: entry.roleId
        });
      }

      // Clean up from both persistent storage and memory
      removeBirthdayRole(entry.guildId, entry.userId);
      activeBirthdayRoles.delete(entry.key);
    } catch (error) {
      logger.error('Failed to remove expired birthday role', {
        error,
        guildId: entry.guildId,
        userId: entry.userId,
        roleId: entry.roleId
      });
      // Remove from tracking even if removal failed
      removeBirthdayRole(entry.guildId, entry.userId);
      activeBirthdayRoles.delete(entry.key);
    }
  }
}

async function sendWeeklyRecap(client) {
  // Send weekly recap to configured channel (if set)
  const recapChannelId = process.env.RECAP_CHANNEL_ID;
  if (!recapChannelId) return;

  try {
    const channel = await client.channels.fetch(recapChannelId);
    if (!channel) return;

    // Get the guild from the channel
    const guildId = channel.guildId;
    if (!guildId) return;

    const recap = getWeeklyRecap(guildId);
    if (recap.totalCommands === 0) return; // Don't send if no activity

    const message = generateRecapMessage(recap, channel.guild);
    await channel.send(`**Weekly Recap**\n${message}`);

    logger.info('Weekly recap sent', { guildId, channelId: recapChannelId });
  } catch (error) {
    logger.error('Failed to send weekly recap', { error });
  }
}

async function checkExpiredTempbans(client) {
  try {
    const expiredTempbans = getAllTempbans();

    for (const tempban of expiredTempbans) {
      const { userId, guildId, caseId } = tempban;

      try {
        const guild = await client.guilds.fetch(guildId);
        if (!guild) {
          logger.warn('Guild not found for tempban expiry', { guildId, userId });
          removeTempban(guildId, userId);
          continue;
        }

        // Check if user is still banned
        const bans = await guild.bans.fetch();
        if (!bans.has(userId)) {
          // Already unbanned manually, just remove from tracking
          removeTempban(guildId, userId);
          continue;
        }

        // Unban the user
        await guild.members.unban(userId, 'Temporary ban expired');

        // Remove from tempban tracking
        removeTempban(guildId, userId);

        // Log the action
        addLog(guildId, {
          actionType: 'unban',
          action: 'Temporary Ban Expired',
          targetUserId: userId,
          targetTag: 'Unknown User',
          moderatorId: client.user.id,
          moderatorTag: client.user.username,
          reason: `Automatic unban - tempban expired (original case #${caseId})`,
          relatedCaseId: caseId,
          duration: null,
        });

        logger.info('Tempban expired and user unbanned', { guildId, userId, caseId });
      } catch (error) {
        logger.error('Failed to process expired tempban', {
          guildId,
          userId,
          caseId,
          error,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to check expired tempbans', { error });
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info('Logged in', { userTag: client.user.tag, userId: client.user.id });
    schedule.scheduleJob('0 0 * * *', () => checkBirthdays(client));
    try {
      await initReminders();
      await schedulePendingReminders(client);
    } catch (error) {
      logger.error('Failed to initialize reminders', { error });
    }
    try {
      await initModeration();
      logger.info('Moderation system initialized');

      // Load all birthday roles into in-memory cache from persistent storage
      const allBirthdayRoles = getAllBirthdayRoles();
      for (const role of allBirthdayRoles) {
        const key = `${role.guildId}-${role.userId}`;
        activeBirthdayRoles.set(key, {
          guildId: role.guildId,
          userId: role.userId,
          roleId: role.roleId,
          expiresAt: role.expiresAt
        });
      }
      logger.info('Birthday roles cache initialized', { count: activeBirthdayRoles.size });
    } catch (error) {
      logger.error('Failed to initialize moderation', { error });
    }

    try {
      await initEconomy();
      logger.info('Economy system initialized');
    } catch (error) {
      logger.error('Failed to initialize economy', { error });
    }

    try {
      await initQuests();
      logger.info('Quest streak system initialized');
    } catch (error) {
      logger.error('Failed to initialize quests', { error });
    }

    try {
      await initTrivia();
      logger.info('Trivia leaderboard system initialized');
    } catch (error) {
      logger.error('Failed to initialize trivia', { error });
    }

    try {
      await initStats();
      logger.info('Server stats tracking initialized');
    } catch (error) {
      logger.error('Failed to initialize stats', { error });
    }

    try {
      await initSnark();
      logger.info('Custom snark system initialized');
    } catch (error) {
      logger.error('Failed to initialize snark', { error });
    }

    try {
      await initAchievements();
      logger.info('Anti-achievements system initialized');
    } catch (error) {
      logger.error('Failed to initialize achievements', { error });
    }

    try {
      await initXP();
      logger.info('XP/Leveling system initialized');
    } catch (error) {
      logger.error('Failed to initialize XP system', { error });
    }

    try {
      await initReactionRoles();
      logger.info('Reaction roles system initialized');
    } catch (error) {
      logger.error('Failed to initialize reaction roles', { error });
    }

    // Check for expired tempbans every minute
    schedule.scheduleJob('* * * * *', () => checkExpiredTempbans(client));
    logger.info('Tempban scheduler initialized');

    // Check for expired birthday roles every hour
    schedule.scheduleJob('0 * * * *', () => checkExpiredBirthdayRoles(client));
    logger.info('Birthday role scheduler initialized');

    // Send weekly recap every Sunday at midnight
    schedule.scheduleJob('0 0 * * 0', () => sendWeeklyRecap(client));
    logger.info('Weekly recap scheduler initialized');
  },
};
