const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Get roasted by Mitch')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('User to roast (optional - defaults to you)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('target') || interaction.user;

    const roasts = [
      `${target.username}, you're like a software update. Nobody wants you, but you show up anyway.`,
      `${target.username}, you have the energy of a browser with 47 tabs open.`,
      `${target.username}, you're the human equivalent of a typo in production.`,
      `${target.username}, you're like a missing semicolon. Small but causing massive problems.`,
      `${target.username}, you're the "works on my machine" of people.`,
      `${target.username}, you have the same vibe as commented-out code nobody wants to delete.`,
      `${target.username}, you're like a JavaScript error. Confusing and always unexpected.`,
      `${target.username}, you're the kind of person who writes "TODO: fix this later" and never does.`,
      `${target.username}, you're like a git merge conflict. Nobody knows how you got here.`,
      `${target.username}, you're the human version of "FIXME: this is a hack".`,
      `${target.username}, you're like a deprecated API. Still here, but nobody knows why.`,
      `${target.username}, you're the living embodiment of technical debt.`,
      `${target.username}, you have the problem-solving skills of a div inside a div inside a div.`,
      `${target.username}, you're like a CSS bug. Nobody understands you and you make no sense.`,
      `${target.username}, you're the reason we can't have nice things in production.`,
    ];

    const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];
    await interaction.reply(randomRoast);
  },
};
