const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    getBalance,
    addBalance,
    formatCoins,
} = require("../../utils/economy");
const { validateGamblingCommand } = require("../../utils/gamblingValidation");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("coinflip")
        .setDescription("Flip a coin and double your bet if you guess correctly")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Amount to bet")
                .setRequired(true)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option
                .setName("choice")
                .setDescription("Choose heads or tails")
                .setRequired(true)
                .addChoices(
                    { name: "Heads", value: "heads" },
                    { name: "Tails", value: "tails" }
                )
        ),
    async execute(interaction) {
        const betAmount = interaction.options.getInteger("amount");
        const userChoice = interaction.options.getString("choice");

        // Validate gambling command (checks guild, balance, initializes economy)
        const config = await validateGamblingCommand(interaction, betAmount);
        if (!config) return;

        // Flip the coin
        const coinResult = Math.random() < 0.5 ? "heads" : "tails";
        const won = coinResult === userChoice;

        // Calculate winnings/losses
        const winnings = won ? betAmount : -betAmount;

        // Update balance
        addBalance(interaction.guildId, interaction.user.id, winnings, {
            type: "coinflip",
            action: won ? "won" : "lost",
            bet: betAmount,
            choice: userChoice,
            result: coinResult,
            reason: `Coinflip ${won ? "win" : "loss"}`,
        });

        const newBalance = getBalance(interaction.guildId, interaction.user.id);

        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(won ? "#2ecc71" : "#e74c3c")
            .setTitle(won ? "🎉 You Won!" : "💸 You Lost!")
            .setDescription(
                `The coin landed on **${coinResult}**!\n\n` +
                `You chose: **${userChoice}**\n` +
                `${won
                    ? `You won **${formatCoins(betAmount, config.currencyName)}**!`
                    : `You lost **${formatCoins(betAmount, config.currencyName)}**.`
                }`
            )
            .addFields(
                { name: "Bet Amount", value: formatCoins(betAmount, config.currencyName), inline: true },
                { name: "New Balance", value: formatCoins(newBalance, config.currencyName), inline: true }
            )
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
