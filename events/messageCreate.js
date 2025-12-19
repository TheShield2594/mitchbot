const { Events } = require('discord.js');
const {
  addBirthday,
  getBirthdays,
  removeBirthday,
} = require('../utils/birthdays');

const PREFIX = process.env.PREFIX || '!';

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author?.bot) return;
    if (message.webhookId) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).split(' ');
    const command = args.shift().toLowerCase();

    if (command === 'add_birthday') {
      const user = message.mentions.users.first();
      const date = args[1];

      if (!user || !date || !/^\d{2}-\d{2}$/.test(date)) {
        await message.channel.send('Usage: !add_birthday @user MM-DD');
        return;
      }

      addBirthday(user.id, date);
      await message.channel.send(`Added birthday for ${user.username} on ${date}`);
    }

    if (command === 'remove_birthday') {
      const user = message.mentions.users.first();

      if (!user || !getBirthdays()[user.id]) {
        await message.channel.send('Usage: !remove_birthday @user');
        return;
      }

      removeBirthday(user.id);
      await message.channel.send(`Removed birthday for ${user.username}`);
    }
  },
};
