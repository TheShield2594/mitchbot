const { request } = require("undici");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { CommandInteraction } = require("discord.js");

async function get(url, options) {
    const { body } = await request(url, options);
    const json = await body.json();
    return json;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fact")
        .setDescription("Here is a random fact."),

    /**
     * 
     * @param {CommandInteraction} interaction 
     */
    async execute(interaction) {
        try {
            const randomFactURL = "https://uselessfacts.jsph.pl/random.json?language=en";
            const { fact } = await get(randomFactURL, {
                headers: {
                    Accept: "application/json"
                }
            });

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