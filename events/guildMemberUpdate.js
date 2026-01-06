const { Events } = require('discord.js');
const { getGuildConfig, addLog } = require('../utils/moderation');
const logger = require('../utils/logger');

// Characters that hoist users to the top of the member list
const HOIST_CHARS = /^[^a-zA-Z0-9]/;

function shouldDehoist(displayName) {
  return HOIST_CHARS.test(displayName);
}

function generateDehoistedName(originalName, prefix = 'Dehoisted') {
  // Remove leading special characters
  const cleaned = originalName.replace(/^[^a-zA-Z0-9]+/, '');

  // If nothing left after cleaning, use the prefix
  if (!cleaned) {
    return prefix;
  }

  // If the cleaned name is too short, add prefix
  if (cleaned.length < 2) {
    return `${prefix} ${cleaned}`;
  }

  return cleaned;
}

module.exports = {
  name: Events.GuildMemberUpdate,
  once: false,

  async execute(oldMember, newMember) {
    try {
      const config = getGuildConfig(newMember.guild.id);

      // Check if anti-dehoist is enabled
      if (!config.antiDehoist || !config.antiDehoist.enabled) {
        return;
      }

      // Check if nickname changed
      const oldNickname = oldMember.nickname;
      const newNickname = newMember.nickname;

      // Only process if nickname actually changed
      if (oldNickname === newNickname) {
        return;
      }

      // Get the display name (nickname or username)
      const displayName = newNickname || newMember.user.username;

      // Check if the name should be dehoisted
      if (!shouldDehoist(displayName)) {
        return;
      }

      // Check if bot has permission to manage nicknames
      if (!newMember.guild.members.me.permissions.has('ManageNicknames')) {
        logger.warn('Cannot dehoist: missing ManageNicknames permission', {
          guildId: newMember.guild.id,
          userId: newMember.id,
        });
        return;
      }

      // Check if member is manageable
      if (!newMember.manageable) {
        logger.debug('Cannot dehoist: member not manageable', {
          guildId: newMember.guild.id,
          userId: newMember.id,
          userTag: newMember.user.tag,
        });
        return;
      }

      try {
        const prefix = config.antiDehoist.prefix || 'Dehoisted';
        const dehoistedName = generateDehoistedName(displayName, prefix);

        await newMember.setNickname(dehoistedName, 'Anti-dehoist: Name contains hoisting characters');

        logger.info('Dehoisted member', {
          guildId: newMember.guild.id,
          userId: newMember.id,
          userTag: newMember.user.tag,
          oldName: displayName,
          newName: dehoistedName,
        });

        addLog(newMember.guild.id, {
          actionType: 'dehoist',
          action: 'Member Dehoisted',
          targetUserId: newMember.id,
          targetTag: newMember.user.tag,
          moderatorId: newMember.client.user.id,
          moderatorTag: newMember.client.user.username,
          reason: `Anti-dehoist: Changed "${displayName}" to "${dehoistedName}"`,
        });

        // Try to DM the user
        try {
          await newMember.user.send(
            `Your nickname in **${newMember.guild.name}** was changed to "${dehoistedName}" because it contained characters that hoist you to the top of the member list.`
          );
        } catch (error) {
          // User has DMs disabled
          logger.debug('Could not DM dehoisted user', {
            guildId: newMember.guild.id,
            userId: newMember.id,
          });
        }
      } catch (error) {
        logger.error('Failed to dehoist member', {
          guildId: newMember.guild.id,
          userId: newMember.id,
          userTag: newMember.user.tag,
          error,
        });
      }
    } catch (error) {
      logger.error('Error in guildMemberUpdate handler', {
        guildId: newMember.guild.id,
        userId: newMember.id,
        error,
      });
    }
  },
};
