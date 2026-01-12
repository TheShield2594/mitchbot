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
const { saveGame, removeGame } = require("../../utils/gameState");
const logger = require("../../utils/logger");

const CARD_SUITS = ["♠️", "♥️", "♣️", "♦️"];
const CARD_VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Active games storage (in-memory + persistent to disk)
const activeGames = new Map();

function createDeck() {
    const deck = [];
    for (const suit of CARD_SUITS) {
        for (const value of CARD_VALUES) {
            deck.push({ suit, value });
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function getCardValue(card) {
    if (card.value === "A") return 11;
    if (["J", "Q", "K"].includes(card.value)) return 10;
    return parseInt(card.value);
}

function calculateHand(cards) {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
        const value = getCardValue(card);
        total += value;
        if (card.value === "A") aces++;
    }

    // Adjust for aces
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}

function formatCard(card) {
    return `${card.value}${card.suit}`;
}

function formatHand(cards, hideFirst = false) {
    if (hideFirst) {
        return `🂠 ${cards.slice(1).map(formatCard).join(" ")}`;
    }
    return cards.map(formatCard).join(" ");
}

function createGameEmbed(game, config, guildName, gameOver = false) {
    const playerValue = calculateHand(game.playerHand);
    const dealerValue = calculateHand(game.dealerHand);

    const embed = new EmbedBuilder()
        .setColor(ECONOMY_EMBED_COLOR)
        .setTitle("🃏 Blackjack")
        .addFields(
            {
                name: "Your Hand",
                value: `${formatHand(game.playerHand)}\n**Total: ${playerValue}**`,
                inline: true
            },
            {
                name: "Dealer's Hand",
                value: gameOver
                    ? `${formatHand(game.dealerHand)}\n**Total: ${dealerValue}**`
                    : `${formatHand(game.dealerHand, true)}\n**Total: ?**`,
                inline: true
            }
        )
        .addFields({
            name: "Bet Amount",
            value: formatCoins(game.bet, config.currencyName),
            inline: true
        })
        .setFooter({ text: `Guild: ${guildName}` })
        .setTimestamp();

    return embed;
}

/**
 * Clean up game from both memory and persistent storage
 * @param {string} gameId - Game ID to clean up
 */
async function cleanupGame(gameId) {
    const game = activeGames.get(gameId);
    if (game?.timeoutId) {
        clearTimeout(game.timeoutId);
    }
    activeGames.delete(gameId);
    await removeGame(gameId).catch(err => {
        logger.warn('Failed to remove game from persistent storage', { gameId, error: err });
    });
}

const data = new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play blackjack against the dealer")
    .addIntegerOption(option =>
        option
            .setName("amount")
            .setDescription("Amount to bet")
            .setRequired(true)
            .setMinValue(1)
    );

async function execute(interaction) {
        // Discord API enforces setMinValue(1), so betAmount is guaranteed to be >= 1
        const betAmount = interaction.options.getInteger("amount");

        // Validate gambling command (checks guild, balance, initializes economy)
        const config = await validateGamblingCommand(interaction, betAmount);
        if (!config) return;

        const gameId = `${interaction.guildId}-${interaction.user.id}`;

        // Check if user already has an active game
        if (activeGames.has(gameId)) {
            await interaction.reply({
                content: "You already have an active blackjack game! Finish it first.",
                ephemeral: true,
            });
            return;
        }

        // Deduct bet immediately
        addBalance(interaction.guildId, interaction.user.id, -betAmount, {
            type: "blackjack",
            action: "bet_placed",
            bet: betAmount,
            reason: "Blackjack bet placed",
        });

        try {
        // Initialize game
        const deck = shuffleDeck(createDeck());
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];

        const game = {
            deck,
            playerHand,
            dealerHand,
            bet: betAmount,
            guildId: interaction.guildId,
            userId: interaction.user.id,
            gameType: 'blackjack',
            startedAt: Date.now(),
        };

        // Set immediately after game creation to prevent race condition
        activeGames.set(gameId, game);

        // Persist to disk to survive bot restarts
        await saveGame(gameId, game).catch(err => {
            logger.error('Failed to persist blackjack game', { gameId, error: err });
        });

        const playerValue = calculateHand(game.playerHand);
        const dealerValue = calculateHand(game.dealerHand);

        // Check for natural blackjack
        if (playerValue === 21) {
            if (dealerValue === 21) {
                // Push - return bet
                addBalance(interaction.guildId, interaction.user.id, betAmount, {
                    type: "blackjack",
                    action: "push",
                    bet: betAmount,
                    reason: "Blackjack push",
                });

                const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown", true)
                    .setDescription("🤝 **Push!** Both you and the dealer have blackjack.");

                activeGames.delete(gameId);
                await interaction.reply({ embeds: [embed] });
                return;
            }

            // Player blackjack - pay 2.5x
            const winnings = Math.floor(betAmount * 2.5);
            addBalance(interaction.guildId, interaction.user.id, winnings, {
                type: "blackjack",
                action: "blackjack_win",
                bet: betAmount,
                winnings,
                reason: "Blackjack natural win",
            });

            const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown", true)
                .setColor("#2ecc71")
                .setDescription(`🎉 **BLACKJACK!** You won ${formatCoins(winnings, config.currencyName)}!`);

            activeGames.delete(gameId);
            await interaction.reply({ embeds: [embed] });
            return;
        }

        // Create buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`blackjack_hit_${gameId}`)
                    .setLabel("Hit")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`blackjack_stand_${gameId}`)
                    .setLabel("Stand")
                    .setStyle(ButtonStyle.Success)
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
                        type: "blackjack",
                        action: "game_expired_refund",
                        bet: expiredGame.bet,
                        reason: "Blackjack game expired - bet refunded",
                    });

                    // Notify user
                    try {
                        await interaction.followUp({
                            content: `⏱️ Your blackjack game expired due to inactivity. Your bet of ${formatCoins(expiredGame.bet, config.currencyName)} has been refunded.`,
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

            // Store timeout ID on game object so it can be cleared when game ends
            game.timeoutId = timeoutId;
        } catch (error) {
            // Refund bet on any error during game setup
            addBalance(interaction.guildId, interaction.user.id, betAmount, {
                type: "blackjack",
                action: "refund_on_error",
                bet: betAmount,
                reason: "Refund due to error during game initialization",
            });

            logger.error("Error initializing blackjack game", {
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

// Handle button interactions (this needs to be registered in interactionCreate event)
async function handleBlackjackButton(interaction) {
    if (!interaction.customId.startsWith("blackjack_")) return false;

    // Parse customId with regex to allow underscores in gameId
    const match = interaction.customId.match(/^blackjack_(hit|stand)_(.+)$/);

    if (!match) {
        logger.error("Invalid blackjack customId format", {
            customId: interaction.customId,
            userId: interaction.user.id,
        });
        return false;
    }

    const action = match[1];
    const gameId = match[2];

    if (!activeGames.has(gameId)) {
        await interaction.update({
            content: "This game has expired. Start a new game with `/blackjack`.",
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

    if (action === "hit") {
        // Deal another card to player
        game.playerHand.push(game.deck.pop());
        const playerValue = calculateHand(game.playerHand);

        if (playerValue > 21) {
            // Bust - player loses (bet already deducted)
            const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown", true)
                .setColor("#e74c3c")
                .setDescription(`💥 **BUST!** You went over 21. You lost ${formatCoins(game.bet, config.currencyName)}.`);

            // Clear timeout before deleting game
            if (game.timeoutId) clearTimeout(game.timeoutId);
            activeGames.delete(gameId);
            await interaction.update({ embeds: [embed], components: [] });

            // Zero amount used intentionally for audit/logging — no balance change
            logTransaction(game.guildId, {
                userId: game.userId,
                amount: -game.bet,
                balanceAfter: getBalance(game.guildId, game.userId),
                type: "blackjack",
                action: "bust",
                reason: "Blackjack bust",
                metadata: { bet: game.bet },
            });
        } else {
            // Continue game
            const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown");
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`blackjack_hit_${gameId}`)
                        .setLabel("Hit")
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`blackjack_stand_${gameId}`)
                        .setLabel("Stand")
                        .setStyle(ButtonStyle.Success)
                );

            await interaction.update({ embeds: [embed], components: [row] });
        }
    } else if (action === "stand") {
        // Dealer's turn
        let dealerValue = calculateHand(game.dealerHand);

        while (dealerValue < 17) {
            game.dealerHand.push(game.deck.pop());
            dealerValue = calculateHand(game.dealerHand);
        }

        const playerValue = calculateHand(game.playerHand);

        let resultMessage = "";
        let resultColor = ECONOMY_EMBED_COLOR;
        let winnings = 0;

        if (dealerValue > 21) {
            // Dealer bust - player wins
            winnings = game.bet * 2;
            resultMessage = `🎉 **Dealer BUST!** You won ${formatCoins(winnings, config.currencyName)}!`;
            resultColor = "#2ecc71";

            addBalance(game.guildId, game.userId, winnings, {
                type: "blackjack",
                action: "dealer_bust",
                bet: game.bet,
                winnings,
                reason: "Blackjack win (dealer bust)",
            });
        } else if (playerValue > dealerValue) {
            // Player wins
            winnings = game.bet * 2;
            resultMessage = `🎉 **You WIN!** You won ${formatCoins(winnings, config.currencyName)}!`;
            resultColor = "#2ecc71";

            addBalance(game.guildId, game.userId, winnings, {
                type: "blackjack",
                action: "win",
                bet: game.bet,
                winnings,
                reason: "Blackjack win",
            });
        } else if (playerValue === dealerValue) {
            // Push - return bet
            winnings = game.bet;
            resultMessage = `🤝 **Push!** Your bet has been returned.`;
            resultColor = ECONOMY_EMBED_COLOR;

            addBalance(game.guildId, game.userId, winnings, {
                type: "blackjack",
                action: "push",
                bet: game.bet,
                reason: "Blackjack push",
            });
        } else {
            // Player loses (bet already deducted)
            resultMessage = `💔 **You LOSE!** You lost ${formatCoins(game.bet, config.currencyName)}.`;
            resultColor = "#e74c3c";

            // Zero amount used intentionally for audit/logging — no balance change
            logTransaction(game.guildId, {
                userId: game.userId,
                amount: -game.bet,
                balanceAfter: getBalance(game.guildId, game.userId),
                type: "blackjack",
                action: "loss",
                reason: "Blackjack loss",
                metadata: { bet: game.bet },
            });
        }

        const newBalance = getBalance(game.guildId, game.userId);
        const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown", true)
            .setColor(resultColor)
            .setDescription(resultMessage)
            .addFields({ name: "New Balance", value: formatCoins(newBalance, config.currencyName), inline: true });

        // Clear timeout before deleting game
        if (game.timeoutId) clearTimeout(game.timeoutId);
        activeGames.delete(gameId);
        await interaction.update({ embeds: [embed], components: [] });
    }

    return true;
}

// Consolidated exports
module.exports = {
    data,
    execute,
    handleBlackjackButton,
};
