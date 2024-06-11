const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Decide for me.")
    .addStringOption((option) =>
      option
        .setName("choices")
        .setDescription("Must be formatted as '(option 1) OR (option 2)'")
        .setRequired(true)
    ),
  async execute(interaction) {
    const choiceInput = interaction.options.getString("choices");
    const splitOptions = choiceInput.split(" OR ");
    const randomAnswer =
      splitOptions[Math.floor(Math.random() * splitOptions.length)];
    await interaction.reply(
      `\`\`${interaction.user.username} asks: ${choiceInput}\`\``
    );
    await interaction.channel.send(randomAnswer);
  },
};