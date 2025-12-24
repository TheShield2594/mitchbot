const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gayrate")
    .setDescription("Calculate your gay rate!"),

  async execute(interaction) {
    const result = Math.ceil(Math.random() * 100);

    const embed = new EmbedBuilder()
      .setTitle(`🏳️‍🌈・Gay rate`)
      .setDescription(`You are ${result}% gay!`);

    await interaction.deferReply();
    await interaction.editReply({ embeds: [embed] });
  },
};
