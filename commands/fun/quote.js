const { request } = require('undici');
const { SlashCommandBuilder } = require('discord.js');
const { logCommandError } = require('../../utils/commandLogger');

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
      logCommandError('Error fetching quote', interaction, { error });
      await interaction.editReply('Couldn\'t get a quote. Move on.');
    }
  },
};
