const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    getBalance,
    addBalance,
    formatCoins,
} = require("../../utils/economy");
const { validateGamblingCommand } = require("../../utils/gamblingValidation");

const SLOT_SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎", "7️⃣"];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("slots")
        .setDescription("Play the slot machine")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Amount to bet")
                .setRequired(true)
                .setMinValue(1)
        ),
    async execute(interaction) {
        const betAmount = interaction.options.getInteger("amount");

        // Validate gambling command (checks guild, balance, initializes economy)
        const config = await validateGamblingCommand(interaction, betAmount);
        if (!config) return;

        // Spin the slots
        const reel1 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        const reel2 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        const reel3 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];

        // Calculate winnings
        let multiplier = 0;
        let resultMessage = "";

        if (reel1 === reel2 && reel2 === reel3) {
            // All three match
            multiplier = 10;
            resultMessage = "🎰 **JACKPOT!** All three match!";
        } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
            // Two match
            multiplier = 2;
            resultMessage = "✨ Two symbols match!";
        } else {
            // No match
            multiplier = 0;
            resultMessage = "💔 No match. Better luck next time!";
        }

        const winnings = multiplier > 0 ? betAmount * multiplier - betAmount : -betAmount;
        const won = winnings > 0;

        // Update balance
        addBalance(interaction.guildId, interaction.user.id, winnings, {
            type: "slots",
            action: won ? "won" : "lost",
            bet: betAmount,
            reels: [reel1, reel2, reel3],
            multiplier,
            reason: `Slots ${won ? "win" : "loss"}`,
        });

        const newBalance = getBalance(interaction.guildId, interaction.user.id);

        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(won ? "#2ecc71" : "#e74c3c")
            .setTitle("🎰 Slot Machine")
            .setDescription(
                `╔═══════════╗\n` +
                `║ ${reel1}  ${reel2}  ${reel3} ║\n` +
                `╚═══════════╝\n\n` +
                `${resultMessage}\n\n` +
                `${won
                    ? `You won **${formatCoins(winnings, config.currencyName)}**! (${multiplier}x)`
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
