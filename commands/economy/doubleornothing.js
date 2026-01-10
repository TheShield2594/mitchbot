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

function createGameEmbed(game, config, guildName) {
    const embed = new EmbedBuilder()
        .setColor("#f39c12")
        .setTitle("🎲 Double or Nothing")
        .setDescription(
            `**Current Winnings:** ${formatCoins(game.currentWinnings, config.currencyName)}\n` +
            `**Round:** ${game.round}\n` +
            `**Success Rate:** ${(game.successChance * 100).toFixed(0)}%\n\n` +
            `Will you risk it all to double your winnings?`
        )
        .addFields(
            { name: "Original Bet", value: formatCoins(game.originalBet, config.currencyName), inline: true },
            { name: "Current Value", value: formatCoins(game.currentWinnings, config.currencyName), inline: true },
            { name: "If You Win", value: formatCoins(game.currentWinnings * 2, config.currencyName), inline: true }
        )
        .setFooter({ text: `Guild: ${guildName}` })
        .setTimestamp();

    return embed;
}

const data = new SlashCommandBuilder()
    .setName("doubleornothing")
    .setDescription("Risk everything to double your winnings - or lose it all!")
    .addIntegerOption(option =>
        option
            .setName("amount")
            .setDescription("Initial amount to bet")
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
            content: "You already have an active Double or Nothing game! Finish it first.",
            ephemeral: true,
        });
        return;
    }

    // Deduct bet immediately
    addBalance(interaction.guildId, interaction.user.id, -betAmount, {
        type: "doubleornothing",
        action: "bet_placed",
        bet: betAmount,
        reason: "Double or Nothing bet placed",
    });

    try {
        // Initialize game with 55% success chance for first round
        const game = {
            originalBet: betAmount,
            currentWinnings: betAmount,
            round: 1,
            successChance: 0.55, // 55% chance for round 1
            guildId: interaction.guildId,
            userId: interaction.user.id,
        };

        activeGames.set(gameId, game);

        // Create buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`don_double_${gameId}`)
                    .setLabel("🎲 Double It!")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`don_cashout_${gameId}`)
                    .setLabel("💰 Take Winnings")
                    .setStyle(ButtonStyle.Success)
            );

        const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown");
        await interaction.reply({ embeds: [embed], components: [row] });

        // Set timeout to auto-cash out after 2 minutes
        const timeoutId = setTimeout(async () => {
            if (activeGames.has(gameId)) {
                const expiredGame = activeGames.get(gameId);
                activeGames.delete(gameId);

                // Award current winnings
                addBalance(expiredGame.guildId, expiredGame.userId, expiredGame.currentWinnings, {
                    type: "doubleornothing",
                    action: "auto_cashout",
                    winnings: expiredGame.currentWinnings,
                    reason: "Double or Nothing auto cash-out (timeout)",
                });

                const newBalance = getBalance(expiredGame.guildId, expiredGame.userId);
                const profit = expiredGame.currentWinnings - expiredGame.originalBet;

                const embed = new EmbedBuilder()
                    .setColor("#f39c12")
                    .setTitle("⏱️ Auto Cash-Out (Timeout)")
                    .setDescription(
                        `Your game timed out and you were automatically cashed out.\\n\\n` +
                        `**Original Bet:** ${formatCoins(expiredGame.originalBet, config.currencyName)}\\n` +
                        `**Final Winnings:** ${formatCoins(expiredGame.currentWinnings, config.currencyName)}\\n` +
                        `**Profit:** ${formatCoins(profit, config.currencyName)}\\n` +
                        `**Rounds Survived:** ${expiredGame.round}`
                    )
                    .addFields({ name: "New Balance", value: formatCoins(newBalance, config.currencyName) })
                    .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                    .setTimestamp();

                try {
                    await interaction.editReply({ embeds: [embed], components: [] });
                } catch (error) {
                    logger.warn("Failed to update game timeout message", {
                        gameId,
                        error,
                    });
                }
            }
        }, 120000);

        game.timeoutId = timeoutId;
    } catch (error) {
        // Refund bet on any error during game setup
        addBalance(interaction.guildId, interaction.user.id, betAmount, {
            type: "doubleornothing",
            action: "refund_on_error",
            bet: betAmount,
            reason: "Refund due to error during game initialization",
        });

        logger.error("Error initializing Double or Nothing game", {
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
async function handleDoubleOrNothingButton(interaction) {
    if (!interaction.customId.startsWith("don_")) return false;

    const match = interaction.customId.match(/^don_(double|cashout)_(.+)$/);

    if (!match) {
        logger.error("Invalid doubleornothing customId format", {
            customId: interaction.customId,
            userId: interaction.user.id,
        });
        return false;
    }

    const action = match[1];
    const gameId = match[2];

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

    if (action === "cashout") {
        // Cash out current winnings
        addBalance(game.guildId, game.userId, game.currentWinnings, {
            type: "doubleornothing",
            action: "cashout",
            winnings: game.currentWinnings,
            rounds: game.round,
            reason: "Double or Nothing cash-out",
        });

        const newBalance = getBalance(game.guildId, game.userId);
        const profit = game.currentWinnings - game.originalBet;

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("💰 Cashed Out!")
            .setDescription(
                `You played it safe and walked away with your winnings!\n\n` +
                `**Original Bet:** ${formatCoins(game.originalBet, config.currencyName)}\n` +
                `**Final Winnings:** ${formatCoins(game.currentWinnings, config.currencyName)}\n` +
                `**Profit:** ${formatCoins(profit, config.currencyName)}\n` +
                `**Rounds Survived:** ${game.round}`
            )
            .addFields({ name: "New Balance", value: formatCoins(newBalance, config.currencyName) })
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        if (game.timeoutId) clearTimeout(game.timeoutId);
        activeGames.delete(gameId);
        await interaction.update({ embeds: [embed], components: [] });
        return true;
    }

    // Player chose to double
    const success = Math.random() < game.successChance;

    if (success) {
        // Won - double the winnings and continue
        const previousWinnings = game.currentWinnings;
        game.currentWinnings *= 2;
        game.round++;
        // Decrease success chance each round (gets harder)
        game.successChance = Math.max(0.25, game.successChance - 0.05);

        // Log the successful double
        logTransaction(game.guildId, {
            userId: game.userId,
            amount: 0,
            balanceAfter: getBalance(game.guildId, game.userId),
            type: "doubleornothing",
            action: "doubled",
            reason: `Double or Nothing - round ${game.round - 1} won`,
            metadata: {
                bet: game.originalBet,
                round: game.round - 1,
                previousWinnings,
                newWinnings: game.currentWinnings,
                newSuccessChance: game.successChance,
            },
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`don_double_${gameId}`)
                    .setLabel("🎲 Double It!")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`don_cashout_${gameId}`)
                    .setLabel("💰 Take Winnings")
                    .setStyle(ButtonStyle.Success)
            );

        const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown")
            .setColor("#2ecc71")
            .setDescription(
                `🎉 **SUCCESS!** You doubled your winnings!\n\n` +
                `**Current Winnings:** ${formatCoins(game.currentWinnings, config.currencyName)}\n` +
                `**Round:** ${game.round}\n` +
                `**Success Rate:** ${(game.successChance * 100).toFixed(0)}%\n\n` +
                `Keep going or cash out now?`
            );

        await interaction.update({ embeds: [embed], components: [row] });
    } else {
        // Lost - lose everything
        const embed = new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle("💥 You Lost Everything!")
            .setDescription(
                `The gamble didn't pay off...\n\n` +
                `**Original Bet:** ${formatCoins(game.originalBet, config.currencyName)}\n` +
                `**Lost Winnings:** ${formatCoins(game.currentWinnings, config.currencyName)}\n` +
                `**Rounds Survived:** ${game.round - 1}`
            )
            .addFields({
                name: "New Balance",
                value: formatCoins(getBalance(game.guildId, game.userId), config.currencyName)
            })
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        logTransaction(game.guildId, {
            userId: game.userId,
            amount: -game.originalBet,
            balanceAfter: getBalance(game.guildId, game.userId),
            type: "doubleornothing",
            action: "lost",
            reason: "Double or Nothing - lost everything",
            metadata: {
                bet: game.originalBet,
                rounds: game.round,
                lostWinnings: game.currentWinnings,
            },
        });

        if (game.timeoutId) clearTimeout(game.timeoutId);
        activeGames.delete(gameId);
        await interaction.update({ embeds: [embed], components: [] });
    }

    return true;
}

module.exports = {
    data,
    execute,
    handleDoubleOrNothingButton,
};
