const { SlashCommandBuilder } = require('discord.js');

const achievements = [
  '🏆 Opened the app',
  '🏆 Didn’t close immediately',
  '🏆 Read the description',
  '🏆 Still here for some reason',
  '🏆 Achieved absolutely nothing',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement')
    .setDescription('Awards a completely useless achievement'),
  async execute(interaction) {
    const achievement =
      achievements[Math.floor(Math.random() * achievements.length)];

    await interaction.deferReply();
    await interaction.editReply(
      `${interaction.user.username} unlocked an achievement:\n${achievement}`
    );
  },
};
