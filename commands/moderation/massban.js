const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addLog } = require('../../utils/moderation');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('massban')
    .setDescription('Ban multiple users at once')
    .addStringOption(option =>
      option
        .setName('user_ids')
        .setDescription('Space-separated list of user IDs to ban')
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

    const userIdsString = interaction.options.getString('user_ids');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    // Parse user IDs
    const userIds = userIdsString.trim().split(/\s+/);

    // Validate user IDs
    const validUserIds = [];
    const invalidUserIds = [];

    for (const userId of userIds) {
      if (/^\d{17,19}$/.test(userId)) {
        // Check it's not the bot, moderator, or server owner
        if (userId === interaction.guild.members.me.id) {
          invalidUserIds.push(`${userId} (bot)`);
        } else if (userId === interaction.user.id) {
          invalidUserIds.push(`${userId} (yourself)`);
        } else if (userId === interaction.guild.ownerId) {
          invalidUserIds.push(`${userId} (server owner)`);
        } else {
          validUserIds.push(userId);
        }
      } else {
        invalidUserIds.push(`${userId} (invalid format)`);
      }
    }

    if (validUserIds.length === 0) {
      await interaction.editReply(`No valid user IDs to ban.\nInvalid IDs: ${invalidUserIds.join(', ')}`);
      return;
    }

    // Limit to 10 users per massban for safety
    if (validUserIds.length > 10) {
      await interaction.editReply('You can only massban up to 10 users at once. Please reduce the number of users.');
      return;
    }

    const results = {
      success: [],
      failed: [],
      alreadyBanned: [],
    };

    // Ban each user
    for (const userId of validUserIds) {
      try {
        // Check if already banned
        const bans = await interaction.guild.bans.fetch();
        if (bans.has(userId)) {
          results.alreadyBanned.push(userId);
          continue;
        }

        // Try to get user object to send DM
        let targetUser = null;
        try {
          targetUser = await interaction.client.users.fetch(userId);

          // Try to DM the user
          try {
            await targetUser.send(`You have been banned from **${interaction.guild.name}**\nReason: ${reason}`);
          } catch (error) {
            // User has DMs disabled or blocked the bot
          }
        } catch (error) {
          // User might not exist or bot can't fetch them
        }

        // Ban the user
        await interaction.guild.members.ban(userId, {
          deleteMessageSeconds: deleteDays * 24 * 60 * 60,
          reason: `Mass ban: ${reason}`,
        });

        // Log the action
        const logEntry = addLog(interaction.guildId, {
          actionType: 'ban',
          action: 'Member Banned (Mass Ban)',
          targetUserId: userId,
          targetTag: targetUser?.username || 'Unknown User',
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.username,
          reason: `Mass ban: ${reason}`,
          duration: null,
          deleteDays,
        });

        results.success.push(`${userId} (Case #${logEntry.caseId})`);
      } catch (error) {
        logger.error('Failed to ban user in massban', {
          command: 'massban',
          targetId: userId,
          guildId: interaction.guildId,
          interactionId: interaction.id,
          moderatorId: interaction.user.id,
          error,
        });
        results.failed.push(userId);
      }
    }

    // Build response
    let response = '**Mass Ban Results**\n\n';

    if (results.success.length > 0) {
      response += `✅ Successfully banned (${results.success.length}):\n${results.success.join('\n')}\n\n`;
    }

    if (results.alreadyBanned.length > 0) {
      response += `⚠️ Already banned (${results.alreadyBanned.length}):\n${results.alreadyBanned.join(', ')}\n\n`;
    }

    if (results.failed.length > 0) {
      response += `❌ Failed to ban (${results.failed.length}):\n${results.failed.join(', ')}\n\n`;
    }

    if (invalidUserIds.length > 0) {
      response += `🚫 Invalid IDs (${invalidUserIds.length}):\n${invalidUserIds.join(', ')}`;
    }

    response += `\n**Reason:** ${reason}`;

    await interaction.editReply(response);
  },
};
