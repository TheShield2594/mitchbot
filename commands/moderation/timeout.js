const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog, canModerate } = require('../../utils/moderation');
const { logCommandError } = require('../../utils/commandLogger');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member (mute them temporarily)')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to timeout')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Duration in minutes (1-40320 = 28 days max)')
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Verify bot has required permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply('I do not have permission to timeout members. Please check my role permissions.');
      return;
    }

    const target = interaction.options.getMember('target');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) {
      await interaction.editReply('User not found in this server.');
      return;
    }

    // Safety checks using centralized moderation helper
    const moderationCheck = canModerate(interaction.guild, interaction.member, target);
    if (!moderationCheck.canModerate) {
      await interaction.editReply(moderationCheck.reason);
      return;
    }

    // Check if target is moderatable
    if (!target.moderatable) {
      await interaction.editReply('I cannot timeout this user. They may have higher permissions than me.');
      return;
    }

    try {
      // Calculate timeout duration in milliseconds
      const timeoutMs = duration * 60 * 1000;

      // Try to DM the user first
      try {
        await target.send(`You have been timed out in **${interaction.guild.name}** for ${duration} minutes\nReason: ${reason}`);
      } catch (error) {
        // User has DMs disabled or blocked the bot
        logger.warn('Could not DM timed out user', {
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          userId: interaction.user?.id,
          commandName: interaction.commandName,
          targetUserId: target.id,
          error,
        });
      }

      // Timeout the user
      await target.timeout(timeoutMs, reason);

      // Log the action
      const logEntry = addLog(interaction.guildId, {
        actionType: 'timeout',
        action: 'Member Timed Out',
        targetUserId: target.id,
        targetTag: target.user.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
        duration: timeoutMs,
      });

      await interaction.editReply(`Successfully timed out ${target.user.tag} for ${duration} minutes\nReason: ${reason}\nCase #${logEntry.caseId}`);
    } catch (error) {
      logCommandError('Error timing out user', interaction, {
        targetUserId: target.id,
        error,
      });
      await interaction.editReply('Failed to timeout the user. Please check my permissions.');
    }
  },
};
