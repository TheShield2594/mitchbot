const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cat gift")
        .setDescription("Here is a random cat."),
    
    async execute(interaction) {
        try {
            const randomCatURL = await request("https://cataas.com/cat/gif"); {Headers: {Accept: "application/json"}};
            const {cat} = await randomCatURL.body.json();
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