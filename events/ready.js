const { Events } = require('discord.js');
const schedule = require('node-schedule');
const { getBirthdays } = require('../utils/birthdays');
const { initReminders, schedulePendingReminders } = require('../utils/reminders');
const { initModeration } = require('../utils/moderation');

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
  },
};
