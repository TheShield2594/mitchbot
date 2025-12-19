const { SlashCommandBuilder } = require('discord.js');

const replies = [
  'This could have been shorter.',
  'This did not need to be said.',
  'Important idea. Too many words.',
  'Half of this is filler.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('necessary')
    .setDescription('Judges whether something needed to be said'),
  async execute(interaction) {
    const reply = replies[Math.floor(Math.random() * replies.length)];
    await interaction.reply(reply);
  },
};
