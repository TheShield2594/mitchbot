const { SlashCommandBuilder } = require('discord.js');

const quests = [
  'Stare at something longer than normal.',
  'Say “interesting” and mean it.',
  'Open a game and close it immediately.',
  'Scroll without purpose.',
  'Stand up, then sit back down.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Generates a terrible daily quest'),
  async execute(interaction) {
    const quest = quests[Math.floor(Math.random() * quests.length)];
    await interaction.reply(`🗺️ Daily Quest:\n${quest}`);
  },
};
