const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    getBalance,
    addBalance,
    formatCoins,
} = require("../../utils/economy");
const { validateGamblingCommand } = require("../../utils/gamblingValidation");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mysterybox")
        .setDescription("Open a mystery box - you might win big, lose, or get nothing!")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Amount to spend on the mystery box")
                .setRequired(true)
                .setMinValue(1)
        ),
    async execute(interaction) {
        const betAmount = interaction.options.getInteger("amount");

        // Validate gambling command
        const config = await validateGamblingCommand(interaction, betAmount);
        if (!config) return;

        // Define mystery box outcomes with probabilities
        const outcomes = [
            // Jackpot (2%)
            {
                name: "💎 JACKPOT!",
                multiplier: 10,
                chance: 0.02,
                color: "#f1c40f",
                description: "You found the legendary treasure!"
            },
            // Big Win (8%)
            {
                name: "🎉 Big Win!",
                multiplier: 5,
                chance: 0.08,
                color: "#2ecc71",
                description: "The box was filled with gold!"
            },
            // Good Win (15%)
            {
                name: "✨ Nice Find!",
                multiplier: 3,
                chance: 0.15,
                color: "#3498db",
                description: "You found some valuable items!"
            },
            // Small Win (25%)
            {
                name: "😊 Small Win",
                multiplier: 1.5,
                chance: 0.25,
                color: "#95a5a6",
                description: "Not bad, you got a little something!"
            },
            // Nothing (20%)
            {
                name: "📦 Empty Box",
                multiplier: 1,
                chance: 0.20,
                color: "#95a5a6",
                description: "The box was empty. Money refunded."
            },
            // Small Loss (15%)
            {
                name: "😬 Trap!",
                multiplier: 0.5,
                chance: 0.15,
                color: "#e67e22",
                description: "A trap was inside! You lost some coins."
            },
            // Big Loss (10%)
            {
                name: "💥 Explosion!",
                multiplier: 0,
                chance: 0.10,
                color: "#e74c3c",
                description: "The box exploded! You lost everything."
            },
            // Curse (5%)
            {
                name: "👻 CURSED!",
                multiplier: -0.5,
                chance: 0.05,
                color: "#9b59b6",
                description: "A curse doubled your losses!"
            },
        ];

        // Roll for outcome
        const roll = Math.random();
        let cumulativeChance = 0;
        let result = outcomes[outcomes.length - 1]; // Default to last outcome

        for (const outcome of outcomes) {
            cumulativeChance += outcome.chance;
            if (roll < cumulativeChance) {
                result = outcome;
                break;
            }
        }

        // Calculate winnings/losses
        let winnings;
        if (result.multiplier >= 1) {
            // Win or break even
            winnings = Math.floor(betAmount * (result.multiplier - 1));
        } else if (result.multiplier > 0) {
            // Partial loss
            winnings = -Math.floor(betAmount * (1 - result.multiplier));
        } else {
            // Total loss (multiplier = 0)
            winnings = -betAmount;
        }

        // Special case: cursed (lose more than bet)
        if (result.multiplier < 0) {
            winnings = -Math.floor(betAmount * (1 + Math.abs(result.multiplier)));
        }

        // Update balance
        addBalance(interaction.guildId, interaction.user.id, winnings, {
            type: "mysterybox",
            action: winnings >= 0 ? "won" : "lost",
            bet: betAmount,
            outcome: result.name,
            multiplier: result.multiplier,
            reason: `Mystery Box ${result.name}`,
        });

        const newBalance = getBalance(interaction.guildId, interaction.user.id);

        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(result.color)
            .setTitle(result.name)
            .setDescription(
                `🎁 You opened a mystery box...\n\n` +
                `${result.description}\n\n` +
                `${winnings > 0
                    ? `**You won ${formatCoins(winnings, config.currencyName)}!**`
                    : winnings === 0
                        ? `**You got your money back!**`
                        : `**You lost ${formatCoins(Math.abs(winnings), config.currencyName)}.**`
                }`
            )
            .addFields(
                { name: "Box Cost", value: formatCoins(betAmount, config.currencyName), inline: true },
                { name: "Multiplier", value: `${result.multiplier}x`, inline: true },
                { name: "New Balance", value: formatCoins(newBalance, config.currencyName), inline: true }
            )
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
