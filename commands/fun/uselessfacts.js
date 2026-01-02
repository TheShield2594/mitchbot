const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");
const { checkCooldown, setCooldown } = require("../../utils/cooldowns");
const { logCommandError } = require("../../utils/commandLogger");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fact")
        .setDescription("Here is a random fact."),

    async execute(interaction) {
        const cooldown = checkCooldown(interaction.user.id, "fact", 5000);
        if (cooldown.onCooldown) {
            await interaction.reply({
                content: `Wait ${cooldown.remainingTime}s.`,
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();
        try {
            const response = await request("https://uselessfacts.jsph.pl/random.json?language=en", {
                headers: {
                    Accept: "application/json"
                },
                signal: AbortSignal.timeout(5000)
            });

            const data = await response.body.json();
            const { text: fact } = data;

            if (fact) {
                await interaction.editReply(`${fact}`);
                setCooldown(interaction.user.id, "fact", 5000);
            } else {
                await interaction.editReply("No fact found.");
            }
        } catch (error) {
            logCommandError('Error fetching fact', interaction, { error });
            await interaction.editReply("Failed to fetch fact.");
        }
    }
};
