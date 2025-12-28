const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");
const { checkCooldown, setCooldown } = require("../../utils/cooldowns");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dadjoke")
        .setDescription("I'm hungry. Hello Hungry I'm dad."),

    async execute(interaction) {
        const cooldown = checkCooldown(interaction.user.id, "dadjoke", 5000);
        if (cooldown.onCooldown) {
            await interaction.reply({
                content: `Wait ${cooldown.remainingTime}s.`,
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();
        try {
            const dadJokeURL = await request("https://icanhazdadjoke.com", {
                headers: { Accept: "application/json" },
                signal: AbortSignal.timeout(5000)
            });
            const { joke } = await dadJokeURL.body.json();
            await interaction.editReply(`${joke}`);
            setCooldown(interaction.user.id, "dadjoke", 5000);
        } catch (error) {
            console.error('Error fetching dad joke:', error);
            await interaction.editReply("Failed to fetch dad joke.");
        }
    },
};
