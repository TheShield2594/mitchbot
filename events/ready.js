const { Events } = require('discord.js');
const schedule = require('node-schedule');
const { getBirthdays } = require('../utils/birthdays');
const { initReminders, schedulePendingReminders } = require('../utils/reminders');

const CHANNEL_ID = process.env.BIRTHDAY_CHANNEL_ID;

async function checkBirthdays(client) {
  if (!CHANNEL_ID) return;

  const today = new Date().toISOString().slice(5, 10);
  const channel = await client.channels.fetch(CHANNEL_ID);

  for (const userId of Object.keys(getBirthdays())) {
    if (getBirthdays()[userId] === today) {
      const user = await client.users.fetch(userId);
      if (user && channel) {
        await channel.send(`Happy Birthday, ${user.username}! 🎉`);
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
  },
};
