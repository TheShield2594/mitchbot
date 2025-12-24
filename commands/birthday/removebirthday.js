const { SlashCommandBuilder } = require('discord.js');
const { getBirthdays, removeBirthday } = require('../../utils/birthdays');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove_birthday')
    .setDescription('Remove a birthday reminder')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to remove a birthday for')
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    await interaction.deferReply({ ephemeral: true });

    if (!user || !getBirthdays()[user.id]) {
      await interaction.editReply({
        content: 'Usage: /remove_birthday @user',
      });
      return;
    }

    removeBirthday(user.id);
    await interaction.editReply({
      content: `Removed birthday for ${user.username}`,
    });
  },
};
