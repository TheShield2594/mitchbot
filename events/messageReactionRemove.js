const { Events } = require('discord.js');
const { isEnabled, getRoleForEmoji } = require('../utils/reactionRoles');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageReactionRemove,
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

      // Handle reaction roles
      if (!isEnabled(guild.id)) return;

      const emojiIdentifier = reaction.emoji.id || reaction.emoji.name;
      const roleId = getRoleForEmoji(guild.id, reaction.message.id, emojiIdentifier);

      if (!roleId) return;

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;

      // Check if member has the role
      if (!member.roles.cache.has(roleId)) return;

      // Get the role
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        logger.warn('Reaction role not found', {
          guildId: guild.id,
          roleId,
          messageId: reaction.message.id,
          emoji: emojiIdentifier,
        });
        return;
      }

      // Check if bot has permission to manage roles
      if (!guild.members.me.permissions.has('ManageRoles')) {
        logger.warn('Cannot remove reaction role: missing ManageRoles permission', {
          guildId: guild.id,
          roleId,
        });
        return;
      }

      // Check role hierarchy
      if (role.position >= guild.members.me.roles.highest.position) {
        logger.warn('Cannot remove reaction role: role hierarchy issue', {
          guildId: guild.id,
          roleId,
          rolePosition: role.position,
          botRolePosition: guild.members.me.roles.highest.position,
        });
        return;
      }

      // Remove the role
      try {
        await member.roles.remove(role, 'Reaction role removal');

        logger.info('Removed reaction role', {
          guildId: guild.id,
          userId: user.id,
          userTag: user.tag,
          roleId,
          roleName: role.name,
        });
      } catch (error) {
        logger.error('Failed to remove reaction role', {
          guildId: guild.id,
          userId: user.id,
          roleId,
          error,
        });
      }
    } catch (error) {
      logger.error('Error in messageReactionRemove handler', { error });
    }
  },
};
