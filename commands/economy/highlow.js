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
    const multiplier = 1 + (game.streak * 0.5); // 1x, 1.5x, 2x, 2.5x, etc.
    const potentialWin = Math.floor(game.bet * multiplier);

    const embed = new EmbedBuilder()
        .setColor(ECONOMY_EMBED_COLOR)
        .setTitle("📊 High or Low")
        .setDescription(
            `Current Number: **${game.currentNumber}**\n\n` +
            `Will the next number be **Higher** or **Lower**?\n` +
            `(Range: 1-100)`
        )
        .addFields(
            { name: "Streak", value: `🔥 ${game.streak}`, inline: true },
            { name: "Multiplier", value: `${multiplier.toFixed(1)}x`, inline: true },
            { name: "Potential Win", value: formatCoins(potentialWin, config.currencyName), inline: true }
        )
        .setFooter({ text: `Guild: ${guildName} | Cash out anytime!` })
        .setTimestamp();

    return embed;
}

const data = new SlashCommandBuilder()
    .setName("highlow")
    .setDescription("Guess if the next number is higher or lower - chain wins for bigger payouts!")
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
            content: "You already have an active High/Low game! Finish it first.",
            ephemeral: true,
        });
        return;
    }

    // Deduct bet immediately
    addBalance(interaction.guildId, interaction.user.id, -betAmount, {
        type: "highlow",
        action: "bet_placed",
        bet: betAmount,
        reason: "High/Low bet placed",
    });

    try {
        // Initialize game
        const game = {
            currentNumber: Math.floor(Math.random() * 100) + 1,
            bet: betAmount,
            streak: 0,
            guildId: interaction.guildId,
            userId: interaction.user.id,
        };

        activeGames.set(gameId, game);

        // Create buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`highlow_higher_${gameId}`)
                    .setLabel("⬆️ Higher")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`highlow_lower_${gameId}`)
                    .setLabel("⬇️ Lower")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`highlow_cashout_${gameId}`)
                    .setLabel("💰 Cash Out")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(game.streak === 0) // Can't cash out on first round
            );

        const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown");
        await interaction.reply({ embeds: [embed], components: [row] });

        // Set timeout to auto-forfeit and refund after 2 minutes
        const timeoutId = setTimeout(async () => {
            if (activeGames.has(gameId)) {
                const expiredGame = activeGames.get(gameId);
                activeGames.delete(gameId);

                // Refund the bet
                addBalance(expiredGame.guildId, expiredGame.userId, expiredGame.bet, {
                    type: "highlow",
                    action: "game_expired_refund",
                    bet: expiredGame.bet,
                    reason: "High/Low game expired - bet refunded",
                });

                try {
                    await interaction.followUp({
                        content: `⏱️ Your High/Low game expired due to inactivity. Your bet of ${formatCoins(expiredGame.bet, config.currencyName)} has been refunded.`,
                        ephemeral: true,
                    });
                } catch (error) {
                    logger.warn("Failed to send game expiration notification", {
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
            type: "highlow",
            action: "refund_on_error",
            bet: betAmount,
            reason: "Refund due to error during game initialization",
        });

        logger.error("Error initializing High/Low game", {
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
async function handleHighLowButton(interaction) {
    if (!interaction.customId.startsWith("highlow_")) return false;

    const match = interaction.customId.match(/^highlow_(higher|lower|cashout)_(.+)$/);

    if (!match) {
        logger.error("Invalid highlow customId format", {
            customId: interaction.customId,
            userId: interaction.user.id,
        });
        return false;
    }

    const action = match[1];
    const gameId = match[2];

    if (!activeGames.has(gameId)) {
        await interaction.update({
            content: "This game has expired. Start a new game with `/highlow`.",
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
        const multiplier = 1 + (game.streak * 0.5);
        const winnings = Math.floor(game.bet * multiplier);

        addBalance(game.guildId, game.userId, winnings, {
            type: "highlow",
            action: "cashout",
            bet: game.bet,
            streak: game.streak,
            winnings,
            reason: "High/Low cash out",
        });

        const newBalance = getBalance(game.guildId, game.userId);
        const embed = new EmbedBuilder()
            .setColor("#f39c12")
            .setTitle("💰 Cashed Out!")
            .setDescription(
                `You cashed out with a **${game.streak}** win streak!\n\n` +
                `Multiplier: **${multiplier.toFixed(1)}x**\n` +
                `Winnings: **${formatCoins(winnings, config.currencyName)}**`
            )
            .addFields({ name: "New Balance", value: formatCoins(newBalance, config.currencyName) })
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        if (game.timeoutId) clearTimeout(game.timeoutId);
        activeGames.delete(gameId);
        await interaction.update({ embeds: [embed], components: [] });
        return true;
    }

    // Generate next number
    const nextNumber = Math.floor(Math.random() * 100) + 1;
    let won = false;

    if (action === "higher") {
        won = nextNumber > game.currentNumber;
    } else if (action === "lower") {
        won = nextNumber < game.currentNumber;
    }

    // Handle tie (next number equals current number) - count as loss
    if (nextNumber === game.currentNumber) {
        won = false;
    }

    if (won) {
        // Correct guess - increase streak and continue
        game.streak++;
        game.currentNumber = nextNumber;

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`highlow_higher_${gameId}`)
                    .setLabel("⬆️ Higher")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`highlow_lower_${gameId}`)
                    .setLabel("⬇️ Lower")
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`highlow_cashout_${gameId}`)
                    .setLabel("💰 Cash Out")
                    .setStyle(ButtonStyle.Secondary)
            );

        const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown")
            .setColor("#2ecc71")
            .setDescription(
                `✅ **Correct!** The number was **${nextNumber}**\n\n` +
                `Current Number: **${game.currentNumber}**\n\n` +
                `Will the next number be **Higher** or **Lower**?\n` +
                `(Range: 1-100)`
            );

        await interaction.update({ embeds: [embed], components: [row] });
    } else {
        // Wrong guess - lose bet
        const embed = new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle("❌ Wrong Guess!")
            .setDescription(
                `The number was **${nextNumber}** (you guessed ${action}).\n\n` +
                `Previous number: **${game.currentNumber}**\n` +
                `Your **${game.streak}** win streak has ended.\n\n` +
                `You lost **${formatCoins(game.bet, config.currencyName)}**.`
            )
            .addFields({
                name: "New Balance",
                value: formatCoins(getBalance(game.guildId, game.userId), config.currencyName)
            })
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        logTransaction(game.guildId, {
            userId: game.userId,
            amount: -game.bet,
            balanceAfter: getBalance(game.guildId, game.userId),
            type: "highlow",
            action: "loss",
            reason: "High/Low loss",
            metadata: { bet: game.bet, streak: game.streak },
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
    handleHighLowButton,
};
