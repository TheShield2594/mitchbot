const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { ECONOMY_EMBED_COLOR, formatCoins, getBalance, getEconomyConfig, initEconomy } = require("../../utils/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Check a user's balance for this server")
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("The user to check")
        ),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Balances are only available inside servers.",
                ephemeral: true,
            });
            return;
        }

        await initEconomy();

        const target = interaction.options.getUser("user") || interaction.user;
        const balance = getBalance(interaction.guildId, target.id);
        const config = getEconomyConfig(interaction.guildId);

        const embed = new EmbedBuilder()
            .setColor(ECONOMY_EMBED_COLOR)
            .setTitle("Server Balance")
            .setDescription(`**${target.username}** has **${formatCoins(balance, config.currencyName)}**.`)
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
