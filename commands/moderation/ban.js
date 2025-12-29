const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog, canModerate } = require('../../utils/moderation');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for banning')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete_days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Verify bot has required permissions
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.editReply('I do not have permission to ban members. Please check my role permissions.');
      return;
    }

    const target = interaction.options.getUser('target');
    const member = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    if (!target) {
      await interaction.editReply('User not found.');
      return;
    }

    // Safety checks using centralized moderation helper
    const moderationCheck = canModerate(interaction.guild, interaction.member, member || target);
    if (!moderationCheck.canModerate) {
      await interaction.editReply(moderationCheck.reason);
      return;
    }

    // Check if member exists in guild and is bannable
    if (member && !member.bannable) {
      await interaction.editReply('I cannot ban this user. They may have higher permissions than me.');
      return;
    }

    try {
      // Try to DM the user first
      try {
        await target.send(`You have been banned from **${interaction.guild.name}**\nReason: ${reason}`);
      } catch (error) {
        // User has DMs disabled or blocked the bot
        logger.warn('Could not DM banned user', {
          command: 'ban',
          targetId: target.id,
          targetTag: target.username,
          guildId: interaction.guildId,
          error,
        });
      }

      // Ban the user
      await interaction.guild.members.ban(target, {
        deleteMessageSeconds: deleteDays * 24 * 60 * 60,
        reason,
      });

      // Log the action
      const logEntry = addLog(interaction.guildId, {
        actionType: 'ban',
        action: 'Member Banned',
        targetUserId: target.id,
        targetTag: target.username,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.username,
        reason,
        duration: null,
        deleteDays,
      });

      await interaction.editReply(`Successfully banned ${target.username}\nReason: ${reason}\nCase #${logEntry.caseId}`);
    } catch (error) {
      logger.error('Failed to ban user', {
        command: 'ban',
        targetId: target.id,
        targetTag: target.username,
        guildId: interaction.guildId,
        interactionId: interaction.id,
        moderatorId: interaction.user.id,
        error,
      });
      await interaction.editReply('Failed to ban the user. Please check my permissions.');
    }
  },
};
