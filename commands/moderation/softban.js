const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog, canModerate } = require('../../utils/moderation');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and immediately unban a member to delete their messages')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to softban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for softbanning')
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
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 7;

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

    try {
      // Try to DM the user first
      try {
        await target.send(`You have been softbanned from **${interaction.guild.name}**\nReason: ${reason}\nYour messages have been deleted, but you can rejoin immediately.`);
      } catch (error) {
        logger.warn('Could not DM softbanned user', {
          command: 'softban',
          targetId: target.id,
          targetTag: target.username,
          guildId: interaction.guildId,
          error,
        });
      }

      // Ban the user
      await interaction.guild.members.ban(target, {
        deleteMessageSeconds: deleteDays * 24 * 60 * 60,
        reason: `Softban: ${reason}`,
      });

      // Immediately unban
      await interaction.guild.members.unban(target.id, `Softban unban: ${reason}`);

      // Log the action
      const logEntry = addLog(interaction.guildId, {
        actionType: 'softban',
        action: 'Member Softbanned',
        targetUserId: target.id,
        targetTag: target.username,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.username,
        reason,
        duration: null,
        deleteDays,
      });

      await interaction.editReply(`Successfully softbanned ${target.username}\nReason: ${reason}\nDeleted ${deleteDays} day(s) of messages\nCase #${logEntry.caseId}`);
    } catch (error) {
      logger.error('Failed to softban user', {
        command: 'softban',
        targetId: target.id,
        targetTag: target.username,
        guildId: interaction.guildId,
        interactionId: interaction.id,
        moderatorId: interaction.user.id,
        error,
      });
      await interaction.editReply('Failed to softban the user. Please check my permissions.');
    }
  },
};
