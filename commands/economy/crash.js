const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
    getBalance,
    addBalance,
    logTransaction,
    getEconomyConfig,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    initEconomy,
} = require("../../utils/economy");
const { validateGamblingCommand } = require("../../utils/gamblingValidation");
const logger = require("../../utils/logger");

// Active games storage (in-memory, resets on bot restart)
const activeGames = new Map();

function calculateCrashPoint() {
    // Generate crash point using exponential distribution
    // This creates realistic crash points: most between 1-3x, rare 10x+
    const e = Math.random();
    const crashPoint = Math.max(1.01, 0.99 / (1 - e));
    // Cap at 100x for sanity
    return Math.min(crashPoint, 100);
}

function createGameEmbed(game, config, guildName, crashed = false, cashedOut = false) {
    const currentMultiplier = crashed ? game.crashPoint : game.currentMultiplier;
    const potentialWin = Math.floor(game.bet * currentMultiplier);

    let description = "";
    if (crashed) {
        description = `💥 **CRASHED at ${game.crashPoint.toFixed(2)}x!**\n\n` +
            `You didn't cash out in time.\n` +
            `**Lost:** ${formatCoins(game.bet, config.currencyName)}`;
    } else if (cashedOut) {
        description = `✅ **Cashed out at ${game.currentMultiplier.toFixed(2)}x!**\n\n` +
            `**Won:** ${formatCoins(potentialWin, config.currencyName)}`;
    } else {
        description = `🚀 **Current Multiplier: ${currentMultiplier.toFixed(2)}x**\n\n` +
            `Potential win: ${formatCoins(potentialWin, config.currencyName)}\n` +
            `Cash out now or keep riding!`;
    }

    const embed = new EmbedBuilder()
        .setColor(crashed ? "#e74c3c" : cashedOut ? "#2ecc71" : "#f39c12")
        .setTitle(crashed ? "💥 Crash!" : cashedOut ? "💰 Cashed Out!" : "🚀 Crash Game")
        .setDescription(description)
        .addFields(
            { name: "Bet Amount", value: formatCoins(game.bet, config.currencyName), inline: true },
            { name: "Current Value", value: formatCoins(potentialWin, config.currencyName), inline: true }
        )
        .setFooter({ text: `Guild: ${guildName}` })
        .setTimestamp();

    return embed;
}

const data = new SlashCommandBuilder()
    .setName("crash")
    .setDescription("Bet on a rising multiplier - cash out before it crashes!")
    .addIntegerOption(option =>
        option
            .setName("amount")
            .setDescription("Amount to bet")
            .setRequired(true)
            .setMinValue(1)
    );

async function execute(interaction) {
    const betAmount = interaction.options.getInteger("amount");

    // Validate gambling command
    const config = await validateGamblingCommand(interaction, betAmount);
    if (!config) return;

    const gameId = `${interaction.guildId}-${interaction.user.id}`;

    // Check if user already has an active game
    if (activeGames.has(gameId)) {
        await interaction.reply({
            content: "You already have an active Crash game! Finish it first.",
            ephemeral: true,
        });
        return;
    }

    try {
        // Deduct bet immediately
        addBalance(interaction.guildId, interaction.user.id, -betAmount, {
            type: "crash",
            action: "bet_placed",
            bet: betAmount,
            reason: "Crash bet placed",
        });

        // Initialize game
        const crashPoint = calculateCrashPoint();
        const game = {
            currentMultiplier: 1.00,
            crashPoint: crashPoint,
            bet: betAmount,
            guildId: interaction.guildId,
            userId: interaction.user.id,
            updateCount: 0,
        };

        activeGames.set(gameId, game);

        // Create buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`crash_cashout_${gameId}`)
                    .setLabel("💰 Cash Out")
                    .setStyle(ButtonStyle.Success)
            );

        const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown");
        await interaction.reply({ embeds: [embed], components: [row] });

        // Start the multiplier increase loop
        const updateInterval = setInterval(async () => {
            if (!activeGames.has(gameId)) {
                clearInterval(updateInterval);
                return;
            }

            const currentGame = activeGames.get(gameId);
            currentGame.updateCount++;

            // Increase multiplier (faster at start, slower later)
            const increment = 0.05 + (Math.random() * 0.05);
            currentGame.currentMultiplier += increment;

            // Check if crashed
            if (currentGame.currentMultiplier >= currentGame.crashPoint) {
                // Game crashed - player loses
                const embed = createGameEmbed(currentGame, config, interaction.guild?.name || "Unknown", true);

                logTransaction(currentGame.guildId, {
                    userId: currentGame.userId,
                    amount: 0,
                    balanceAfter: getBalance(currentGame.guildId, currentGame.userId),
                    type: "crash",
                    action: "crashed",
                    reason: "Crash game - settlement, bet already deducted",
                    metadata: {
                        bet: currentGame.bet,
                        crashPoint: currentGame.crashPoint.toFixed(2),
                    },
                });

                clearInterval(updateInterval);
                activeGames.delete(gameId);

                try {
                    await interaction.editReply({ embeds: [embed], components: [] });
                } catch (error) {
                    logger.warn("Failed to update crashed game", { gameId, error });
                }
                return;
            }

            // Update message every 2 ticks (1 second)
            if (currentGame.updateCount % 2 === 0) {
                try {
                    const updatedEmbed = createGameEmbed(currentGame, config, interaction.guild?.name || "Unknown");
                    await interaction.editReply({ embeds: [updatedEmbed], components: [row] });
                } catch (error) {
                    logger.warn("Failed to update crash game", { gameId, error });
                    clearInterval(updateInterval);
                    activeGames.delete(gameId);
                }
            }
        }, 500); // Update every 500ms

        game.updateInterval = updateInterval;

        // Set maximum game time (30 seconds)
        setTimeout(async () => {
            if (activeGames.has(gameId)) {
                const expiredGame = activeGames.get(gameId);
                if (expiredGame.updateInterval) {
                    clearInterval(expiredGame.updateInterval);
                }
                activeGames.delete(gameId);

                // Log the loss
                logTransaction(expiredGame.guildId, {
                    userId: expiredGame.userId,
                    amount: 0,
                    balanceAfter: getBalance(expiredGame.guildId, expiredGame.userId),
                    type: "crash",
                    action: "timeout",
                    reason: "Crash game - timeout, bet lost",
                    metadata: {
                        bet: expiredGame.bet,
                        crashPoint: expiredGame.crashPoint.toFixed(2),
                        reachedMultiplier: expiredGame.currentMultiplier.toFixed(2),
                    },
                });

                // Notify player
                try {
                    const embed = new EmbedBuilder()
                        .setColor("#e74c3c")
                        .setTitle("⏱️ Game Timeout")
                        .setDescription(
                            `Your Crash game timed out after 30 seconds.\n\n` +
                            `**Final Multiplier:** ${expiredGame.currentMultiplier.toFixed(2)}x\n` +
                            `**Crash Point:** ${expiredGame.crashPoint.toFixed(2)}x\n` +
                            `**Bet Lost:** ${formatCoins(expiredGame.bet, config.currencyName)}`
                        )
                        .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed], components: [] });
                } catch (error) {
                    logger.warn("Failed to notify player of timeout", { gameId, error });
                }
            }
        }, 30000);

    } catch (error) {
        // Refund bet on any error during game setup
        addBalance(interaction.guildId, interaction.user.id, betAmount, {
            type: "crash",
            action: "refund_on_error",
            bet: betAmount,
            reason: "Refund due to error during game initialization",
        });

        logger.error("Error initializing Crash game", {
            guildId: interaction.guildId,
            userId: interaction.user.id,
            betAmount,
            error,
        });

        await interaction.reply({
            content: "An error occurred while starting the game. Your bet has been refunded.",
            ephemeral: true,
        });
    }
}

// Handle button interactions
async function handleCrashButton(interaction) {
    if (!interaction.customId.startsWith("crash_")) return false;

    const match = interaction.customId.match(/^crash_cashout_(.+)$/);

    if (!match) {
        logger.error("Invalid crash customId format", {
            customId: interaction.customId,
            userId: interaction.user.id,
        });
        return false;
    }

    const gameId = match[1];

    if (!activeGames.has(gameId)) {
        await interaction.update({
            content: "This game has expired or already been completed.",
            components: [],
            embeds: [],
        });
        return true;
    }

    const game = activeGames.get(gameId);

    // Verify it's the right player
    if (game.userId !== interaction.user.id) {
        await interaction.reply({
            content: "This isn't your game!",
            ephemeral: true,
        });
        return true;
    }

    await initEconomy();
    const config = getEconomyConfig(game.guildId);

    // Cash out - player wins
    const winnings = Math.floor(game.bet * game.currentMultiplier);

    addBalance(game.guildId, game.userId, winnings, {
        type: "crash",
        action: "cashout",
        bet: game.bet,
        multiplier: game.currentMultiplier,
        winnings,
        reason: "Crash game - cashed out",
    });

    const newBalance = getBalance(game.guildId, game.userId);
    const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown", false, true)
        .addFields({ name: "New Balance", value: formatCoins(newBalance, config.currencyName) });

    // Clear interval and remove game
    if (game.updateInterval) clearInterval(game.updateInterval);
    activeGames.delete(gameId);

    await interaction.update({ embeds: [embed], components: [] });
    return true;
}

module.exports = {
    data,
    execute,
    handleCrashButton,
};
