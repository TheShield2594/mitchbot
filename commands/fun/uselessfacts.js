const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

async function fetchData(url, options) {
    const response = await fetch(url, options);
    return response;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fact")
        .setDescription("Here is a random fact."),

    async execute(interaction) {
        try {
            const response = await fetchData("https://uselessfacts.jsph.pl/random.json?language=en", {
                headers: {
                    Accept: "application/json"
                }
            });
            console.log(response);

            const data = await response.json(); //correctly parse the JSON from the response
            console.log(data);
            const {text: fact } = data; //extract the fact from the parsed data
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