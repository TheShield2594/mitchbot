const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard, getUserStats } = require('../../utils/trivia');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivialeaderboard')
    .setDescription('View the trivia leaderboard for this server')
    .addIntegerOption((option) =>
      option
        .setName('limit')
        .setDescription('Number of users to show (default: 10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25)
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Check a specific user\'s stats')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Trivia leaderboard is only available in servers.',
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user');

    // If checking specific user stats
    if (targetUser) {
      const stats = getUserStats(interaction.guildId, targetUser.id);
      const accuracy = stats.totalAnswered > 0
        ? ((stats.wins / stats.totalAnswered) * 100).toFixed(1)
        : 0;

      const embed = new EmbedBuilder()
        .setColor('#6b7280')
        .setTitle('Trivia Stats')
        .setDescription(`**${targetUser.username}**${stats.wins === 0 ? ' hasn\'t won yet.' : ''}`)
        .addFields(
          { name: 'Points', value: `${stats.points}`, inline: true },
          { name: 'Wins', value: `${stats.wins}`, inline: true },
          { name: 'Accuracy', value: `${accuracy}%`, inline: true }
        )
        .setFooter({ text: `Total questions answered: ${stats.totalAnswered}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // Show leaderboard
    const limit = interaction.options.getInteger('limit') || 10;
    const leaderboard = getLeaderboard(interaction.guildId, limit);

    if (leaderboard.length === 0) {
      await interaction.reply({
        content: 'Nobody has played trivia yet. Shocking.',
        ephemeral: true,
      });
      return;
    }

    const leaderboardText = leaderboard
      .map((entry, index) => {
        const medal = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const accuracy = entry.totalAnswered > 0
          ? ((entry.wins / entry.totalAnswered) * 100).toFixed(0)
          : 0;
        return `${medal} **${entry.username}** - ${entry.points} pts (${entry.wins} wins, ${accuracy}% accuracy)`;
      })
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor('#6b7280')
      .setTitle('Trivia Leaderboard')
      .setDescription(leaderboardText || 'Empty. Typical.')
      .setFooter({ text: `${interaction.guild?.name || 'Server'} | Use /trivia to play` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
