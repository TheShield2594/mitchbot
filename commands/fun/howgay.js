const { SlashCommandBuilder, MessageEmbed } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gayrate")
    .setDescription("Calculate your gay rate!"),

  async execute(interaction) {
    const result = Math.ceil(Math.random() * 100);

    const embed = new MessageEmbed();
    embed.setDescription = `You are ${result}% gay!`;
    embed.setTitle = `🏳️‍🌈・Gay rate`;

    await interaction.reply({ embeds: [embed] });
  },
};
