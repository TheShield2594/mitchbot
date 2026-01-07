const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const {
    getBalance,
    setBalance,
    addBalance,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("eco")
        .setDescription("Admin commands for managing the economy system")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild)
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add currency to a user's balance")
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("The user to give currency to")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName("amount")
                        .setDescription("Amount to add")
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addStringOption(option =>
                    option.setName("reason")
                        .setDescription("Reason for adding currency")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove currency from a user's balance")
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("The user to remove currency from")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName("amount")
                        .setDescription("Amount to remove")
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addStringOption(option =>
                    option.setName("reason")
                        .setDescription("Reason for removing currency")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("set")
                .setDescription("Set a user's balance to a specific amount")
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("The user to set balance for")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName("amount")
                        .setDescription("Amount to set")
                        .setRequired(true)
                        .setMinValue(0)
                )
                .addStringOption(option =>
                    option.setName("reason")
                        .setDescription("Reason for setting balance")
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("balance")
                .setDescription("Check a user's balance (admin view)")
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("The user to check")
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Economy admin commands are only available inside servers.",
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

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser("user");

        if (subcommand === "balance") {
            const balance = getBalance(interaction.guildId, targetUser.id);

            const embed = new EmbedBuilder()
                .setColor(ECONOMY_EMBED_COLOR)
                .setTitle("Balance Check")
                .setDescription(`**${targetUser.username}** has ${formatCoins(balance, config.currencyName)}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: `Checked by ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const amount = interaction.options.getInteger("amount");
        const reason = interaction.options.getString("reason") || "Admin adjustment";

        if (subcommand === "add") {
            const result = addBalance(interaction.guildId, targetUser.id, amount, {
                type: "admin_add",
                reason: reason,
                metadata: { adminId: interaction.user.id },
            });

            const embed = new EmbedBuilder()
                .setColor(ECONOMY_EMBED_COLOR)
                .setTitle("Currency Added")
                .setDescription(`Added **${formatCoins(amount, config.currencyName)}** to ${targetUser}`)
                .addFields(
                    { name: "New Balance", value: formatCoins(result.balance, config.currencyName), inline: true },
                    { name: "Reason", value: reason, inline: false }
                )
                .setFooter({ text: `Admin: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === "remove") {
            const currentBalance = getBalance(interaction.guildId, targetUser.id);

            if (currentBalance < amount) {
                await interaction.reply({
                    content: `Cannot remove ${formatCoins(amount, config.currencyName)} - user only has ${formatCoins(currentBalance, config.currencyName)}`,
                    ephemeral: true,
                });
                return;
            }

            const result = addBalance(interaction.guildId, targetUser.id, -amount, {
                type: "admin_remove",
                reason: reason,
                metadata: { adminId: interaction.user.id },
            });

            const embed = new EmbedBuilder()
                .setColor(ECONOMY_EMBED_COLOR)
                .setTitle("Currency Removed")
                .setDescription(`Removed **${formatCoins(amount, config.currencyName)}** from ${targetUser}`)
                .addFields(
                    { name: "New Balance", value: formatCoins(result.balance, config.currencyName), inline: true },
                    { name: "Reason", value: reason, inline: false }
                )
                .setFooter({ text: `Admin: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === "set") {
            setBalance(interaction.guildId, targetUser.id, amount);

            addBalance(interaction.guildId, targetUser.id, 0, {
                type: "admin_set",
                reason: reason,
                metadata: { adminId: interaction.user.id, newBalance: amount },
            });

            const embed = new EmbedBuilder()
                .setColor(ECONOMY_EMBED_COLOR)
                .setTitle("Balance Set")
                .setDescription(`Set ${targetUser}'s balance to **${formatCoins(amount, config.currencyName)}**`)
                .addFields(
                    { name: "New Balance", value: formatCoins(amount, config.currencyName), inline: true },
                    { name: "Reason", value: reason, inline: false }
                )
                .setFooter({ text: `Admin: ${interaction.user.username}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    },
};
