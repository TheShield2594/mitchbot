const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    transferCoins,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("give")
        .setDescription("Give currency to another user")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to give currency to")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("amount")
                .setDescription("Amount of currency to give")
                .setRequired(true)
                .setMinValue(1)
        ),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Currency transfers are only available inside servers.",
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

        const recipient = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");

        // Prevent giving to self
        if (recipient.id === interaction.user.id) {
            await interaction.reply({
                content: "You cannot give currency to yourself!",
                ephemeral: true,
            });
            return;
        }

        // Prevent giving to bots
        if (recipient.bot) {
            await interaction.reply({
                content: "You cannot give currency to bots!",
                ephemeral: true,
            });
            return;
        }

        const result = transferCoins(
            interaction.guildId,
            interaction.user.id,
            recipient.id,
            amount
        );

        if (!result.ok) {
            const embed = new EmbedBuilder()
                .setColor("#e74c3c")
                .setTitle("Transfer Failed")
                .setDescription(result.error || "Unable to complete the transfer.")
                .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                .setTimestamp();

            if (result.error === "Insufficient funds") {
                embed.addFields({
                    name: "Your balance",
                    value: formatCoins(result.balance, config.currencyName),
                    inline: true,
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(ECONOMY_EMBED_COLOR)
            .setTitle("Transfer Complete")
            .setDescription(`You gave **${formatCoins(amount, config.currencyName)}** to ${recipient}!`)
            .addFields(
                {
                    name: "Your new balance",
                    value: formatCoins(result.fromBalance, config.currencyName),
                    inline: true,
                },
                {
                    name: `${recipient.username}'s new balance`,
                    value: formatCoins(result.toBalance, config.currencyName),
                    inline: true,
                }
            )
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
