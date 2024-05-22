const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("meow")
        .setDescription("meow meow meow meow meow meow meow")
        .addUserOption((option) =>
            option.setName("user").setDescription("Pspspspspspspspspspsps")
        ),
    async execute(interaction) {
       
        try {
            const response = await fetch('https://cataas.com/cat/gif');
            const data = await response.json();
            const { insult } = data;

            await interaction.deferReply();
            const message = await interaction.editReply(
                `${
                    interaction.options.getUser("user") ?? interaction.user
                } ${insult}`
            );
            message.react("🔥");
        } catch (err) {
            console.log('error: ', err);
            await interaction.reply("Failed to fetch an image. Please try again later bitch.");
            return;
        }
    },
};