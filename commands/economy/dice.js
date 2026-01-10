const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    getBalance,
    addBalance,
    formatCoins,
} = require("../../utils/economy");
const { validateGamblingCommand } = require("../../utils/gamblingValidation");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dice")
        .setDescription("Roll the dice and bet on the outcome")
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
                    { name: "Number 1 (6x payout)", value: "1" },
                    { name: "Number 2 (6x payout)", value: "2" },
                    { name: "Number 3 (6x payout)", value: "3" },
                    { name: "Number 4 (6x payout)", value: "4" },
                    { name: "Number 5 (6x payout)", value: "5" },
                    { name: "Number 6 (6x payout)", value: "6" },
                    { name: "Low (1-3) (2x payout)", value: "low" },
                    { name: "High (4-6) (2x payout)", value: "high" },
                    { name: "Even (2,4,6) (2x payout)", value: "even" },
                    { name: "Odd (1,3,5) (2x payout)", value: "odd" }
                )
        ),
    async execute(interaction) {
        const betAmount = interaction.options.getInteger("amount");
        const userBet = interaction.options.getString("bet");

        // Validate gambling command
        const config = await validateGamblingCommand(interaction, betAmount);
        if (!config) return;

        // Roll the dice (1-6)
        const diceRoll = Math.floor(Math.random() * 6) + 1;

        // Determine if won and multiplier
        let won = false;
        let multiplier = 0;
        let betDescription = "";

        // Check specific number (6x payout)
        if (["1", "2", "3", "4", "5", "6"].includes(userBet)) {
            won = diceRoll === parseInt(userBet);
            multiplier = won ? 6 : 0;
            betDescription = `Number ${userBet}`;
        }
        // Check low (2x payout)
        else if (userBet === "low") {
            won = diceRoll >= 1 && diceRoll <= 3;
            multiplier = won ? 2 : 0;
            betDescription = "Low (1-3)";
        }
        // Check high (2x payout)
        else if (userBet === "high") {
            won = diceRoll >= 4 && diceRoll <= 6;
            multiplier = won ? 2 : 0;
            betDescription = "High (4-6)";
        }
        // Check even (2x payout)
        else if (userBet === "even") {
            won = diceRoll % 2 === 0;
            multiplier = won ? 2 : 0;
            betDescription = "Even";
        }
        // Check odd (2x payout)
        else if (userBet === "odd") {
            won = diceRoll % 2 === 1;
            multiplier = won ? 2 : 0;
            betDescription = "Odd";
        }

        // Calculate winnings/losses
        const winnings = won ? betAmount * (multiplier - 1) : -betAmount;

        // Update balance
        addBalance(interaction.guildId, interaction.user.id, winnings, {
            type: "dice",
            action: won ? "won" : "lost",
            bet: betAmount,
            choice: userBet,
            result: diceRoll,
            multiplier: multiplier,
            reason: `Dice ${won ? "win" : "loss"}`,
        });

        const newBalance = getBalance(interaction.guildId, interaction.user.id);

        // Dice emoji mapping
        const diceEmoji = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(won ? "#2ecc71" : "#e74c3c")
            .setTitle(won ? "🎉 You Won!" : "💸 You Lost!")
            .setDescription(
                `🎲 The dice rolled: **${diceEmoji[diceRoll]} ${diceRoll}**\n\n` +
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
