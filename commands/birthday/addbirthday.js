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

    if (!/^\d{2}-\d{2}$/.test(date)) {
      await interaction.reply({
        content: 'Usage: /add_birthday @user MM-DD',
        ephemeral: true,
      });
      return;
    }

    addBirthday(user.id, date);
    await interaction.reply({
      content: `Added birthday for ${user.username} on ${date}`,
      ephemeral: true,
    });
  },
};
