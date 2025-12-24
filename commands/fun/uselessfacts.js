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
        await interaction.deferReply();
        try {
            const response = await fetchData("https://uselessfacts.jsph.pl/random.json?language=en", {
                headers: {
                    Accept: "application/json"
                }
            });

            const data = await response.json(); //correctly parse the JSON from the response
            const {text: fact } = data; //extract the fact from the parsed data
            
            if (fact) {
                await interaction.editReply(`${fact}`);
            } else {
                await interaction.editReply("No fact found :(");
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply("An error occurred while fetching the fact. Please try again later.");
        }
    }
};
