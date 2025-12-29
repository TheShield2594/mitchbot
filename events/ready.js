const { Events } = require('discord.js');
const schedule = require('node-schedule');
const { getBirthdays } = require('../utils/birthdays');
const { initReminders, schedulePendingReminders } = require('../utils/reminders');
const { initModeration, getAllTempbans, removeTempban, addLog } = require('../utils/moderation');
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
    console.error('Failed to fetch birthday channel:', error);
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
        console.error(`Failed to send birthday message for user ${userId}:`, error);
      }
    }
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
    console.log(`✅ Logged in as ${client.user.tag}`);
    schedule.scheduleJob('0 0 * * *', () => checkBirthdays(client));
    try {
      await initReminders();
      await schedulePendingReminders(client);
    } catch (error) {
      console.error('Failed to initialize reminders', error);
    }
    try {
      await initModeration();
      console.log('✅ Moderation system initialized');
    } catch (error) {
      console.error('Failed to initialize moderation', error);
    }

    // Check for expired tempbans every minute
    schedule.scheduleJob('* * * * *', () => checkExpiredTempbans(client));
    console.log('✅ Tempban scheduler initialized');
  },
};
