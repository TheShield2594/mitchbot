const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice')
    .addIntegerOption(option =>
      option
        .setName('sides')
        .setDescription('Number of sides on the die (default: 6)')
        .setMinValue(2)
        .setMaxValue(100)
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('Number of dice to roll (default: 1)')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)
    ),

  async execute(interaction) {
    const sides = interaction.options.getInteger('sides') || 6;
    const count = interaction.options.getInteger('count') || 1;

    const rolls = [];
    let total = 0;

    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      total += roll;
    }

    if (count === 1) {
      await interaction.reply(`🎲 You rolled a ${rolls[0]}. Congrats.`);
    } else {
      await interaction.reply(`🎲 You rolled: ${rolls.join(', ')}\nTotal: ${total}`);
    }
  },
};
