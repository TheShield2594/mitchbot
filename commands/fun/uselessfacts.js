const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

async function fetch(url, options) {
    const response = await fetch(url, options);
    return response;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fact")
        .setDescription("Here is a random fact."),

    async execute(interaction) {
        try {
            const randomFactURL = await fetch("https://uselessfacts.jsph.pl/random.json?language=en", {
                headers: {
                    Accept: "application/json"
                }
            });

            const { fact } = await randomFactURL.body.json();
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