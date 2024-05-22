const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("meow")
        .setDescription("Meow Meow Meow Meow!")
        .addStringOption((option) =>
            option.setName("catsay").setDescription("The text for catsay")
        ),
    async execute(interaction) {
        const catsayText =
            interaction.options.getString("catsay") ?? "Meow Meow Meow Meow!";
        const splitMessage = catsayText.split(" ");
        const joinedMessage = splitMessage.join("+");

        const catURL = await request(`https://cataas.com/cat/cute/says/${joinedMessage}`);
        const { cat } = await catURL.body.json();
        await interaction.deferReply();
        await interaction.editReply(`\`\`${cat}\`\``);
    }
};