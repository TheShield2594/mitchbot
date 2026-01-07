const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    getInventory,
    ECONOMY_EMBED_COLOR,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("View your purchased items")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("View another user's inventory")
                .setRequired(false)
        ),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Inventory is only available inside servers.",
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

        const targetUser = interaction.options.getUser("user") || interaction.user;
        const inventory = getInventory(interaction.guildId, targetUser.id);

        const embed = new EmbedBuilder()
            .setColor(ECONOMY_EMBED_COLOR)
            .setTitle(`🎒 ${targetUser.username}'s Inventory`)
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        if (inventory.length === 0) {
            embed.setDescription("This inventory is empty. Visit `/shop` to purchase items!");
            await interaction.reply({ embeds: [embed], ephemeral: targetUser.id === interaction.user.id });
            return;
        }

        // Group items by name and count duplicates
        const itemCounts = {};
        for (const item of inventory) {
            if (!itemCounts[item.name]) {
                itemCounts[item.name] = {
                    count: 0,
                    description: item.description,
                    type: item.type,
                };
            }
            itemCounts[item.name].count++;
        }

        const description = Object.entries(itemCounts)
            .map(([name, data]) => {
                const typeEmoji = data.type === "role" ? "🎭" : "📦";
                const countText = data.count > 1 ? ` x${data.count}` : "";
                return `${typeEmoji} **${name}**${countText}\n${data.description || "No description"}`;
            })
            .join("\n\n");

        embed.setDescription(description);
        embed.addFields({
            name: "Total Items",
            value: inventory.length.toString(),
            inline: true,
        });

        await interaction.reply({ embeds: [embed], ephemeral: targetUser.id === interaction.user.id });
    },
};
