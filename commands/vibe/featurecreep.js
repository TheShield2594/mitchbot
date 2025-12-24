const { SlashCommandBuilder } = require('discord.js');

const stages = [
  'Started as a button.',
  'Added settings.',
  'Added profiles.',
  'Added analytics.',
  'Added AI.',
  'No one uses it anymore.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('featurecreep')
    .setDescription('Simulates feature creep'),
  async execute(interaction) {
    await interaction.deferReply();
    await interaction.editReply(stages.join('\n'));
  },
};
