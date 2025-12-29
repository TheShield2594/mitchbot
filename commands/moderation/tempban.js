const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog, addTempban, canModerate } = require('../../utils/moderation');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily ban a member from the server')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to ban')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Duration in minutes')
        .setMinValue(1)
        .setMaxValue(43200) // 30 days max
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

    const target = interaction.options.getUser('target');
    const member = interaction.options.getMember('target');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    if (!target) {
      await interaction.editReply('User not found.');
      return;
    }

    // Safety checks
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

    const expiresAt = Date.now() + (duration * 60 * 1000);
    const expiryDate = new Date(expiresAt);

    try {
      // Try to DM the user first
      try {
        await target.send(`You have been temporarily banned from **${interaction.guild.name}** for ${duration} minutes\nReason: ${reason}\nBan expires: ${expiryDate.toUTCString()}`);
      } catch (error) {
        logger.warn('Could not DM tempbanned user', {
          command: 'tempban',
          targetId: target.id,
          targetTag: target.username,
          guildId: interaction.guildId,
          error,
        });
      }

      // Ban the user
      await interaction.guild.members.ban(target, {
        deleteMessageSeconds: deleteDays * 24 * 60 * 60,
        reason: `${reason} (Temporary ban for ${duration} minutes)`,
      });

      // Log the action
      const logEntry = addLog(interaction.guildId, {
        actionType: 'tempban',
        action: 'Member Temporarily Banned',
        targetUserId: target.id,
        targetTag: target.username,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.username,
        reason,
        duration: duration * 60 * 1000,
        expiresAt,
        deleteDays,
      });

      // Add to tempban tracking
      addTempban(interaction.guildId, target.id, expiresAt, logEntry.caseId);

      await interaction.editReply(`Successfully temporarily banned ${target.username} for ${duration} minutes\nReason: ${reason}\nExpires: ${expiryDate.toUTCString()}\nCase #${logEntry.caseId}`);
    } catch (error) {
      logger.error('Failed to tempban user', {
        command: 'tempban',
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
