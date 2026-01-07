const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard, initXP } = require('../../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the XP leaderboard')
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('Number of users to display (default: 10, max: 25)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25)
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    await initXP();

    const limit = interaction.options.getInteger('limit') || 10;
    const leaderboard = getLeaderboard(interaction.guildId, limit);

    if (leaderboard.length === 0) {
      await interaction.reply({
        content: 'No one has earned XP yet. Start chatting to gain XP!',
        ephemeral: true,
      });
      return;
    }

    // Build leaderboard text
    const leaderboardText = leaderboard
      .map((entry, index) => {
        const medal =
          index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
        return `${medal} <@${entry.userId}> - **Level ${entry.level}** (${entry.totalXp.toLocaleString()} XP)`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(`${interaction.guild.name} - XP Leaderboard`)
      .setDescription(leaderboardText)
      .setFooter({
        text: `Showing top ${leaderboard.length} users`,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
