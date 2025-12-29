const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog, removeTempban } = require('../../utils/moderation');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(option =>
      option
        .setName('user_id')
        .setDescription('The ID of the user to unban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for unbanning')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Validate user ID format
    if (!/^\d{17,19}$/.test(userId)) {
      await interaction.editReply('Invalid user ID format. Please provide a valid Discord user ID.');
      return;
    }

    try {
      // Check if user is actually banned
      const bans = await interaction.guild.bans.fetch();
      const bannedUser = bans.get(userId);

      if (!bannedUser) {
        await interaction.editReply('This user is not banned.');
        return;
      }

      // Unban the user
      await interaction.guild.members.unban(userId, reason);

      // Remove from tempban tracking if exists
      removeTempban(interaction.guildId, userId);

      // Log the action
      const logEntry = addLog(interaction.guildId, {
        actionType: 'unban',
        action: 'Member Unbanned',
        targetUserId: userId,
        targetTag: bannedUser.user?.username || 'Unknown User',
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.username,
        reason,
        duration: null,
      });

      await interaction.editReply(`Successfully unbanned user (ID: ${userId})\nReason: ${reason}\nCase #${logEntry.caseId}`);
    } catch (error) {
      logger.error('Failed to unban user', {
        command: 'unban',
        targetId: userId,
        guildId: interaction.guildId,
        interactionId: interaction.id,
        moderatorId: interaction.user.id,
        error,
      });
      await interaction.editReply('Failed to unban the user. Please check my permissions and ensure the user ID is correct.');
    }
  },
};
