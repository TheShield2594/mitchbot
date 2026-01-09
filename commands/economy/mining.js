const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    claimMining,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");

function formatRelativeTimestamp(isoString) {
    if (!isoString) {
        return "soon";
    }

    const timestamp = Math.floor(new Date(isoString).getTime() / 1000);
    if (Number.isNaN(timestamp)) {
        return "soon";
    }

    return `<t:${timestamp}:R>`;
}

// Mining flavor messages based on rarity
const miningMessages = {
    Common: [
        "swung your pickaxe and found",
        "chipped away at the rock and discovered",
        "dug through the earth and extracted",
        "mined carefully and collected",
    ],
    Uncommon: [
        "struck a vein and mined",
        "worked hard and extracted",
        "felt the pickaxe connect with",
        "broke through and found",
    ],
    Rare: [
        "hit the jackpot and mined",
        "couldn't believe you found",
        "struck gold and extracted",
        "worked tirelessly to mine",
    ],
    Legendary: [
        "witnessed a mining miracle and found",
        "discovered the mother lode containing",
        "felt the cave illuminate as you uncovered",
        "achieved legendary miner status by finding",
    ],
};

function getMiningMessage(rarity) {
    const messages = miningMessages[rarity] || miningMessages.Common;
    return messages[Math.floor(Math.random() * messages.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mining")
        .setDescription("Go mining and extract various ores to earn coins!"),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Mining is only available inside servers.",
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

        const result = claimMining(interaction.guildId, interaction.user.id, new Date());

        if (!result.ok) {
            const embed = new EmbedBuilder()
                .setColor(ECONOMY_EMBED_COLOR)
                .setTitle("⛏️ Mining Cooldown")
                .setDescription("Your pickaxe is too worn out! Let it rest.")
                .addFields({
                    name: "Next mining session available",
                    value: formatRelativeTimestamp(result.nextMineAt),
                    inline: true,
                })
                .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const ore = result.ore;
        const miningMessage = getMiningMessage(ore.rarity);

        // Color based on rarity
        const rarityColors = {
            Common: "#95a5a6",
            Uncommon: "#3498db",
            Rare: "#9b59b6",
            Legendary: "#f1c40f",
        };

        const embed = new EmbedBuilder()
            .setColor(rarityColors[ore.rarity] || ECONOMY_EMBED_COLOR)
            .setTitle("⛏️ Mining Success!")
            .setDescription(
                `You ${miningMessage} ${ore.emoji} **${ore.name}**!\n\n` +
                `**Rarity:** ${ore.rarity}\n` +
                `**Value:** ${formatCoins(ore.value, config.currencyName)}`
            )
            .addFields(
                { name: "New balance", value: formatCoins(result.balance, config.currencyName), inline: true },
                { name: "Next mining session", value: formatRelativeTimestamp(result.nextMineAt), inline: true }
            )
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
