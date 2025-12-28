const { SlashCommandBuilder } = require('discord.js');
const { addBirthday } = require('../../utils/birthdays');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add_birthday')
    .setDescription('Add a Birthday')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to add a birthday for')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('date')
        .setDescription('The birthday in MM-DD format')
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const date = interaction.options.getString('date');
    await interaction.deferReply({ ephemeral: true });

    if (!/^\d{2}-\d{2}$/.test(date)) {
      await interaction.editReply({
        content: 'Invalid format. Use MM-DD (e.g., 03-15)',
      });
      return;
    }

    const [month, day] = date.split('-').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      await interaction.editReply({
        content: 'Invalid date. Month must be 01-12, day must be 01-31',
      });
      return;
    }

    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month - 1]) {
      await interaction.editReply({
        content: `Invalid date. Month ${month.toString().padStart(2, '0')} only has ${daysInMonth[month - 1]} days`,
      });
      return;
    }

    addBirthday(user.id, date);
    await interaction.editReply({
      content: `Added birthday for ${user.username} on ${date}`,
    });
  },
};
