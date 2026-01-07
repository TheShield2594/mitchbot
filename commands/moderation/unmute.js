const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog, canModerate, getGuildConfig } = require('../../utils/moderation');
const { logCommandError } = require('../../utils/commandLogger');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member (removes mute role and/or timeout)')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to unmute')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for unmute')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember('target');
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

    // Get guild config to check for mute role
    const config = getGuildConfig(interaction.guildId);
    const muteRole = config.muteRole ? interaction.guild.roles.cache.get(config.muteRole) : null;

    let hasMuteRole = false;
    let hasTimeout = false;
    let actions = [];

    // Check if user has mute role
    if (muteRole && target.roles.cache.has(muteRole.id)) {
      hasMuteRole = true;
    }

    // Check if user has an active timeout
    if (target.communicationDisabledUntil && target.communicationDisabledUntil.getTime() > Date.now()) {
      hasTimeout = true;
    }

    // If user is not muted in any way
    if (!hasMuteRole && !hasTimeout) {
      await interaction.editReply('This user is not muted or timed out.');
      return;
    }

    try {
      // Remove timeout if present
      if (hasTimeout) {
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          await interaction.editReply('I do not have permission to remove timeouts. Please check my role permissions.');
          return;
        }

        await target.timeout(null, reason);
        actions.push('removed timeout');
      }

      // Remove mute role if present
      if (hasMuteRole) {
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
          await interaction.editReply('I do not have permission to manage roles. Please check my role permissions.');
          return;
        }

        if (!target.manageable) {
          await interaction.editReply('I cannot remove the mute role from this user. They may have higher permissions than me.');
          return;
        }

        await target.roles.remove(muteRole, reason);
        actions.push('removed mute role');
      }

      // Try to DM the user
      try {
        await target.send(`You have been unmuted in **${interaction.guild.name}**\nReason: ${reason}`);
      } catch (error) {
        // User has DMs disabled or blocked the bot
        logger.warn('Could not DM unmuted user', {
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          userId: interaction.user?.id,
          commandName: interaction.commandName,
          targetUserId: target.id,
          error,
        });
      }

      // Log the action
      const logEntry = addLog(interaction.guildId, {
        actionType: 'unmute',
        action: 'Member Unmuted',
        targetUserId: target.id,
        targetTag: target.user.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
      });

      const actionText = actions.join(' and ');
      await interaction.editReply(`Successfully unmuted ${target.user.tag} (${actionText})\nReason: ${reason}\nCase #${logEntry.caseId}`);
    } catch (error) {
      logCommandError('Error unmuting user', interaction, {
        targetUserId: target.id,
        error,
      });
      await interaction.editReply('Failed to unmute the user. Please check my permissions.');
    }
  },
};
