const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");
const { checkCooldown, setCooldown } = require("../../utils/cooldowns");
const logger = require("../../utils/logger");

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
        const cooldown = checkCooldown(interaction.user.id, "8ball", 5000);
        if (cooldown.onCooldown) {
            await interaction.reply({
                content: `Wait ${cooldown.remainingTime}s.`,
                ephemeral: true,
            });
            return;
        }

        const question = interaction.options.getString("question");
        await interaction.deferReply();

        try {
            const questionURL = await request("https://www.eightballapi.com/api", {
                signal: AbortSignal.timeout(5000)
            });
            if (questionURL.statusCode >= 400) {
                await interaction.editReply(
                    "The magic 8ball is busy."
                );
                return;
            }
            const { reading } = await questionURL.body.json();
            await interaction.editReply(
                `Question: ${question} \n Answer: ${reading}`
            );
            setCooldown(interaction.user.id, "8ball", 5000);
        } catch (error) {
            logger.error("Error fetching 8ball", {
                guildId: interaction.guildId,
                channelId: interaction.channelId,
                userId: interaction.user.id,
                commandName: interaction.commandName,
                error,
            });
            await interaction.editReply(
                "The magic 8ball is busy."
            );
        }
    },
};
