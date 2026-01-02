const { request } = require('undici');
const { SlashCommandBuilder } = require('discord.js');
const { recordTriviaWin, recordTriviaAttempt, getWinMessage, getTimeoutMessage, POINTS_MULTIPLIER } = require('../../utils/trivia');
const { logCommandError } = require('../../utils/commandLogger');

// Decode HTML entities helper - handles numeric and named entities
function decodeHtml(html) {
  if (typeof html !== 'string') return html;

  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Answer trivia - first correct wins')
    .addStringOption(option =>
      option
        .setName('difficulty')
        .setDescription('Difficulty level')
        .setRequired(false)
        .addChoices(
          { name: 'Easy', value: 'easy' },
          { name: 'Medium', value: 'medium' },
          { name: 'Hard', value: 'hard' },
        )
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Trivia is only available in servers.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const difficulty = interaction.options.getString('difficulty') || 'medium';

    try {
      const response = await request(`https://opentdb.com/api.php?amount=1&difficulty=${difficulty}&type=multiple`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.statusCode >= 400) {
        await interaction.editReply('Trivia database is broken. Typical.');
        return;
      }

      const data = await response.body.json();

      if (!data.results || data.results.length === 0) {
        await interaction.editReply('No questions. Guess you got lucky.');
        return;
      }

      const question = data.results[0];
      const questionText = decodeHtml(question.question);
      const correctAnswer = decodeHtml(question.correct_answer);
      const incorrectAnswers = question.incorrect_answers.map(a => decodeHtml(a));

      // Shuffle answers
      const allAnswers = [correctAnswer, ...incorrectAnswers].sort(() => Math.random() - 0.5);

      const answerList = allAnswers.map((answer, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, D
        return `**${letter}.** ${answer}`;
      }).join('\n');

      const correctLetter = String.fromCharCode(65 + allAnswers.indexOf(correctAnswer));
      const pointsValue = 10 * (POINTS_MULTIPLIER[difficulty] || 1);

      await interaction.editReply(
        `**Category:** ${decodeHtml(question.category)}\n` +
        `**Difficulty:** ${question.difficulty} (${pointsValue} points)\n\n` +
        `**${questionText}**\n\n` +
        `${answerList}\n\n` +
        `Type your answer (A, B, C, or D). You have 15 seconds.`
      );

      // Check if channel is available for message collection
      if (!interaction.channel) {
        await interaction.followUp({
          content: 'Cannot collect answers in this channel context.',
          ephemeral: true,
        });
        return;
      }

      // Create message collector
      const filter = (msg) => {
        const content = msg.content.trim().toUpperCase();
        return ['A', 'B', 'C', 'D'].includes(content);
      };

      const collector = interaction.channel.createMessageCollector({
        filter,
        time: 15000, // 15 seconds
        max: 1, // Stop after first valid answer
      });

      collector.on('collect', async (msg) => {
        const userAnswer = msg.content.trim().toUpperCase();

        if (userAnswer === correctLetter) {
          // Record win
          const result = recordTriviaWin(
            interaction.guildId,
            msg.author.id,
            msg.author.username,
            difficulty
          );

          const winMsg = getWinMessage(result.pointsEarned, difficulty);

          await interaction.followUp(
            `${msg.author} ${winMsg}\n` +
            `+${result.pointsEarned} points (Total: ${result.totalPoints})`
          );
        } else {
          // Record attempt (wrong answer)
          recordTriviaAttempt(interaction.guildId, msg.author.id, msg.author.username);

          await interaction.followUp(
            `${msg.author} Wrong.\n` +
            `The correct answer was **${correctLetter}**: ${correctAnswer}`
          );
        }
      });

      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          // Nobody answered
          const timeoutMsg = getTimeoutMessage();
          await interaction.followUp(
            `${timeoutMsg}\n` +
            `The answer was **${correctLetter}**: ${correctAnswer}`
          );
        }
      });
    } catch (error) {
      logCommandError('Error fetching trivia', interaction, { error });
      await interaction.editReply('Trivia broke. Shocking.');
    }
  },
};
