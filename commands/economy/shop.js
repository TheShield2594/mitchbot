const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    getShopItems,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    getEconomyConfig,
    getBalance,
    initEconomy,
} = require("../../utils/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("View available shop items"),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "The shop is only available inside servers.",
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

        const items = getShopItems(interaction.guildId);

        if (items.length === 0) {
            await interaction.reply({
                content: "The shop is empty! Server admins can add items through the web dashboard.",
                ephemeral: true,
            });
            return;
        }

        const userBalance = getBalance(interaction.guildId, interaction.user.id);

        const embed = new EmbedBuilder()
            .setColor(ECONOMY_EMBED_COLOR)
            .setTitle(`🛒 ${interaction.guild.name} - Shop`)
            .setDescription(`Your balance: **${formatCoins(userBalance, config.currencyName)}**\n\nUse \`/buy [item]\` to purchase an item.`)
            .setFooter({ text: `Total items: ${items.length}` })
            .setTimestamp();

        // Group items into fields (max 25 fields)
        const maxFields = 25;
        const itemsToShow = items.slice(0, maxFields);

        for (const item of itemsToShow) {
            const stockText = item.stock === -1 ? "∞" : item.stock;
            const typeEmoji = item.type === "role" ? "🎭" : "📦";
            const stockInfo = item.stock === 0 ? " **(OUT OF STOCK)**" : ` (Stock: ${stockText})`;

            embed.addFields({
                name: `${typeEmoji} ${item.name} - ${formatCoins(item.price, config.currencyName)}${stockInfo}`,
                value: item.description || "No description",
                inline: false,
            });
        }

        if (items.length > maxFields) {
            embed.setDescription(
                `Your balance: **${formatCoins(userBalance, config.currencyName)}**\n\nShowing ${maxFields} of ${items.length} items. Use \`/buy [item]\` to purchase.`
            );
        }

        await interaction.reply({ embeds: [embed] });
    },
};
