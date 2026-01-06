const { Events, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, addLog, trackMemberJoin, getRecentJoins } = require('../utils/moderation');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,

  async execute(member) {
    try {
      const config = getGuildConfig(member.guild.id);

      // Initialize antiRaid config if it doesn't exist
      if (!config.antiRaid) {
        config.antiRaid = {
          accountAge: { enabled: false },
          joinSpam: { enabled: false },
          lockdown: { active: false },
          verification: { enabled: false },
        };
      }

      // Track member join for spam detection
      trackMemberJoin(member.guild.id, member.id);

      // Check if server is in lockdown mode
      if (config.antiRaid.lockdown && config.antiRaid.lockdown.active) {
        try {
          await member.kick('Server is in lockdown mode');
          logger.info('Kicked user due to lockdown mode', {
            guildId: member.guild.id,
            userId: member.id,
            userTag: member.user.tag,
          });

          addLog(member.guild.id, {
            actionType: 'kick',
            action: 'Auto-Kick (Lockdown)',
            targetUserId: member.id,
            targetTag: member.user.tag,
            moderatorId: member.client.user.id,
            moderatorTag: member.client.user.username,
            reason: 'Server is in lockdown mode',
          });
        } catch (error) {
          logger.error('Failed to kick user during lockdown', {
            guildId: member.guild.id,
            userId: member.id,
            error,
          });
        }
        return;
      }

      // Account age filter
      if (config.antiRaid.accountAge && config.antiRaid.accountAge.enabled) {
        const accountAge = Date.now() - member.user.createdTimestamp;
        const minAge = (config.antiRaid.accountAge.minAgeDays || 7) * 24 * 60 * 60 * 1000;

        if (accountAge < minAge) {
          const action = config.antiRaid.accountAge.action || 'kick';
          const ageDays = Math.floor(accountAge / (24 * 60 * 60 * 1000));

          try {
            if (action === 'ban') {
              await member.ban({ reason: `Account too new (${ageDays} days old, minimum ${config.antiRaid.accountAge.minAgeDays} days)` });
              logger.info('Banned user for account age', {
                guildId: member.guild.id,
                userId: member.id,
                userTag: member.user.tag,
                accountAgeDays: ageDays,
              });

              addLog(member.guild.id, {
                actionType: 'ban',
                action: 'Auto-Ban (Account Age)',
                targetUserId: member.id,
                targetTag: member.user.tag,
                moderatorId: member.client.user.id,
                moderatorTag: member.client.user.username,
                reason: `Account too new (${ageDays} days old, minimum ${config.antiRaid.accountAge.minAgeDays} days)`,
              });
            } else {
              await member.kick(`Account too new (${ageDays} days old, minimum ${config.antiRaid.accountAge.minAgeDays} days)`);
              logger.info('Kicked user for account age', {
                guildId: member.guild.id,
                userId: member.id,
                userTag: member.user.tag,
                accountAgeDays: ageDays,
              });

              addLog(member.guild.id, {
                actionType: 'kick',
                action: 'Auto-Kick (Account Age)',
                targetUserId: member.id,
                targetTag: member.user.tag,
                moderatorId: member.client.user.id,
                moderatorTag: member.client.user.username,
                reason: `Account too new (${ageDays} days old, minimum ${config.antiRaid.accountAge.minAgeDays} days)`,
              });
            }
          } catch (error) {
            logger.error('Failed to enforce account age filter', {
              guildId: member.guild.id,
              userId: member.id,
              error,
            });
          }
          return;
        }
      }

      // Join spam detection
      if (config.antiRaid.joinSpam && config.antiRaid.joinSpam.enabled) {
        const threshold = config.antiRaid.joinSpam.threshold || 5;
        const timeWindow = config.antiRaid.joinSpam.timeWindow || 10000;
        const recentJoins = getRecentJoins(member.guild.id, timeWindow);

        if (recentJoins.length >= threshold) {
          const action = config.antiRaid.joinSpam.action || 'kick';

          try {
            if (action === 'ban') {
              await member.ban({ reason: `Join spam detected (${recentJoins.length} joins in ${timeWindow / 1000}s)` });
              logger.warn('Banned user for join spam', {
                guildId: member.guild.id,
                userId: member.id,
                userTag: member.user.tag,
                joinCount: recentJoins.length,
              });

              addLog(member.guild.id, {
                actionType: 'ban',
                action: 'Auto-Ban (Join Spam)',
                targetUserId: member.id,
                targetTag: member.user.tag,
                moderatorId: member.client.user.id,
                moderatorTag: member.client.user.username,
                reason: `Join spam detected (${recentJoins.length} joins in ${timeWindow / 1000}s)`,
              });
            } else {
              await member.kick(`Join spam detected (${recentJoins.length} joins in ${timeWindow / 1000}s)`);
              logger.warn('Kicked user for join spam', {
                guildId: member.guild.id,
                userId: member.id,
                userTag: member.user.tag,
                joinCount: recentJoins.length,
              });

              addLog(member.guild.id, {
                actionType: 'kick',
                action: 'Auto-Kick (Join Spam)',
                targetUserId: member.id,
                targetTag: member.user.tag,
                moderatorId: member.client.user.id,
                moderatorTag: member.client.user.username,
                reason: `Join spam detected (${recentJoins.length} joins in ${timeWindow / 1000}s)`,
              });
            }
          } catch (error) {
            logger.error('Failed to enforce join spam filter', {
              guildId: member.guild.id,
              userId: member.id,
              error,
            });
          }
          return;
        }
      }

      // Verification system
      if (config.antiRaid.verification && config.antiRaid.verification.enabled) {
        const verifyChannel = member.guild.channels.cache.get(config.antiRaid.verification.channelId);
        const verifyRole = member.guild.roles.cache.get(config.antiRaid.verification.roleId);

        if (verifyChannel && verifyRole) {
          try {
            // Send verification message
            const verifyMessage = config.antiRaid.verification.message || 'Welcome! Please verify by reacting to this message.';
            const message = await verifyChannel.send(`${member} ${verifyMessage}`);

            // Add reaction for user to click
            await message.react('✅');

            logger.info('Sent verification message', {
              guildId: member.guild.id,
              userId: member.id,
              userTag: member.user.tag,
            });
          } catch (error) {
            logger.error('Failed to send verification message', {
              guildId: member.guild.id,
              userId: member.id,
              error,
            });
          }
        }
      }

      // Anti-dehoist for new members
      if (config.antiDehoist && config.antiDehoist.enabled) {
        const displayName = member.user.username;
        const hoistRegex = /^[^a-zA-Z0-9]/;

        if (hoistRegex.test(displayName)) {
          // Check if bot can manage nicknames
          if (member.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames) && member.manageable) {
            try {
              const prefix = config.antiDehoist.prefix || 'Dehoisted';
              const cleaned = displayName.replace(/^[^a-zA-Z0-9]+/, '');
              const dehoistedName = cleaned.length >= 2 ? cleaned : `${prefix} ${cleaned || ''}`.trim() || prefix;

              await member.setNickname(dehoistedName, 'Anti-dehoist: Username contains hoisting characters');

              logger.info('Dehoisted new member', {
                guildId: member.guild.id,
                userId: member.id,
                userTag: member.user.tag,
                oldName: displayName,
                newName: dehoistedName,
              });

              addLog(member.guild.id, {
                actionType: 'dehoist',
                action: 'New Member Dehoisted',
                targetUserId: member.id,
                targetTag: member.user.tag,
                moderatorId: member.client.user.id,
                moderatorTag: member.client.user.username,
                reason: `Anti-dehoist: Changed "${displayName}" to "${dehoistedName}"`,
              });
            } catch (error) {
              logger.error('Failed to dehoist new member', {
                guildId: member.guild.id,
                userId: member.id,
                error,
              });
            }
          }
        }
      }

      // Welcome message (existing functionality)
      if (config.welcome && config.welcome.enabled && config.welcome.channelId) {
        const channel = member.guild.channels.cache.get(config.welcome.channelId);
        if (channel && channel.permissionsFor(member.guild.members.me).has('SendMessages')) {
          const message = config.welcome.message
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{username}/g, member.user.username)
            .replace(/{server}/g, member.guild.name)
            .replace(/{memberCount}/g, member.guild.memberCount.toString());

          await channel.send(message);
        }
      }
    } catch (error) {
      logger.error('Error in guildMemberAdd handler', {
        guildId: member.guild.id,
        userId: member.id,
        error,
      });
    }
  },
};
