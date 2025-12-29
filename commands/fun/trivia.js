const { request } = require('undici');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Get a random trivia question')
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

      // Decode HTML entities
      const decodeHtml = (html) => {
        return html
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
      };

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

      await interaction.editReply(
        `**Category:** ${decodeHtml(question.category)}\n` +
        `**Difficulty:** ${question.difficulty}\n\n` +
        `**${questionText}**\n\n` +
        `${answerList}\n\n` +
        `||Answer: **${correctLetter}** - ${correctAnswer}||`
      );
    } catch (error) {
      console.error('Error fetching trivia:', error);
      await interaction.editReply('Trivia broke. Shocking.');
    }
  },
};
