const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    getBalance,
    addBalance,
    formatCoins,
} = require("../../utils/economy");
const { validateGamblingCommand } = require("../../utils/gamblingValidation");

// Roulette wheel numbers and their colors
// 0 is green (house), 1-36 are alternating red/black
const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

function getNumberColor(number) {
    if (number === 0) return "green";
    if (redNumbers.includes(number)) return "red";
    if (blackNumbers.includes(number)) return "black";
    return "unknown";
}

function getColorEmoji(color) {
    if (color === "red") return "🔴";
    if (color === "black") return "⚫";
    if (color === "green") return "🟢";
    return "⚪";
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roulette")
        .setDescription("Spin the roulette wheel and bet on the outcome!")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Amount to bet")
                .setRequired(true)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option
                .setName("bet")
                .setDescription("What to bet on")
                .setRequired(true)
                .addChoices(
                    { name: "Red (2x payout)", value: "red" },
                    { name: "Black (2x payout)", value: "black" },
                    { name: "Odd (2x payout)", value: "odd" },
                    { name: "Even (2x payout)", value: "even" },
                    { name: "Low (1-18) (2x payout)", value: "low" },
                    { name: "High (19-36) (2x payout)", value: "high" },
                    { name: "First Dozen (1-12) (3x payout)", value: "dozen1" },
                    { name: "Second Dozen (13-24) (3x payout)", value: "dozen2" },
                    { name: "Third Dozen (25-36) (3x payout)", value: "dozen3" },
                    { name: "Number 0 (36x payout)", value: "0" }
                )
        )
        .addIntegerOption(option =>
            option
                .setName("number")
                .setDescription("Bet on a specific number 1-36 (36x payout)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(36)
        ),
    async execute(interaction) {
        const betAmount = interaction.options.getInteger("amount");
        const userBet = interaction.options.getString("bet");
        const specificNumber = interaction.options.getInteger("number");

        // Validate gambling command
        const config = await validateGamblingCommand(interaction, betAmount);
        if (!config) return;

        // Spin the wheel (0-36)
        const spinResult = Math.floor(Math.random() * 37);
        const resultColor = getNumberColor(spinResult);
        const isOdd = spinResult !== 0 && spinResult % 2 === 1;
        const isEven = spinResult !== 0 && spinResult % 2 === 0;

        // Determine if won and multiplier
        let won = false;
        let multiplier = 0;
        let betDescription = "";

        // Handle specific number bet (passed as option)
        if (specificNumber !== null) {
            won = spinResult === specificNumber;
            multiplier = won ? 36 : 0;
            betDescription = `Number ${specificNumber}`;
        }
        // Handle string bet choices
        else if (userBet === "red") {
            won = resultColor === "red";
            multiplier = won ? 2 : 0;
            betDescription = "Red";
        } else if (userBet === "black") {
            won = resultColor === "black";
            multiplier = won ? 2 : 0;
            betDescription = "Black";
        } else if (userBet === "odd") {
            won = isOdd;
            multiplier = won ? 2 : 0;
            betDescription = "Odd";
        } else if (userBet === "even") {
            won = isEven;
            multiplier = won ? 2 : 0;
            betDescription = "Even";
        } else if (userBet === "low") {
            won = spinResult >= 1 && spinResult <= 18;
            multiplier = won ? 2 : 0;
            betDescription = "Low (1-18)";
        } else if (userBet === "high") {
            won = spinResult >= 19 && spinResult <= 36;
            multiplier = won ? 2 : 0;
            betDescription = "High (19-36)";
        } else if (userBet === "dozen1") {
            won = spinResult >= 1 && spinResult <= 12;
            multiplier = won ? 3 : 0;
            betDescription = "First Dozen (1-12)";
        } else if (userBet === "dozen2") {
            won = spinResult >= 13 && spinResult <= 24;
            multiplier = won ? 3 : 0;
            betDescription = "Second Dozen (13-24)";
        } else if (userBet === "dozen3") {
            won = spinResult >= 25 && spinResult <= 36;
            multiplier = won ? 3 : 0;
            betDescription = "Third Dozen (25-36)";
        } else if (userBet === "0") {
            won = spinResult === 0;
            multiplier = won ? 36 : 0;
            betDescription = "Number 0";
        }

        // Calculate winnings/losses
        const winnings = won ? betAmount * (multiplier - 1) : -betAmount;

        // Update balance
        addBalance(interaction.guildId, interaction.user.id, winnings, {
            type: "roulette",
            action: won ? "won" : "lost",
            bet: betAmount,
            choice: specificNumber !== null ? `number_${specificNumber}` : userBet,
            result: spinResult,
            multiplier: multiplier,
            reason: `Roulette ${won ? "win" : "loss"}`,
        });

        const newBalance = getBalance(interaction.guildId, interaction.user.id);

        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(won ? "#2ecc71" : "#e74c3c")
            .setTitle(won ? "🎉 You Won!" : "💸 You Lost!")
            .setDescription(
                `🎰 The wheel landed on: ${getColorEmoji(resultColor)} **${spinResult}** (${resultColor})\n\n` +
                `You bet on: **${betDescription}**\n` +
                `${won
                    ? `You won **${formatCoins(Math.abs(winnings), config.currencyName)}** (${multiplier}x)!`
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
