const { Events } = require('discord.js');
const schedule = require('node-schedule');
const { getBirthdays } = require('../utils/birthdays');
const { initReminders, schedulePendingReminders } = require('../utils/reminders');
const { initModeration, getAllTempbans, removeTempban, addLog } = require('../utils/moderation');
const { initEconomy } = require('../utils/economy');
const { initQuests } = require('../utils/quests');
const { initTrivia } = require('../utils/trivia');
const { initStats, getWeeklyRecap, generateRecapMessage } = require('../utils/stats');
const { initSnark } = require('../utils/snark');
const { initAchievements } = require('../utils/achievements');
const { initXP } = require('../utils/xp');
const logger = require('../utils/logger');

const CHANNEL_ID = process.env.BIRTHDAY_CHANNEL_ID;

async function checkBirthdays(client) {
  if (!CHANNEL_ID) return;

  const now = new Date();
  const today = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let channel;
  try {
    channel = await client.channels.fetch(CHANNEL_ID);
  } catch (error) {
    logger.error('Failed to fetch birthday channel', { error, channelId: CHANNEL_ID });
    return;
  }

  const birthdays = getBirthdays();
  for (const [userId, birthday] of Object.entries(birthdays)) {
    if (birthday === today) {
      try {
        const user = await client.users.fetch(userId);
        if (user) {
          await channel.send(`Happy Birthday, ${user.username}.`);
        }
      } catch (error) {
        logger.error('Failed to send birthday message', {
          error,
          userId,
          channelId: CHANNEL_ID,
        });
      }
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

    // Check for expired tempbans every minute
    schedule.scheduleJob('* * * * *', () => checkExpiredTempbans(client));
    logger.info('Tempban scheduler initialized');

    // Send weekly recap every Sunday at midnight
    schedule.scheduleJob('0 0 * * 0', () => sendWeeklyRecap(client));
    logger.info('Weekly recap scheduler initialized');
  },
};
