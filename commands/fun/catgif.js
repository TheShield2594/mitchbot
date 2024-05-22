const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cat git")
        .setDescription("Here is a random cat."),

    async execute(interaction) {
        try {
            const options = {
                headers: {
                    Accept: "application/json"
                }
            };
            const randomCatURL = await request("https://cataas.com/cat/gif", options);
            const { cat } = await randomCatURL.body.json();
            if (cat) {
                await interaction.reply(`${cat}`);
            } else {
                await interaction.reply("No cat found :(");
            }
        } catch (error) {
            console.error(error);
            await interaction.reply("An error occurred while fetching the cool cat. Please try again later.");
        }
    }
};