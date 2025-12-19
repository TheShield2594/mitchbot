const { Events } = require('discord.js');
const fetch = require('node-fetch');

const userCooldown = new Map();
const replyTracker = new Map();

const COOLDOWN_MS = 30_000;
const MAX_PROMPT_LENGTH = 500;

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const client = message.client;

    // Ignore bots
    if (message.author.bot) return;

    // Ignore DMs
    if (!message.guild) return;

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
          setTimeout(() => replyTracker.delete(message.author.id), 10 * 60 * 1000);
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

      const data = await response.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!reply) {
        await message.reply('No.');
        return;
      }

      await message.reply(reply.slice(0, 1900));
    } catch (err) {
      console.error(err);
      await message.reply('That failed.');
    }
  },
};
