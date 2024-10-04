const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("spongemocker")
        .setDescription(
            "Spongemocker provides an exaggerated imitation-like reponse."
        )
        .addStringOption((option) =>
            option
                .setName("message")
                .setDescription("gIvE mE sOmE tExT")
                .setRequired(true)
        ),
    async execute(interaction) {
        const message = interaction.options.getString("message");
        let result = '';
        for (let i = 0; i < message.length; i++) {
            if (i % 2 === 0) {
                result += message[i].toLowerCase();
            } else {
                result += message[i].toUpperCase();
            }
        }

        await interaction.reply(
            `${result}`
        );
    },
};
