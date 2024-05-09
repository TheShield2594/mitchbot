const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("insult")
        .setDescription("Get gud Noob")
        .addUserOption((option) =>
            option.setName("user").setDescription("Let's insult somebody...")
        ),
    async execute(interaction) {
        const insultURL = await request(`https://insult.mattbas.org/api/insult.json`, {
            signal: interaction.client.requestTimeout,
        });

        if (insultURL.status >= 400) {
            await interaction.reply("Failed to fetch an insult. Please try again later bitch.");
            return;
        }

        const { insult } = await insultURL.body.json();
        await interaction.deferReply();

        const message = await interaction.editReply(
            `${
                interaction.options.getUser("user") ?? interaction.user
            } ${insult}`
        );
        message.react("🔥");
    },
};