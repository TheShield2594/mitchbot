const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("8ball")
        .setDescription(
            "The magic 8ball that gives you all the answers.. Well sometimes."
        )
        .addStringOption((option) =>
            option
                .setName("question")
                .setDescription("Will I win this game?")
                .setRequired(true)
        ),
    async execute(interaction) {
        const question = interaction.options.getString("question");
        await interaction.deferReply();

        try {
            const questionURL = await request("https://www.eightballapi.com/api", {
                signal: AbortSignal.timeout(5000)
            });
            if (questionURL.statusCode >= 400) {
                await interaction.editReply(
                    "The magic 8ball is busy right now. Please try again later."
                );
                return;
            }
            const { reading } = await questionURL.body.json();
            console.log(reading);
            await interaction.editReply(
                `Question: ${question} \n Answer: ${reading}`
            );
        } catch (error) {
            console.error("Error fetching 8ball:", error);
            await interaction.editReply(
                "The magic 8ball is busy right now. Please try again later."
            );
        }
    },
};
