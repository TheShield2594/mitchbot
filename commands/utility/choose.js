const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("choose")
        .setDescription("Decide for me.")
        .addStringOption((option) =>
            option
                .setName("choices")
                .setRequired(true)
                .setDescription("Seperate with OR between choices")
        ),
    async execute(interaction) {
        const choiceInput = interaction.options.getString("choices");
        splitOptions = choiceInput.split(" OR ");
        randomAnswer =
            splitOptions[Math.floor(Math.random() * splitOptions.length)];
        await interaction.reply(
            "```" + interaction.user.username + " asks: " + choiceInput + "```"
        );
        await interaction.channel.send(randomAnswer);
    },
};
