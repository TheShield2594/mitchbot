const { SlashCommandBuilder } = require('discord.js');
const { getBirthdays, removeBirthday } = require('../../utils/birthdays');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove_birthday')
    .setDescription('Remove a birthday reminder')
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to remove a birthday for')
        .setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    await interaction.deferReply({ ephemeral: true });

    // Ensure command is only used in guilds
    if (!interaction.guildId) {
      await interaction.editReply({
        content: 'This command can only be used in a server, not in DMs.',
      });
      return;
    }

    const guildBirthdays = getBirthdays(interaction.guildId);
    if (!user || !guildBirthdays[user.id]) {
      await interaction.editReply({
        content: `No birthday found for ${user?.username || 'that user'}. Make sure they have a birthday set first.`,
      });
      return;
    }

    removeBirthday(interaction.guildId, user.id);
    await interaction.editReply({
      content: `Removed birthday for ${user.username}`,
    });
  },
};
