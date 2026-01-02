const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { syncCommands } = require('../../utils/commandSync');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('synccommands')
    .setDescription('Re-sync application command registration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const token = process.env.CLIENT_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.COMMAND_GUILD_ID || null;

    if (!token || !clientId) {
      await interaction.editReply(
        'Missing required environment variables. Please set CLIENT_TOKEN and CLIENT_ID in your environment to sync commands.'
      );
      return;
    }

    try {
      await syncCommands({
        token,
        clientId,
        guildId,
        logger: console,
      });
      await interaction.editReply('Command registration sync complete.');
    } catch (error) {
      console.error('Command sync failed:', error.message || 'Unknown error');
      await interaction.editReply(
        'Command sync failed. Check logs for details.'
      );
    }
  },
};
