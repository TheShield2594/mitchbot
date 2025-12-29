const { request } = require('undici');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Get a random joke (probably not funny)'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const response = await request('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&safe-mode', {
        signal: AbortSignal.timeout(5000),
      });

      if (response.statusCode >= 400) {
        await interaction.editReply('Joke API failed. Ironic.');
        return;
      }

      const data = await response.body.json();

      if (data.error) {
        await interaction.editReply('No jokes found. Fitting.');
        return;
      }

      let jokeText = '';

      if (data.type === 'single') {
        jokeText = data.joke;
      } else {
        jokeText = `${data.setup}\n\n||${data.delivery}||`;
      }

      await interaction.editReply(jokeText);
    } catch (error) {
      console.error('Error fetching joke:', error);
      await interaction.editReply('The real joke is this command failing.');
    }
  },
};
