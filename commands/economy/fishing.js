const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    claimFishing,
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

// Fishing flavor messages based on rarity
const fishingMessages = {
    Common: [
        "cast your line and pulled up",
        "waited patiently and caught",
        "felt a tug and reeled in",
        "got lucky and found",
    ],
    Uncommon: [
        "felt a strong tug and pulled up",
        "struggled but managed to catch",
        "fought hard and reeled in",
        "got excited and caught",
    ],
    Rare: [
        "battled fiercely and landed",
        "fought for minutes and caught",
        "showed skill and reeled in",
        "amazingly caught",
    ],
    Legendary: [
        "witnessed a miracle and caught",
        "couldn't believe you landed",
        "felt the ocean shake as you pulled up",
        "achieved legendary status by catching",
    ],
};

function getFishingMessage(rarity) {
    const messages = fishingMessages[rarity] || fishingMessages.Common;
    return messages[Math.floor(Math.random() * messages.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fishing")
        .setDescription("Go fishing and catch various fish to earn coins!"),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Fishing is only available inside servers.",
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

        const result = claimFishing(interaction.guildId, interaction.user.id, new Date());

        if (!result.ok) {
            const embed = new EmbedBuilder()
                .setColor(ECONOMY_EMBED_COLOR)
                .setTitle("🎣 Fishing Cooldown")
                .setDescription("Your fishing rod needs a break! Come back later.")
                .addFields({
                    name: "Next fishing trip available",
                    value: formatRelativeTimestamp(result.nextFishAt),
                    inline: true,
                })
                .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const fish = result.fish;
        const fishingMessage = getFishingMessage(fish.rarity);

        // Color based on rarity
        const rarityColors = {
            Common: "#95a5a6",
            Uncommon: "#3498db",
            Rare: "#9b59b6",
            Legendary: "#f1c40f",
        };

        const embed = new EmbedBuilder()
            .setColor(rarityColors[fish.rarity] || ECONOMY_EMBED_COLOR)
            .setTitle("🎣 Fishing Success!")
            .setDescription(
                `You ${fishingMessage} ${fish.emoji} **${fish.name}**!\n\n` +
                `**Rarity:** ${fish.rarity}\n` +
                `**Value:** ${formatCoins(fish.value, config.currencyName)}`
            )
            .addFields(
                { name: "New balance", value: formatCoins(result.balance, config.currencyName), inline: true },
                { name: "Next fishing trip", value: formatRelativeTimestamp(result.nextFishAt), inline: true }
            )
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
