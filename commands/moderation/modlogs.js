const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getLogs } = require('../../utils/moderation');

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
      let value = `**Moderator:** <@${log.moderatorId}>\n`;

      if (log.targetId) {
        value += `**Target:** <@${log.targetId}>\n`;
      }

      if (log.reason) {
        value += `**Reason:** ${log.reason}\n`;
      }

      if (log.duration) {
        value += `**Duration:** ${log.duration}\n`;
      }

      if (log.amount) {
        value += `**Amount:** ${log.amount}\n`;
      }

      if (log.channelId && log.type !== 'purge') {
        value += `**Channel:** <#${log.channelId}>\n`;
      }

      embed.addFields({
        name: `${log.action} - ${date}`,
        value,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
