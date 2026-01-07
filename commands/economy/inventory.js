const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
    getInventory,
    ECONOMY_EMBED_COLOR,
    getEconomyConfig,
    formatCoins,
    initEconomy,
} = require("../../utils/economy");

const ITEMS_PER_PAGE = 5;

function createInventoryEmbed(inventory, itemCounts, targetUser, guildName, config, page = 0) {
    const totalPages = Math.ceil(Object.keys(itemCounts).length / ITEMS_PER_PAGE);
    const currentPage = Math.max(0, Math.min(page, totalPages - 1));

    const embed = new EmbedBuilder()
        .setColor(ECONOMY_EMBED_COLOR)
        .setTitle(`🎒 ${targetUser.username}'s Inventory`)
        .setFooter({
            text: totalPages > 1
                ? `Guild: ${guildName} | Page ${currentPage + 1}/${totalPages}`
                : `Guild: ${guildName}`
        })
        .setTimestamp();

    if (inventory.length === 0) {
        embed.setDescription("This inventory is empty. Visit `/shop` to purchase items!");
        return { embed, totalPages };
    }

    // Get items for current page
    const items = Object.entries(itemCounts);
    const startIdx = currentPage * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const pageItems = items.slice(startIdx, endIdx);

    // Add fields for each item
    for (const [name, data] of pageItems) {
        const typeEmoji = data.type === "role" ? "🎭" : "📦";
        const countText = data.count > 1 ? ` (x${data.count})` : "";
        const valueText = data.price ? ` • Worth ${formatCoins(data.price * data.count, config.currencyName)}` : "";

        embed.addFields({
            name: `${typeEmoji} ${name}${countText}`,
            value: `${data.description || "No description"}${valueText}`,
            inline: false,
        });
    }

    // Summary field
    const uniqueItems = Object.keys(itemCounts).length;
    const totalValue = items.reduce((sum, [_, data]) => sum + (data.price || 0) * data.count, 0);

    let summaryText = `**${inventory.length}** total items`;
    if (uniqueItems !== inventory.length) {
        summaryText += ` (${uniqueItems} unique)`;
    }
    if (totalValue > 0) {
        summaryText += `\n**Total Value:** ${formatCoins(totalValue, config.currencyName)}`;
    }

    embed.addFields({
        name: "📊 Summary",
        value: summaryText,
        inline: false,
    });

    return { embed, totalPages, currentPage };
}

function createPaginationButtons(currentPage, totalPages, userId) {
    if (totalPages <= 1) return null;

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`inventory_first_${userId}`)
                .setLabel("⏮️ First")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId(`inventory_prev_${userId}`)
                .setLabel("◀️ Previous")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId(`inventory_next_${userId}`)
                .setLabel("Next ▶️")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage >= totalPages - 1),
            new ButtonBuilder()
                .setCustomId(`inventory_last_${userId}`)
                .setLabel("Last ⏭️")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage >= totalPages - 1)
        );

    return row;
}

const data = new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your purchased items")
    .addUserOption(option =>
        option.setName("user")
            .setDescription("View another user's inventory")
            .setRequired(false)
    );

async function execute(interaction) {
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

    // Group items by name and count duplicates
    const itemCounts = {};
    for (const item of inventory) {
        if (!itemCounts[item.name]) {
            itemCounts[item.name] = {
                count: 0,
                description: item.description,
                type: item.type,
                price: item.price,
            };
        }
        itemCounts[item.name].count++;
    }

    const { embed, totalPages, currentPage } = createInventoryEmbed(
        inventory,
        itemCounts,
        targetUser,
        interaction.guild?.name || "Unknown",
        config,
        0
    );

    const components = [];
    const buttons = createPaginationButtons(currentPage, totalPages, targetUser.id);
    if (buttons) components.push(buttons);

    await interaction.reply({
        embeds: [embed],
        components,
        ephemeral: targetUser.id === interaction.user.id
    });
}

// Store active inventory sessions
const activeSessions = new Map();

async function handleInventoryButton(interaction) {
    if (!interaction.customId.startsWith("inventory_")) return false;

    const match = interaction.customId.match(/^inventory_(first|prev|next|last)_(.+)$/);
    if (!match) return false;

    const action = match[1];
    const targetUserId = match[2];

    // Only the inventory owner can navigate
    if (interaction.user.id !== targetUserId) {
        await interaction.reply({
            content: "This isn't your inventory!",
            ephemeral: true,
        });
        return true;
    }

    await initEconomy();

    const config = getEconomyConfig(interaction.guildId);
    const inventory = getInventory(interaction.guildId, targetUserId);

    // Group items
    const itemCounts = {};
    for (const item of inventory) {
        if (!itemCounts[item.name]) {
            itemCounts[item.name] = {
                count: 0,
                description: item.description,
                type: item.type,
                price: item.price,
            };
        }
        itemCounts[item.name].count++;
    }

    const totalPages = Math.ceil(Object.keys(itemCounts).length / ITEMS_PER_PAGE);

    // Get current page from session or default to 0
    const sessionKey = `${interaction.guildId}-${targetUserId}`;
    let currentPage = activeSessions.get(sessionKey) || 0;

    // Navigate
    switch (action) {
        case "first":
            currentPage = 0;
            break;
        case "prev":
            currentPage = Math.max(0, currentPage - 1);
            break;
        case "next":
            currentPage = Math.min(totalPages - 1, currentPage + 1);
            break;
        case "last":
            currentPage = totalPages - 1;
            break;
    }

    activeSessions.set(sessionKey, currentPage);

    const targetUser = await interaction.client.users.fetch(targetUserId);
    const { embed } = createInventoryEmbed(
        inventory,
        itemCounts,
        targetUser,
        interaction.guild?.name || "Unknown",
        config,
        currentPage
    );

    const buttons = createPaginationButtons(currentPage, totalPages, targetUserId);
    const components = buttons ? [buttons] : [];

    await interaction.update({ embeds: [embed], components });
    return true;
}

module.exports = {
    data,
    execute,
    handleInventoryButton,
};
