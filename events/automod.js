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
        await message.delete().catch(() => {});

        // Log the violation
        addLog(message.guildId, {
          type: 'automod',
          action: 'Automod Violation',
          violationType,
          targetId: message.author.id,
          targetTag: message.author.tag,
          channelId: message.channel.id,
          channelName: message.channel.name,
          content: message.content.substring(0, 100),
          actionTaken: action,
        });

        // Take action based on configuration
        if (action === 'warn' || action === 'timeout' || action === 'kick' || action === 'ban') {
          // Add warning
          addWarning(message.guildId, message.author.id, `Automod: ${violationType}`, message.client.user.id);

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

            try {
              await message.member.timeout(duration, `Automod: ${violationType} (${warningCount} warnings)`);

              addLog(message.guildId, {
                type: 'automod_timeout',
                action: 'Automod Timeout',
                violationType,
                targetId: message.author.id,
                targetTag: message.author.tag,
                duration: `${duration / 1000 / 60} minutes`,
                warningCount,
              });
            } catch (error) {
              console.error('Failed to timeout user:', error);
            }
          } else if (action === 'kick') {
            try {
              await message.member.kick(`Automod: ${violationType}`);

              addLog(message.guildId, {
                type: 'automod_kick',
                action: 'Automod Kick',
                violationType,
                targetId: message.author.id,
                targetTag: message.author.tag,
              });
            } catch (error) {
              console.error('Failed to kick user:', error);
            }
          } else if (action === 'ban') {
            try {
              await message.member.ban({ reason: `Automod: ${violationType}` });

              addLog(message.guildId, {
                type: 'automod_ban',
                action: 'Automod Ban',
                violationType,
                targetId: message.author.id,
                targetTag: message.author.tag,
              });
            } catch (error) {
              console.error('Failed to ban user:', error);
            }
          }
        }

        // Send notification to mod log channel if configured
        if (config.logging.enabled && config.logging.channelId && config.logging.logAutomod) {
          try {
            const logChannel = await message.client.channels.fetch(config.logging.channelId);
            if (logChannel) {
              await logChannel.send({
                content: `🚨 **Automod Violation**\n**Type:** ${violationType}\n**User:** ${message.author.tag} (${message.author.id})\n**Channel:** ${message.channel.name}\n**Action:** ${action}\n**Content:** \`${message.content.substring(0, 100)}\``,
              });
            }
          } catch (error) {
            console.error('Failed to send to mod log channel:', error);
          }
        }
      } catch (error) {
        console.error('Error handling automod violation:', error);
      }
    }
  },
};
