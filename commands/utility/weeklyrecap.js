const { SlashCommandBuilder } = require('discord.js');
const { getWeeklyRecap, generateRecapMessage } = require('../../utils/stats');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weeklyrecap')
    .setDescription('Get a snarky summary of this week\'s server activity'),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Weekly recap is only available in servers.',
        ephemeral: true,
      });
      return;
    }

    const recap = getWeeklyRecap(interaction.guildId);
    const message = generateRecapMessage(recap, interaction.guild);

    await interaction.reply({
      content: `**Weekly Recap**\n${message}`,
    });
  },
};
