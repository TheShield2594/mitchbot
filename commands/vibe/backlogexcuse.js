const { SlashCommandBuilder } = require('discord.js');

const excuses = [
  'Waiting for the right mood.',
  'Saving it for a better time.',
  'Afraid it won’t live up to expectations.',
  'Too long.',
  'Started something else.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backlogexcuse')
    .setDescription('Generates a reason you haven’t played it yet'),
  async execute(interaction) {
    const excuse = excuses[Math.floor(Math.random() * excuses.length)];
    await interaction.reply(`Reason: ${excuse}`);
  },
};
