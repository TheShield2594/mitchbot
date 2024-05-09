const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("choose")
        .setDescription("Decide for me."),
        async execute(interaction) {
            const choiceInput = interaction.options.getString("choices");
            const splitOptions = choiceInput.split(" OR ");
            const randomAnswer = splitOptions[Math.floor(Math.random() * splitOptions.length)];
            await interaction.reply(`\`\`${interaction.user.username} asks: ${choiceInput}\`\``);
            await interaction.channel.send(randomAnswer);
        }
    }