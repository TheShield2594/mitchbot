const { Events } = require('discord.js');
const { fetch } = require('undici');
const logger = require('../utils/logger');
const { awardMessageXP, getRolesForLevel } = require('../utils/xp');

const userCooldown = new Map();
const replyTracker = new Map();

const COOLDOWN_MS = 30_000;
const FOLLOW_UP_WINDOW_MS = 10 * 60 * 1000;
const MAX_PROMPT_LENGTH = 500;

function getMessageContext(message) {
  return {
    guildId: message.guildId,
    channelId: message.channel?.id,
    userId: message.author?.id,
  };
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!process.env.GEMINI_API_KEY) {
      logger.warn('messageCreate: Missing GEMINI_API_KEY; cannot call Gemini.', getMessageContext(message));
      return;
    }

    const client = message.client;

    // Ignore bots
    if (message.author.bot) return;

    // Ignore DMs
    if (!message.guild) return;

    // Award XP for messages (before AI response logic)
    try {
      const member = message.member;
      const userRoles = member ? Array.from(member.roles.cache.keys()) : [];

      const xpResult = awardMessageXP(
        message.guildId,
        message.author.id,
        message.author.username,
        message.channelId,
        userRoles
      );

      // Handle level-up
      if (xpResult && xpResult.leveledUp) {
        const rolesForLevel = getRolesForLevel(message.guildId, xpResult.newLevel);

        // Award level roles
        if (rolesForLevel.length > 0 && member) {
          for (const roleId of rolesForLevel) {
            try {
              const role = message.guild.roles.cache.get(roleId);
              if (role && !member.roles.cache.has(roleId)) {
                await member.roles.add(role);
              }
            } catch (err) {
              logger.error('messageCreate: Failed to award level role', {
                ...getMessageContext(message),
                roleId,
                error: err,
              });
            }
          }
        }

        // Send level-up message
        const { getGuildConfig } = require('../utils/xp');
        const config = getGuildConfig(message.guildId);

        if (config.announceLevelUp) {
          const levelUpMessage = config.levelUpMessage
            .replace('{user}', `<@${message.author.id}>`)
            .replace('{level}', xpResult.newLevel)
            .replace('{xp}', xpResult.totalXp);

          const channelToUse = config.levelUpChannel
            ? message.guild.channels.cache.get(config.levelUpChannel)
            : message.channel;

          if (channelToUse) {
            try {
              await channelToUse.send(levelUpMessage);
            } catch (err) {
              logger.error('messageCreate: Failed to send level-up message', {
                ...getMessageContext(message),
                error: err,
              });
            }
          }
        }
      }
    } catch (err) {
      logger.error('messageCreate: XP award failed', {
        ...getMessageContext(message),
        error: err,
      });
    }

    let shouldRespond = false;
    let prompt = '';

    // Case 1: Direct mention
    if (message.mentions.has(client.user)) {
      prompt = message.content
        .replace(`<@${client.user.id}>`, '')
        .replace(`<@!${client.user.id}>`, '')
        .trim();
      shouldRespond = true;
    }

    // Case 2: Replying to Mitch (one follow-up max)
    if (message.reference && !shouldRespond) {
      try {
        const repliedMessage = await message.channel.messages.fetch(
          message.reference.messageId
        );

        if (
          repliedMessage.author.id === client.user.id &&
          !replyTracker.has(message.author.id)
        ) {
          prompt = message.content.trim();
          shouldRespond = true;
          replyTracker.set(message.author.id, true);
          setTimeout(
            () => replyTracker.delete(message.author.id),
            FOLLOW_UP_WINDOW_MS
          );
        }
      } catch {
        return;
      }
    }

    if (!shouldRespond) return;
    if (!prompt || prompt.length === 0) return;
    if (prompt.length > MAX_PROMPT_LENGTH) {
      await message.reply('Too much.');
      return;
    }

    // Rate limit
    const lastUsed = userCooldown.get(message.author.id);
    if (lastUsed && Date.now() - lastUsed < COOLDOWN_MS) {
      return;
    }
    userCooldown.set(message.author.id, Date.now());
    setTimeout(() => userCooldown.delete(message.author.id), COOLDOWN_MS);

    // Gemini API call
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `
You are Mitch.
You are concise.
Dry.
Slightly dismissive.
No emojis.
No apologies.
No mention of being an AI.
If the question is bad, say so briefly.

User: ${prompt}
                    `.trim(),
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        logger.error('messageCreate: Gemini request failed', {
          ...getMessageContext(message),
          status: response.status,
          statusText: response.statusText,
        });
        await message.reply('That failed.');
        return;
      }

      const data = await response.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!reply) {
        await message.reply('No.');
        return;
      }

      await message.reply(reply.slice(0, 1900));
    } catch (err) {
      logger.error('messageCreate: Gemini request failed', {
        ...getMessageContext(message),
        error: err,
      });
      await message.reply('That failed.');
    }
  },
};
