const { SlashCommandBuilder } = require('discord.js');

const responses = [
  'NPC energy: HIGH. Repeating dialogue detected.',
  'NPC energy: MODERATE. Awaiting quest assignment.',
  'NPC energy: LOW. You are thinking independently today.',
  'NPC energy: CRITICAL. You just said “huh, interesting.”',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('npc')
    .setDescription('Rates your NPC energy for today'),
  async execute(interaction) {
    const reply = responses[Math.floor(Math.random() * responses.length)];
    await interaction.reply(reply);
  },
};
