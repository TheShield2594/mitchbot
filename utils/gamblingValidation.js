const { EmbedBuilder } = require("discord.js");
const {
    getBalance,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    getEconomyConfig,
    initEconomy,
} = require("./economy");

/**
 * Validates a gambling command and ensures the user has sufficient balance
 * @param {import('discord.js').CommandInteraction} interaction - The command interaction
 * @param {number} betAmount - The amount the user wants to bet
 * @returns {Promise<Object|null>} The economy config if valid, null if validation fails (already replied to user)
 */
async function validateGamblingCommand(interaction, betAmount) {
    // Ensure command is in a guild
    if (!interaction.guildId) {
        await interaction.reply({
            content: "Gambling commands are only available inside servers.",
            ephemeral: true,
        });
        return null;
    }

    // Initialize economy system
    await initEconomy();

    // Get economy config
    const config = getEconomyConfig(interaction.guildId);

    // Check balance
    const currentBalance = getBalance(interaction.guildId, interaction.user.id);
    if (currentBalance < betAmount) {
        const embed = new EmbedBuilder()
            .setColor(ECONOMY_EMBED_COLOR)
            .setTitle("Insufficient Balance")
            .setDescription(`You need ${formatCoins(betAmount, config.currencyName)} to play, but you only have ${formatCoins(currentBalance, config.currencyName)}.`)
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return null;
    }

    return config;
}

module.exports = {
    validateGamblingCommand,
};
