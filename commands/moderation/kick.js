const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog } = require('../../utils/moderation');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for kicking')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) {
      await interaction.editReply('User not found in this server.');
      return;
    }

    // Check if target is kickable
    if (!target.kickable) {
      await interaction.editReply('I cannot kick this user. They may have higher permissions than me.');
      return;
    }

    // Check if moderator has higher role
    if (target.roles.highest.position >= interaction.member.roles.highest.position) {
      await interaction.editReply('You cannot kick this user as they have equal or higher role than you.');
      return;
    }

    try {
      // Try to DM the user first
      try {
        await target.send(`You have been kicked from **${interaction.guild.name}**\nReason: ${reason}`);
      } catch (error) {
        // User has DMs disabled or blocked the bot
        logger.warn('Could not DM kicked user', {
          command: 'kick',
          targetId: target.id,
          targetTag: target.user.username,
          guildId: interaction.guildId,
          error,
        });
      }

      // Kick the user
      await target.kick(reason);

      // Log the action
      addLog(interaction.guildId, {
        type: 'kick',
        action: 'Member Kicked',
        targetId: target.id,
        targetTag: target.user.username,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.username,
        reason,
      });

      await interaction.editReply(`Successfully kicked ${target.user.username}\nReason: ${reason}`);
    } catch (error) {
      logger.error('Failed to kick user', {
        command: 'kick',
        targetId: target.id,
        targetTag: target.user.username,
        guildId: interaction.guildId,
        interactionId: interaction.id,
        moderatorId: interaction.user.id,
        error,
      });
      await interaction.editReply('Failed to kick the user. Please check my permissions.');
    }
  },
};
