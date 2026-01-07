const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const {
    getShopItems,
    purchaseItem,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("buy")
        .setDescription("Purchase an item from the shop")
        .addStringOption(option =>
            option.setName("item")
                .setDescription("The item to purchase")
                .setRequired(true)
                .setAutocomplete(true)
        ),
    async autocomplete(interaction) {
        if (!interaction.guildId) {
            await interaction.respond([]);
            return;
        }

        await initEconomy();

        const items = getShopItems(interaction.guildId);
        const focusedValue = interaction.options.getFocused().toLowerCase();

        const filtered = items
            .filter(item =>
                item.name.toLowerCase().includes(focusedValue) ||
                (item.description && item.description.toLowerCase().includes(focusedValue))
            )
            .filter(item => item.stock !== 0) // Hide out of stock items
            .slice(0, 25); // Discord limit

        await interaction.respond(
            filtered.map(item => ({
                name: `${item.name} - ${item.price} coins`,
                value: item.id,
            }))
        );
    },
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Purchases are only available inside servers.",
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

        const itemId = interaction.options.getString("item");
        const result = purchaseItem(interaction.guildId, interaction.user.id, itemId);

        if (!result.ok) {
            let description = result.error || "Unable to complete the purchase.";

            if (result.error === "Insufficient funds") {
                description = `You don't have enough ${config.currencyName} to purchase this item!\n\nYour balance: **${formatCoins(result.balance, config.currencyName)}**\nPrice: **${formatCoins(result.price, config.currencyName)}**`;
            }

            const embed = new EmbedBuilder()
                .setColor("#e74c3c")
                .setTitle("Purchase Failed")
                .setDescription(description)
                .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(ECONOMY_EMBED_COLOR)
            .setTitle("Purchase Complete!")
            .setDescription(`You purchased **${result.item.name}**!`)
            .addFields({
                name: "New balance",
                value: formatCoins(result.balance, config.currencyName),
                inline: true,
            })
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        // If it's a role item, try to assign the role
        if (result.item.type === "role" && result.item.roleId) {
            try {
                // Check if bot has permission to manage roles
                const botMember = await interaction.guild.members.fetchMe();
                if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    embed.addFields({
                        name: "Role Assignment Failed",
                        value: "The item was purchased but I don't have permission to manage roles. Please contact an administrator.",
                        inline: false,
                    });
                    await interaction.reply({ embeds: [embed] });
                    return;
                }

                const member = await interaction.guild.members.fetch(interaction.user.id);
                const role = await interaction.guild.roles.fetch(result.item.roleId);

                if (!role) {
                    embed.addFields({
                        name: "Role Assignment Failed",
                        value: "The item was purchased but the role no longer exists. Please contact an administrator.",
                        inline: false,
                    });
                    await interaction.reply({ embeds: [embed] });
                    return;
                }

                // Check role hierarchy
                if (botMember.roles.highest.position <= role.position) {
                    embed.addFields({
                        name: "Role Assignment Failed",
                        value: "The item was purchased but the role is too high in the hierarchy for me to assign. Please contact an administrator.",
                        inline: false,
                    });
                    await interaction.reply({ embeds: [embed] });
                    return;
                }

                if (member) {
                    await member.roles.add(role);
                    embed.addFields({
                        name: "Role Assigned",
                        value: `You received the ${role} role!`,
                        inline: false,
                    });
                }
            } catch (error) {
                console.error("Failed to assign role:", error);
                embed.addFields({
                    name: "Role Assignment Failed",
                    value: "The item was purchased but the role could not be assigned. Please contact an administrator.",
                    inline: false,
                });
            }
        }

        await interaction.reply({ embeds: [embed] });
    },
};
