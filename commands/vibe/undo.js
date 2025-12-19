const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('undo')
    .setDescription('Undo your last decision'),
  async execute(interaction) {
    await interaction.reply(
      'Undoing last action...\n❌ Failed: irreversible life decision detected.'
    );
  },
};
