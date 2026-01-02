const { request } = require('undici');
const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Get a random quote'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const response = await request('https://api.quotable.io/random', {
        signal: AbortSignal.timeout(5000),
      });

      if (response.statusCode >= 400) {
        await interaction.editReply('Quote API is down. How inspirational.');
        return;
      }

      const data = await response.body.json();

      if (!data.content || !data.author) {
        await interaction.editReply('No quotes. Probably for the best.');
        return;
      }

      await interaction.editReply(`"${data.content}"\n\n— ${data.author}`);
    } catch (error) {
      logger.error('Error fetching quote', {
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        userId: interaction.user.id,
        commandName: interaction.commandName,
        error,
      });
      await interaction.editReply('Couldn\'t get a quote. Move on.');
    }
  },
};
