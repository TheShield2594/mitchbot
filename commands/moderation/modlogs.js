const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getLogs } = require('../../utils/moderation');
const { formatDuration } = require('../../utils/formatting');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('View recent moderation logs')
    .addIntegerOption(option =>
      option
        .setName('limit')
        .setDescription('Number of logs to display (1-25)')
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const limit = interaction.options.getInteger('limit') || 10;
    const logs = getLogs(interaction.guildId, limit);

    if (logs.length === 0) {
      await interaction.editReply('No moderation logs found.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle('📋 Moderation Logs')
      .setDescription(`Showing last ${logs.length} log(s)`)
      .setTimestamp();

    for (const log of logs) {
      const date = new Date(log.timestamp).toLocaleString();
      let value = `**Moderator:** ${log.moderatorId ? `<@${log.moderatorId}>` : 'Unknown'}\n`;

      if (log.targetUserId) {
        value += `**Target:** <@${log.targetUserId}>\n`;
      }

      if (log.reason) {
        value += `**Reason:** ${log.reason}\n`;
      }

      const duration = formatDuration(log.duration);
      if (duration) {
        value += `**Duration:** ${duration}\n`;
      }

      if (log.amount) {
        value += `**Amount:** ${log.amount}\n`;
      }

      if (log.channelId && log.actionType !== 'purge') {
        value += `**Channel:** <#${log.channelId}>\n`;
      }

      embed.addFields({
        name: `${log.action || log.actionType} - ${date}`,
        value,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
