const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getServerStats } = require('../../utils/stats');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverstats')
    .setDescription('View server command usage statistics'),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Server stats are only available in servers.',
        ephemeral: true,
      });
      return;
    }

    const stats = getServerStats(interaction.guildId);

    if (stats.thisWeek.total === 0) {
      await interaction.reply({
        content: 'No commands used this week. Silent treatment.',
        ephemeral: true,
      });
      return;
    }

    const commandsList = stats.thisWeek.commands
      .map(([cmd, count], index) => `${index + 1}. \`/${cmd}\` - ${count} use${count === 1 ? '' : 's'}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor('#6b7280')
      .setTitle('Server Stats')
      .setDescription(`This week: ${stats.thisWeek.total} command${stats.thisWeek.total === 1 ? '' : 's'} from ${stats.thisWeek.uniqueUsers} user${stats.thisWeek.uniqueUsers === 1 ? '' : 's'}.`)
      .addFields({
        name: 'Most Used Commands',
        value: commandsList || 'None yet.',
        inline: false,
      })
      .setFooter({ text: `${interaction.guild?.name || 'Server'} | Stats reset weekly on Sundays` })
      .setTimestamp();

    // Add history if available
    if (stats.history.length > 0) {
      const historyText = [...stats.history]
        .reverse()
        .map((week) => {
          const weekDate = new Date(week.weekStart);
          const dateStr = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `${dateStr}: ${week.totalCommands} commands`;
        })
        .join('\n');

      embed.addFields({
        name: 'Previous Weeks',
        value: historyText,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
