const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog, canModerate, getGuildConfig } = require('../../utils/moderation');
const { logCommandError } = require('../../utils/commandLogger');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member using the server mute role')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to mute')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for mute')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Get guild config and check if mute role is set
    const config = getGuildConfig(interaction.guildId);
    if (!config.muteRole) {
      await interaction.editReply('No mute role has been set. Please use `/muterole [role]` to set one first.');
      return;
    }

    const muteRole = interaction.guild.roles.cache.get(config.muteRole);
    if (!muteRole) {
      await interaction.editReply('The configured mute role no longer exists. Please use `/muterole [role]` to set a new one.');
      return;
    }

    // Verify bot has required permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.editReply('I do not have permission to manage roles. Please check my role permissions.');
      return;
    }

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

    // Check if user already has the mute role
    if (target.roles.cache.has(muteRole.id)) {
      await interaction.editReply('This user is already muted.');
      return;
    }

    // Check if target is manageable
    if (!target.manageable) {
      await interaction.editReply('I cannot mute this user. They may have higher permissions than me.');
      return;
    }

    // Check role hierarchy
    if (muteRole.position >= interaction.guild.members.me.roles.highest.position) {
      await interaction.editReply('I cannot assign the mute role because it is higher than or equal to my highest role.');
      return;
    }

    try {
      // Try to DM the user first
      try {
        await target.send(`You have been muted in **${interaction.guild.name}**\nReason: ${reason}`);
      } catch (error) {
        // User has DMs disabled or blocked the bot
        logger.warn('Could not DM muted user', {
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          userId: interaction.user?.id,
          commandName: interaction.commandName,
          targetUserId: target.id,
          error,
        });
      }

      // Add the mute role
      await target.roles.add(muteRole, reason);

      // Log the action
      const logEntry = addLog(interaction.guildId, {
        actionType: 'mute',
        action: 'Member Muted',
        targetUserId: target.id,
        targetTag: target.user.tag,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        reason,
      });

      await interaction.editReply(`Successfully muted ${target.user.tag}\nReason: ${reason}\nCase #${logEntry.caseId}`);
    } catch (error) {
      logCommandError('Error muting user', interaction, {
        targetUserId: target.id,
        error,
      });
      await interaction.editReply('Failed to mute the user. Please check my permissions.');
    }
  },
};
