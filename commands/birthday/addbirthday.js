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
        content: 'Usage: /add_birthday @user MM-DD',
      });
      return;
    }

    addBirthday(user.id, date);
    await interaction.editReply({
      content: `Added birthday for ${user.username} on ${date}`,
    });
  },
};
