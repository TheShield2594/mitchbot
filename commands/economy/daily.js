const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    claimDaily,
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Claim your daily reward"),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Daily rewards are only available inside servers.",
                ephemeral: true,
            });
            return;
        }

        await initEconomy();

        const config = getEconomyConfig(interaction.guildId);
        const result = claimDaily(interaction.guildId, interaction.user.id, new Date());

        if (!result.ok) {
            const embed = new EmbedBuilder()
                .setColor(ECONOMY_EMBED_COLOR)
                .setTitle("Daily Reward")
                .setDescription("You already claimed your daily reward.")
                .addFields({
                    name: "Next claim",
                    value: formatRelativeTimestamp(result.nextClaimAt),
                    inline: true,
                })
                .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(ECONOMY_EMBED_COLOR)
            .setTitle("Daily Reward Claimed")
            .setDescription(`You received **${formatCoins(result.reward, config.currencyName)}**!`)
            .addFields(
                { name: "New balance", value: formatCoins(result.balance, config.currencyName), inline: true },
                { name: "Next claim", value: formatRelativeTimestamp(result.nextClaimAt), inline: true }
            )
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
