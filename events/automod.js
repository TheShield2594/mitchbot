const { Events } = require('discord.js');
const {
  getGuildConfig,
  isWhitelisted,
  trackUserMessage,
  getUserRecentMessages,
  addWarning,
  getWarnings,
  addLog,
} = require('../utils/moderation');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore bots and DMs
    if (message.author.bot || !message.guild) return;

    const config = getGuildConfig(message.guildId);

    // Check if automod is enabled
    if (!config.automod.enabled) return;

    // Check if user/channel is whitelisted
    if (isWhitelisted(message.guildId, message.member, message.channel.id)) {
      return;
    }

    // Track message for spam detection
    trackUserMessage(message.guildId, message.author.id, message.id, message.content);

    let violated = false;
    let violationType = '';
    let action = 'delete';

    // 1. Word Filter
    if (config.automod.wordFilter.enabled && config.automod.wordFilter.words.length > 0) {
      const content = message.content.toLowerCase();

      for (const word of config.automod.wordFilter.words) {
        const pattern = word.toLowerCase();
        if (content.includes(pattern)) {
          violated = true;
          violationType = 'Filtered Word';
          action = config.automod.wordFilter.action;
          break;
        }
      }
    }

    // 2. Invite Link Filter
    if (!violated && config.automod.inviteFilter.enabled) {
      const inviteRegex = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[\w-]+/gi;
      const invites = message.content.match(inviteRegex);

      if (invites) {
        // Check if it's the same server invite
        if (config.automod.inviteFilter.allowOwnServer) {
          try {
            const guildInvites = await message.guild.invites.fetch();
            const ownInviteCodes = guildInvites.map(inv => inv.code);

            const isOwnServer = invites.some(invite => {
              const code = invite.split('/').pop();
              return ownInviteCodes.includes(code);
            });

            if (!isOwnServer) {
              violated = true;
              violationType = 'External Server Invite';
              action = config.automod.inviteFilter.action;
            }
          } catch (error) {
            // If we can't fetch invites, block all invites
            violated = true;
            violationType = 'Server Invite';
            action = config.automod.inviteFilter.action;
          }
        } else {
          violated = true;
          violationType = 'Server Invite';
          action = config.automod.inviteFilter.action;
        }
      }
    }

    // 3. Link Filter
    if (!violated && config.automod.linkFilter.enabled) {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const urls = message.content.match(urlRegex);

      if (urls) {
        for (const url of urls) {
          try {
            const domain = new URL(url).hostname;

            // Check blacklist first
            if (config.automod.linkFilter.blacklist.length > 0) {
              const isBlacklisted = config.automod.linkFilter.blacklist.some(blocked =>
                domain.includes(blocked)
              );

              if (isBlacklisted) {
                violated = true;
                violationType = 'Blacklisted Link';
                action = config.automod.linkFilter.action;
                break;
              }
            }

            // Check whitelist if configured
            if (config.automod.linkFilter.whitelist.length > 0) {
              const isWhitelisted = config.automod.linkFilter.whitelist.some(allowed =>
                domain.includes(allowed)
              );

              if (!isWhitelisted) {
                violated = true;
                violationType = 'Non-Whitelisted Link';
                action = config.automod.linkFilter.action;
                break;
              }
            }
          } catch (error) {
            // Invalid URL, skip
            continue;
          }
        }
      }
    }

    // 4. Mention Spam
    if (!violated && config.automod.mentionSpam.enabled) {
      const mentions = message.mentions.users.size + message.mentions.roles.size;

      if (mentions > config.automod.mentionSpam.threshold) {
        violated = true;
        violationType = 'Mention Spam';
        action = config.automod.mentionSpam.action;
      }
    }

    // 5. Caps Spam
    if (!violated && config.automod.capsSpam.enabled) {
      if (message.content.length >= config.automod.capsSpam.minLength) {
        const letters = message.content.replace(/[^a-zA-Z]/g, '');
        const caps = message.content.replace(/[^A-Z]/g, '');

        if (letters.length > 0) {
          const capsPercentage = (caps.length / letters.length) * 100;

          if (capsPercentage >= config.automod.capsSpam.percentage) {
            violated = true;
            violationType = 'Caps Spam';
            action = config.automod.capsSpam.action;
          }
        }
      }
    }

    // 6. Message Spam
    if (!violated && config.automod.spam.enabled) {
      const recentMessages = getUserRecentMessages(message.guildId, message.author.id);
      const timeWindow = config.automod.spam.timeWindow;
      const threshold = config.automod.spam.messageThreshold;

      // Check for message spam (X messages in Y seconds)
      const recentInWindow = recentMessages.filter(
        msg => Date.now() - msg.timestamp <= timeWindow
      );

      if (recentInWindow.length >= threshold) {
        violated = true;
        violationType = 'Message Spam';
        action = config.automod.spam.action;
      }

      // Check for duplicate messages
      if (!violated) {
        const duplicates = recentMessages.filter(
          msg => msg.content === message.content && msg.id !== message.id
        );

        if (duplicates.length >= config.automod.spam.duplicateThreshold) {
          violated = true;
          violationType = 'Duplicate Spam';
          action = config.automod.spam.action;
        }
      }
    }

    // Handle violation
    if (violated) {
      try {
        // Delete message
        let messageDeleted = false;
        try {
          await message.delete();
          messageDeleted = true;
        } catch (deleteError) {
          logger.warn('Failed to delete message in automod', {
            guildId: message.guildId,
            channelId: message.channel.id,
            messageId: message.id,
            userId: message.author.id,
            violationType,
            error: deleteError,
          });
        }

        // Log the violation
        addLog(message.guildId, {
          actionType: 'automod',
          action: 'Automod Violation',
          violationType,
          targetUserId: message.author.id,
          targetTag: message.author.tag,
          moderatorId: message.client.user.id,
          moderatorTag: message.client.user.tag,
          reason: violationType,
          channelId: message.channel.id,
          channelName: message.channel.name,
          content: message.content.substring(0, 100),
          actionTaken: action,
          duration: null,
        });

        // Take action based on configuration
        if (action === 'warn' || action === 'timeout' || action === 'kick' || action === 'ban') {
          // Add warning
          const warningReason = `Automod: ${violationType}`;
          addWarning(message.guildId, message.author.id, warningReason, message.client.user.id);

          addLog(message.guildId, {
            actionType: 'warn',
            action: 'Automod Warning',
            targetUserId: message.author.id,
            targetTag: message.author.tag,
            moderatorId: message.client.user.id,
            moderatorTag: message.client.user.tag,
            reason: warningReason,
            duration: null,
          });

          const warnings = getWarnings(message.guildId, message.author.id);
          const warningCount = warnings.length;

          // Notify user
          try {
            await message.author.send(`⚠️ Automod violation in **${message.guild.name}**\nReason: ${violationType}\nTotal warnings: ${warningCount}`);
          } catch (error) {
            // Can't DM user
          }

          // Get threshold from config based on violation type
          let warnThreshold = 3;
          if (violationType.includes('Word') || violationType.includes('word')) {
            warnThreshold = config.automod.wordFilter.warnThreshold;
          } else if (violationType.includes('Invite')) {
            warnThreshold = config.automod.inviteFilter.warnThreshold;
          } else if (violationType.includes('Link')) {
            warnThreshold = config.automod.linkFilter.warnThreshold;
          } else if (violationType.includes('Mention')) {
            warnThreshold = config.automod.mentionSpam.warnThreshold;
          }

          // Escalate if threshold reached
          if (action === 'timeout' || (action === 'warn' && warningCount >= warnThreshold)) {
            const duration = config.automod.spam.timeoutDuration || 300000; // 5 minutes default

            // Check if member exists and is moderatable
            if (!message.member) {
              logger.error('Cannot timeout user: member not found', {
                guildId: message.guildId,
                userId: message.author.id,
                violationType,
              });
            } else if (!message.member.moderatable) {
              logger.warn('Cannot timeout user: not moderatable', {
                guildId: message.guildId,
                userId: message.author.id,
                targetRolePosition: message.member.roles.highest.position,
                violationType,
              });
            } else {
              try {
                await message.member.timeout(duration, `Automod: ${violationType} (${warningCount} warnings)`);

                addLog(message.guildId, {
                  actionType: 'timeout',
                  action: 'Automod Timeout',
                  violationType,
                  targetUserId: message.author.id,
                  targetTag: message.author.tag,
                  moderatorId: message.client.user.id,
                  moderatorTag: message.client.user.tag,
                  reason: `Automod: ${violationType} (${warningCount} warnings)`,
                  duration,
                  warningCount,
                });
              } catch (error) {
                logger.error('Failed to timeout user in automod', {
                  guildId: message.guildId,
                  userId: message.author.id,
                  violationType,
                  warningCount,
                  error,
                });
              }
            }
          } else if (action === 'kick') {
            // Check if member exists and is kickable
            if (!message.member) {
              logger.error('Cannot kick user: member not found', {
                guildId: message.guildId,
                userId: message.author.id,
                violationType,
              });
            } else if (!message.member.kickable) {
              logger.warn('Cannot kick user: not kickable', {
                guildId: message.guildId,
                userId: message.author.id,
                targetRolePosition: message.member.roles.highest.position,
                violationType,
              });
            } else {
              try {
                await message.member.kick(`Automod: ${violationType}`);

                addLog(message.guildId, {
                  actionType: 'kick',
                  action: 'Automod Kick',
                  violationType,
                  targetUserId: message.author.id,
                  targetTag: message.author.tag,
                  moderatorId: message.client.user.id,
                  moderatorTag: message.client.user.tag,
                  reason: `Automod: ${violationType}`,
                  duration: null,
                });
              } catch (error) {
                logger.error('Failed to kick user in automod', {
                  guildId: message.guildId,
                  userId: message.author.id,
                  violationType,
                  error,
                });
              }
            }
          } else if (action === 'ban') {
            // Check if member exists and is bannable
            if (!message.member) {
              // User not in guild, try to ban by user ID
              try {
                await message.guild.members.ban(message.author.id, { reason: `Automod: ${violationType}` });

                addLog(message.guildId, {
                  actionType: 'ban',
                  action: 'Automod Ban',
                  violationType,
                  targetUserId: message.author.id,
                  targetTag: message.author.tag,
                  moderatorId: message.client.user.id,
                  moderatorTag: message.client.user.tag,
                  reason: `Automod: ${violationType}`,
                  duration: null,
                });
              } catch (error) {
                logger.error('Failed to ban user in automod', {
                  guildId: message.guildId,
                  userId: message.author.id,
                  violationType,
                  error,
                });
              }
            } else if (!message.member.bannable) {
              logger.warn('Cannot ban user: not bannable', {
                guildId: message.guildId,
                userId: message.author.id,
                targetRolePosition: message.member.roles.highest.position,
                violationType,
              });
            } else {
              try {
                await message.member.ban({ reason: `Automod: ${violationType}` });

                addLog(message.guildId, {
                  actionType: 'ban',
                  action: 'Automod Ban',
                  violationType,
                  targetUserId: message.author.id,
                  targetTag: message.author.tag,
                  moderatorId: message.client.user.id,
                  moderatorTag: message.client.user.tag,
                  reason: `Automod: ${violationType}`,
                  duration: null,
                });
              } catch (error) {
                logger.error('Failed to ban user in automod', {
                  guildId: message.guildId,
                  userId: message.author.id,
                  violationType,
                  error,
                });
              }
            }
          }
        }

        // Send notification to mod log channel if configured
        if (config.logging.enabled && config.logging.channelId && config.logging.logAutomod) {
          try {
            const logChannel = await message.client.channels.fetch(config.logging.channelId);
            if (logChannel && logChannel.isTextBased()) {
              await logChannel.send({
                content: `🚨 **Automod Violation**\n**Type:** ${violationType}\n**User:** ${message.author.tag} (${message.author.id})\n**Channel:** ${message.channel.name}\n**Action:** ${action}${messageDeleted ? '' : ' (message delete failed)'}\n**Content:** \`${message.content.substring(0, 100)}\``,
              });
            } else {
              logger.warn('Mod log channel is not text-based or not found', {
                guildId: message.guildId,
                channelId: config.logging.channelId,
                channelType: logChannel?.type,
              });
            }
          } catch (error) {
            logger.error('Failed to send to mod log channel', {
              guildId: message.guildId,
              channelId: config.logging.channelId,
              error,
            });
          }
        }
      } catch (error) {
        console.error('Error handling automod violation:', error);
      }
    }
  },
};
