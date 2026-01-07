const { Events } = require('discord.js');
const { getGuildConfig, addLog, getVerificationMessage, clearVerificationMessage } = require('../utils/moderation');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageReactionAdd,
  once: false,

  async execute(reaction, user) {
    // Ignore bot reactions
    if (user.bot) return;

    try {
      // If reaction is partial, fetch full data
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          logger.error('Failed to fetch reaction', { error });
          return;
        }
      }

      const guild = reaction.message.guild;
      if (!guild) return;

      const config = getGuildConfig(guild.id);

      // Check if verification system is enabled
      if (!config.antiRaid?.verification?.enabled) return;

      const { roleId, channelId } = config.antiRaid.verification;

      // Check if reaction is in verification channel
      if (reaction.message.channel.id !== channelId) return;

      // Check if reaction is the verification emoji
      if (reaction.emoji.name !== '✅') return;

      // Get the member
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      // Check if member already has the verification role
      if (member.roles.cache.has(roleId)) return;

      // Get the verification role
      const verificationRole = guild.roles.cache.get(roleId);
      if (!verificationRole) {
        logger.warn('Verification role not found', {
          guildId: guild.id,
          roleId,
        });
        return;
      }

      // Check if bot has permission to manage roles
      if (!guild.members.me.permissions.has('ManageRoles')) {
        logger.warn('Cannot assign verification role: missing ManageRoles permission', {
          guildId: guild.id,
          roleId,
        });
        return;
      }

      // Check role hierarchy - bot's role must be higher than verification role
      if (verificationRole.position >= guild.members.me.roles.highest.position) {
        logger.warn('Cannot assign verification role: role hierarchy issue', {
          guildId: guild.id,
          roleId,
          verificationRolePosition: verificationRole.position,
          botRolePosition: guild.members.me.roles.highest.position,
        });
        return;
      }

      // Add the verification role
      try {
        await member.roles.add(verificationRole, 'User verified via reaction');

        logger.info('User verified', {
          guildId: guild.id,
          userId: user.id,
          userTag: user.tag,
        });

        // Log the verification
        addLog(guild.id, {
          actionType: 'verification',
          action: 'User Verified',
          targetUserId: user.id,
          targetTag: user.tag,
          moderatorId: guild.members.me.id,
          moderatorTag: guild.members.me.user.username,
          reason: 'User verified via reaction',
        });

        // Delete the verification message to keep the channel clean
        const trackedMessage = getVerificationMessage(guild.id, user.id);
        if (trackedMessage) {
          try {
            const message = await reaction.message.channel.messages.fetch(trackedMessage.messageId);
            await message.delete();
            clearVerificationMessage(guild.id, user.id);
            logger.debug('Deleted verification message', {
              guildId: guild.id,
              userId: user.id,
              messageId: trackedMessage.messageId,
            });
          } catch (error) {
            logger.warn('Failed to delete verification message', {
              guildId: guild.id,
              userId: user.id,
              messageId: trackedMessage.messageId,
              error,
            });
            // Clear tracking even if deletion failed
            clearVerificationMessage(guild.id, user.id);
          }
        }

        // Try to DM the user
        try {
          await user.send(`You have been verified in **${guild.name}**! You now have access to the server.`);
        } catch (error) {
          // User has DMs disabled
          logger.debug('Could not DM verified user', {
            guildId: guild.id,
            userId: user.id,
          });
        }
      } catch (error) {
        logger.error('Failed to add verification role', {
          guildId: guild.id,
          userId: user.id,
          roleId,
          error,
        });
      }
    } catch (error) {
      logger.error('Error in messageReactionAdd handler', { error });
    }
  },
};
