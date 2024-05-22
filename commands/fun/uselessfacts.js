const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fact")
        .setDescription("Here is a random fact."),
    async execute(interaction) {
        try {
            const response = await request("https://uselessfacts.jsph.pl/random.json?language=en");
            const { fact } = await response.body.json();
            if (fact) {
                await interaction.reply(`${fact}`);
            } else {
                await interaction.reply("No fact found :(");
            }
        } catch (error) {
            console.error(error);
            await interaction.reply("An error occurred while fetching the fact. Please try again later.");
        }
    }
};