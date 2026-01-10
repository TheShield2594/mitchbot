const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    claimHunting,
    ECONOMY_EMBED_COLOR,
    ECONOMY_FAILURE_COLOR,
    RARITY_COLORS,
    formatCoins,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");
const { formatRelativeTimestamp } = require("../../utils/timeFormatters");
const logger = require("../../utils/logger");

// Hunting flavor messages based on rarity
const huntingMessages = {
    Common: [
        "spotted and tracked down",
        "quietly approached and caught",
        "successfully hunted",
        "found tracks leading to",
    ],
    Uncommon: [
        "tracked through the forest and hunted",
        "set a perfect trap for",
        "patiently stalked and caught",
        "skillfully hunted",
    ],
    Rare: [
        "bravely confronted and defeated",
        "tracked for hours before catching",
        "displayed exceptional skill hunting",
        "heroically hunted",
    ],
    Legendary: [
        "achieved legendary status by hunting",
        "became a legend after defeating",
        "conquered the impossible and hunted",
        "will be remembered forever for hunting",
    ],
};

function getHuntingMessage(rarity) {
    const messages = huntingMessages[rarity] || huntingMessages.Common;
    return messages[Math.floor(Math.random() * messages.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("hunting")
        .setDescription("Go hunting for wildlife - risk vs reward!"),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Hunting is only available inside servers.",
                ephemeral: true,
            });
            return;
        }

        await initEconomy();

        const config = getEconomyConfig(interaction.guildId);

        if (!config.enabled) {
            await interaction.reply({
                content: "The economy system is disabled in this server.",
                ephemeral: true,
            });
            return;
        }

        const result = claimHunting(interaction.guildId, interaction.user.id, new Date());

        if (!result.ok) {
            const embed = new EmbedBuilder()
                .setColor(ECONOMY_EMBED_COLOR)
                .setTitle("🏹 Hunting Cooldown")
                .setDescription("You're too tired to hunt right now. Rest up!")
                .addFields({
                    name: "Next hunt available",
                    value: formatRelativeTimestamp(result.nextHuntAt),
                    inline: true,
                })
                .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        if (!result.success) {
            // Hunt failed - no catch
            const embed = new EmbedBuilder()
                .setColor(ECONOMY_FAILURE_COLOR)
                .setTitle("🏹 Hunt Failed")
                .setDescription(
                    "You spent hours tracking but came back empty-handed.\n\n" +
                    "Better luck next time!"
                )
                .addFields({
                    name: "Next hunt",
                    value: formatRelativeTimestamp(result.nextHuntAt),
                    inline: true,
                })
                .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            return;
        }

        // Successful hunt - validate animal data
        if (!result.animal) {
            logger.error("Missing animal data in successful hunt result", {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                result,
            });
            const embed = new EmbedBuilder()
                .setColor(ECONOMY_FAILURE_COLOR)
                .setTitle("🏹 Hunt Error")
                .setDescription("Something went wrong with your hunt. Please try again later.")
                .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const animal = result.animal;
        const huntingMessage = getHuntingMessage(animal.rarity);

        const embed = new EmbedBuilder()
            .setColor(RARITY_COLORS[animal.rarity] || ECONOMY_EMBED_COLOR)
            .setTitle("🏹 Successful Hunt!")
            .setDescription(
                `You ${huntingMessage} ${animal.emoji} **${animal.name}**!\n\n` +
                `**Rarity:** ${animal.rarity}\n` +
                `**Value:** ${formatCoins(animal.value, config.currencyName)}`
            )
            .addFields(
                { name: "New balance", value: formatCoins(result.balance, config.currencyName), inline: true },
                { name: "Next hunt", value: formatRelativeTimestamp(result.nextHuntAt), inline: true }
            )
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
