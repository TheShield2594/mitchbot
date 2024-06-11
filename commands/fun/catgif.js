const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

async function fetchData(url, options) {
    const { body } = await request(url, options);
    return body.json();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cat")
        .setDescription("Here is a cat!"),

    async execute(interaction) {
        try {
            const response = await fetchData("https://cataas.com/cat?json=true", {
                headers: {
                    Accept: "application/json"
                }
            });

            const { url: catUrl } = response; //extract the URL from the parsed data
            
            if (catUrl) {
                await interaction.reply({ files: [`https://cataas.com${catUrl}`] });
            } else {
                await interaction.reply("No cat found :(");
            }
        } catch (error) {
            console.error(error);
            await interaction.reply("An error occurred while fetching the cat. Please try again later.");
        }
    }
};