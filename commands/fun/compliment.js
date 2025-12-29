const { SlashCommandBuilder } = require('discord.js');
const { getRandomSnark } = require('../../utils/snark');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Get a backhanded compliment from Mitch')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('User to compliment (optional - defaults to you)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('target') || interaction.user;

    const defaultCompliments = [
      `${target.username}, you're doing great. For you.`,
      `${target.username}, you're smarter than you look.`,
      `${target.username}, you're not as bad as people say.`,
      `${target.username}, you tried. That's something.`,
      `${target.username}, you're almost adequate.`,
      `${target.username}, you're improving. Slowly.`,
      `${target.username}, you're better than nothing. Barely.`,
      `${target.username}, you're doing your best. Unfortunately.`,
      `${target.username}, you have potential. Wasted, but potential.`,
      `${target.username}, you're special. In a way.`,
      `${target.username}, you're unique. That's not always good.`,
      `${target.username}, you're memorable. Not sure why.`,
      `${target.username}, you stand out. Not in a good way.`,
      `${target.username}, you're one of a kind. Thank god.`,
      `${target.username}, you're doing better than expected. The bar was low.`,
    ];

    // Get compliment (includes custom server compliments if configured)
    const template = interaction.guildId
      ? getRandomSnark(interaction.guildId, 'compliments', defaultCompliments)
      : defaultCompliments[Math.floor(Math.random() * defaultCompliments.length)];

    // Replace {username} placeholder if present in custom compliments
    const compliment = template.replace(/{username}/g, target.username);

    await interaction.reply(compliment);
  },
};
