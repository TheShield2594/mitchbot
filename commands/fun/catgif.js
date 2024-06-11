const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

async function fetchData(url, options) {
    const response = await fetch(url, options);
    return response;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cat")
        .setDescription("Here is a cat!"),

    async execute(interaction) {
        try {
            const response = await fetchData("https://cataas.com/cat", {
                headers: {
                    Accept: "application/json"
                }
            });

            const data = await response.json(); //correctly parse the JSON from the response
            const {text: fact } = data; //extract the fact from the parsed data
            
            if (fact) {
                await interaction.reply(`${fact}`);
            } else {
                await interaction.reply("No cat found :(");
            }
        } catch (error) {
            console.error(error);
            await interaction.reply("An error occurred while fetching the fact. Please try again later.");
        }
    }
};