const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("moo")
        .setDescription("Cowspeak, Moo i'm a cow...!")
        .addStringOption((option) =>
            option.setName("cowspeak").setDescription("The text for cowspeak")
        ),
    async execute(interaction) {
        const cowspeakText =
            interaction.options.getString("cowspeak") ?? "HoW I sPeAk CoW?/";
        const encodedMessage = encodeURIComponent(cowspeakText);
        await interaction.deferReply();

        try {
            const mooURL = await request(
                `https://cowsay.morecode.org/say?message=${encodedMessage}&format=json`,
                {
                    signal: AbortSignal.timeout(5000)
                }
            );
            const { cow } = await mooURL.body.json();
            await interaction.editReply("```" + cow + "```");
        } catch (error) {
            console.error("Error fetching cowspeak:", error);
            await interaction.editReply("Failed to fetch cowspeak. Please try again later.");
        }
    },
};
