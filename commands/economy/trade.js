const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
    getInventory,
    tradeItem,
    ECONOMY_EMBED_COLOR,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");

// Store pending trade offers (in-memory, resets on bot restart)
const pendingTrades = new Map();

const data = new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Trade an item from your inventory to another user")
    .addUserOption(option =>
        option
            .setName("user")
            .setDescription("The user to trade with")
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName("item")
            .setDescription("The item ID to trade (use /inventory to find item IDs)")
            .setRequired(true)
    );

async function execute(interaction) {
    if (!interaction.guildId) {
        await interaction.reply({
            content: "Trading is only available inside servers.",
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

    const targetUser = interaction.options.getUser("user");
    const itemQuery = interaction.options.getString("item").toLowerCase();

    // Don't allow trading with bots
    if (targetUser.bot) {
        await interaction.reply({
            content: "You can't trade with bots!",
            ephemeral: true,
        });
        return;
    }

    // Don't allow trading with yourself
    if (targetUser.id === interaction.user.id) {
        await interaction.reply({
            content: "You can't trade with yourself!",
            ephemeral: true,
        });
        return;
    }

    const inventory = getInventory(interaction.guildId, interaction.user.id);

    if (inventory.length === 0) {
        await interaction.reply({
            content: "Your inventory is empty! Visit `/shop` to purchase items first.",
            ephemeral: true,
        });
        return;
    }

    // Find item by ID, then exact name match, then partial name match
    let item = inventory.find(i => i.id === itemQuery);
    if (!item) {
        item = inventory.find(i => i.name.toLowerCase() === itemQuery);
    }
    if (!item) {
        item = inventory.find(i => i.name.toLowerCase().includes(itemQuery));
    }

    if (!item) {
        await interaction.reply({
            content: `Item not found in your inventory. Use \`/inventory\` to see your items and their IDs.`,
            ephemeral: true,
        });
        return;
    }

    // Create trade offer
    const tradeId = `${interaction.guildId}-${interaction.user.id}-${targetUser.id}-${Date.now()}`;

    pendingTrades.set(tradeId, {
        fromUserId: interaction.user.id,
        toUserId: targetUser.id,
        itemId: item.id,
        itemName: item.name,
        guildId: interaction.guildId,
        createdAt: Date.now(),
    });

    // Auto-expire after 2 minutes
    setTimeout(() => {
        if (pendingTrades.has(tradeId)) {
            pendingTrades.delete(tradeId);
        }
    }, 120000);

    const typeEmoji = item.type === "role" ? "🎭" : "📦";
    const embed = new EmbedBuilder()
        .setColor(ECONOMY_EMBED_COLOR)
        .setTitle("🤝 Trade Offer")
        .setDescription(`${interaction.user} wants to trade **${typeEmoji} ${item.name}** to ${targetUser}!`)
        .addFields(
            { name: "Item", value: item.name, inline: true },
            { name: "Type", value: item.type || "item", inline: true }
        )
        .setFooter({ text: "This offer expires in 2 minutes" })
        .setTimestamp();

    if (item.description) {
        embed.addFields({ name: "Description", value: item.description, inline: false });
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`trade_accept_${tradeId}`)
                .setLabel("Accept Trade")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`trade_decline_${tradeId}`)
                .setLabel("Decline")
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({
        content: `${targetUser}, you have a trade offer!`,
        embeds: [embed],
        components: [row]
    });
}

async function handleTradeButton(interaction) {
    if (!interaction.customId.startsWith("trade_")) return false;

    const match = interaction.customId.match(/^trade_(accept|decline)_(.+)$/);
    if (!match) return false;

    const action = match[1];
    const tradeId = match[2];

    const trade = pendingTrades.get(tradeId);

    if (!trade) {
        await interaction.update({
            content: "This trade offer has expired.",
            embeds: [],
            components: [],
        });
        return true;
    }

    // Only the recipient can respond
    if (interaction.user.id !== trade.toUserId) {
        await interaction.reply({
            content: "This trade offer isn't for you!",
            ephemeral: true,
        });
        return true;
    }

    await initEconomy();
    const config = getEconomyConfig(trade.guildId);

    if (action === "decline") {
        pendingTrades.delete(tradeId);

        const embed = new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle("❌ Trade Declined")
            .setDescription(`<@${trade.toUserId}> declined the trade offer.`)
            .setTimestamp();

        await interaction.update({
            content: `<@${trade.fromUserId}> <@${trade.toUserId}>`,
            embeds: [embed],
            components: [],
        });
        return true;
    }

    // Accept trade
    const result = tradeItem(
        trade.guildId,
        trade.fromUserId,
        trade.toUserId,
        trade.itemId
    );

    pendingTrades.delete(tradeId);

    if (!result.ok) {
        let errorMessage = "An error occurred while processing the trade.";

        switch (result.error) {
            case "no_inventory":
                errorMessage = "The sender no longer has any items in their inventory.";
                break;
            case "item_not_found":
                errorMessage = "The sender no longer has this item.";
                break;
        }

        const embed = new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle("❌ Trade Failed")
            .setDescription(errorMessage)
            .setTimestamp();

        await interaction.update({
            content: `<@${trade.fromUserId}> <@${trade.toUserId}>`,
            embeds: [embed],
            components: [],
        });
        return true;
    }

    // Trade successful
    const typeEmoji = result.item.type === "role" ? "🎭" : "📦";
    const embed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("✅ Trade Successful!")
        .setDescription(`**${typeEmoji} ${result.item.name}** was traded from <@${trade.fromUserId}> to <@${trade.toUserId}>!`)
        .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
        .setTimestamp();

    await interaction.update({
        content: `<@${trade.fromUserId}> <@${trade.toUserId}>`,
        embeds: [embed],
        components: [],
    });

    return true;
}

module.exports = {
    data,
    execute,
    handleTradeButton,
};
