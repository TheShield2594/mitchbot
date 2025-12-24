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
        await interaction.deferReply();
        // Commented out to try different API
        // const insultURL = await request(`https://insult.mattbas.org/api/insult.json`, {
        //     signal: interaction.client.requestTimeout,
        // });

        // if (insultURL.status >= 400) {
        //     await interaction.reply("Failed to fetch an insult. Please try again later bitch.");
        //     return;
        // }

        // const { insult } = await insultURL.body.json();

        try {
            const response = await fetch('https://evilinsult.com/generate_insult.php?lang=en&type=json');
            const data = await response.json();
            const { insult } = data;

            const message = await interaction.editReply(
                `${
                    interaction.options.getUser("user") ?? interaction.user
                } ${insult}`
            );
            message.react("🔥");
        } catch (err) {
            console.log('error: ', err);
            await interaction.editReply("Failed to fetch an insult. Please try again later bitch.");
            return;
        }
    },
};
