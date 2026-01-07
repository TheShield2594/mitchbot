const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
    getBalance,
    addBalance,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");

const CARD_SUITS = ["♠️", "♥️", "♣️", "♦️"];
const CARD_VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Active games storage (in-memory, resets on bot restart)
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blackjack")
        .setDescription("Play blackjack against the dealer")
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("Amount to bet")
                .setRequired(true)
                .setMinValue(1)
        ),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Blackjack is only available inside servers.",
                ephemeral: true,
            });
            return;
        }

        await initEconomy();

        const config = getEconomyConfig(interaction.guildId);
        const betAmount = interaction.options.getInteger("amount");
        const gameId = `${interaction.guildId}-${interaction.user.id}`;

        // Check if user already has an active game
        if (activeGames.has(gameId)) {
            await interaction.reply({
                content: "You already have an active blackjack game! Finish it first.",
                ephemeral: true,
            });
            return;
        }

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
            return;
        }

        // Deduct bet immediately
        addBalance(interaction.guildId, interaction.user.id, -betAmount, {
            type: "blackjack",
            action: "bet_placed",
            bet: betAmount,
            reason: "Blackjack bet placed",
        });

        // Initialize game
        const deck = shuffleDeck(createDeck());
        const game = {
            deck,
            playerHand: [deck.pop(), deck.pop()],
            dealerHand: [deck.pop(), deck.pop()],
            bet: betAmount,
            guildId: interaction.guildId,
            userId: interaction.user.id,
        };

        activeGames.set(gameId, game);

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

        // Set timeout to auto-forfeit after 2 minutes
        setTimeout(() => {
            if (activeGames.has(gameId)) {
                activeGames.delete(gameId);
            }
        }, 120000);
    },
};

// Handle button interactions (this needs to be registered in interactionCreate event)
async function handleBlackjackButton(interaction) {
    if (!interaction.customId.startsWith("blackjack_")) return false;

    const [, action, gameId] = interaction.customId.split("_");

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

            activeGames.delete(gameId);
            await interaction.update({ embeds: [embed], components: [] });

            addBalance(game.guildId, game.userId, 0, {
                type: "blackjack",
                action: "bust",
                bet: game.bet,
                reason: "Blackjack bust",
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

            addBalance(game.guildId, game.userId, 0, {
                type: "blackjack",
                action: "loss",
                bet: game.bet,
                reason: "Blackjack loss",
            });
        }

        const newBalance = getBalance(game.guildId, game.userId);
        const embed = createGameEmbed(game, config, interaction.guild?.name || "Unknown", true)
            .setColor(resultColor)
            .setDescription(resultMessage)
            .addFields({ name: "New Balance", value: formatCoins(newBalance, config.currencyName), inline: true });

        activeGames.delete(gameId);
        await interaction.update({ embeds: [embed], components: [] });
    }

    return true;
}

module.exports.handleBlackjackButton = handleBlackjackButton;
