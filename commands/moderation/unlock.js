const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog } = require('../../utils/moderation');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel (allow @everyone to send messages)')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for unlocking')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Verify bot has required permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.editReply('I do not have permission to manage channels. Please check my role permissions.');
      return;
    }

    // Check if this is a guild channel that supports permission overwrites
    if (!interaction.channel.isTextBased() || interaction.channel.isDMBased()) {
      await interaction.editReply('This command can only be used in server text channels.');
      return;
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      // Unlock the channel by allowing @everyone the SendMessages permission
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null, // Reset to default (inherit from category/server)
      }, { reason });

      // Log the action
      addLog(interaction.guildId, {
        actionType: 'unlock',
        action: 'Channel Unlocked',
        channelId: interaction.channel.id,
        channelName: interaction.channel.name,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
        targetUserId: null,
        duration: null,
      });

      await interaction.editReply(`🔓 Channel unlocked.\nReason: ${reason}`);
    } catch (error) {
      logger.error('Error unlocking channel', {
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        userId: interaction.user.id,
        commandName: interaction.commandName,
        error,
      });
      await interaction.editReply('Failed to unlock the channel. Please check my permissions.');
    }
  },
};
