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

// Active trivia games storage with file-based persistence
const activeGames = new Map();
const fs = require("fs").promises;
const path = require("path");
const ACTIVE_GAMES_FILE = path.join(__dirname, "../../data/active_trivia_games.json");

// Write queue to prevent concurrent writes
let writeQueue = Promise.resolve();
let pendingWrite = null;
let writeTimeoutId = null;

// Debounced save function - coalesces multiple saves
function saveActiveGames() {
    // Clear any pending timeout
    if (writeTimeoutId) {
        clearTimeout(writeTimeoutId);
    }

    // Debounce writes by 100ms
    writeTimeoutId = setTimeout(() => {
        // Prepare data for persistence, excluding non-serializable properties
        const gamesToSave = {};
        for (const [gameId, game] of activeGames.entries()) {
            gamesToSave[gameId] = {
                question: game.question,
                bet: game.bet,
                guildId: game.guildId,
                userId: game.userId,
                expiresAt: game.expiresAt,
                // Exclude: interaction, timeoutHandle (not serializable)
            };
        }

        // Queue the write operation with atomic writes
        writeQueue = writeQueue
            .then(async () => {
                // Ensure directory exists
                const dir = path.dirname(ACTIVE_GAMES_FILE);
                await fs.mkdir(dir, { recursive: true });

                // Write to temp file
                const tempFile = ACTIVE_GAMES_FILE + '.tmp';
                await fs.writeFile(tempFile, JSON.stringify(gamesToSave, null, 2));

                // Atomic rename
                await fs.rename(tempFile, ACTIVE_GAMES_FILE);
            })
            .catch(error => {
                logger.error("Failed to save active trivia games", {
                    error: error.message,
                    stack: error.stack,
                    code: error.code,
                });
            });
    }, 100);
}

// Load active games from file on startup (async)
// NOTE: Restored games lack the interaction object, so timeout notifications cannot be sent
async function loadActiveGames() {
    try {
        // Check if file exists
        try {
            await fs.access(ACTIVE_GAMES_FILE);
        } catch {
            // File doesn't exist, that's okay
            return;
        }

        const data = await fs.readFile(ACTIVE_GAMES_FILE, "utf8");
        const games = JSON.parse(data);

        const now = Date.now();
        let restoredCount = 0;
        for (const [gameId, game] of Object.entries(games)) {
            // Check if game has expired
            if (game.expiresAt && game.expiresAt < now) {
                // Game expired, handle it
                logger.info("Removing expired trivia game on load", { gameId, expiresAt: game.expiresAt });
                continue;
            }

            activeGames.set(gameId, game);
            restoredCount++;

            // Recreate timeout if game hasn't expired
            // NOTE: game.interaction is not persisted, so timeout handler cannot send Discord notifications
            if (game.expiresAt) {
                const timeRemaining = Math.max(0, game.expiresAt - now);
                scheduleGameTimeout(gameId, game, timeRemaining);
            }
        }

        if (restoredCount > 0) {
            logger.info(`Loaded ${restoredCount} active trivia games (timeout notifications unavailable for restored games)`);
        }
    } catch (error) {
        logger.error("Failed to load active trivia games", { error });
    }
}

// Schedule a game timeout
// NOTE: Restored games lack game.interaction, so notification delivery will fail silently
function scheduleGameTimeout(gameId, game, timeoutMs) {
    const timeoutId = setTimeout(async () => {
        try {
            if (activeGames.has(gameId)) {
                await handleGameTimeout(gameId, game);
            }
        } catch (error) {
            logger.error("Error in trivia game timeout handler", {
                gameId,
                userId: game.userId,
                error,
            });
        }
    }, timeoutMs);

    // Store timeout ID on game object for cleanup
    game.timeoutHandle = timeoutId;
}

// Handle game timeout
// NOTE: game.interaction may be missing for restored games, preventing Discord notification
async function handleGameTimeout(gameId, game) {
    activeGames.delete(gameId);
    saveActiveGames();

    // Get fresh config for the timeout handler
    await initEconomy();
    const config = getEconomyConfig(game.guildId);

    // Try to update the interaction if we have it
    if (game.interaction) {
        try {
            const embed = new EmbedBuilder()
                .setColor("#e67e22")
                .setTitle("⏱️ Time's Up!")
                .setDescription(
                    `You didn't answer in time!\n\n` +
                    `**Correct Answer:** ${game.question.options[game.question.correctAnswer]}\n\n` +
                    `You lost ${formatCoins(game.bet, config.currencyName)}.`
                )
                .setFooter({ text: `Guild: ${game.interaction.guild?.name || "Unknown"}` })
                .setTimestamp();

            await game.interaction.editReply({ embeds: [embed], components: [] });
        } catch (error) {
            logger.warn("Failed to send trivia timeout notification", { gameId, error });
        }
    }

    logger.info("Trivia game timed out", { gameId, userId: game.userId });
}

// Load games on module initialization - store Promise for command handlers to await
const loadActiveGamesPromise = loadActiveGames().catch(error => {
    logger.error("Failed to initialize trivia games on startup", { error });
    // On error, promise resolves to undefined so awaiting handlers don't hang
});

// Trivia questions database
const triviaQuestions = [
    // Easy (2x multiplier)
    {
        difficulty: "Easy",
        multiplier: 2,
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: 2,
    },
    {
        difficulty: "Easy",
        multiplier: 2,
        question: "How many continents are there?",
        options: ["5", "6", "7", "8"],
        correctAnswer: 2,
    },
    {
        difficulty: "Easy",
        multiplier: 2,
        question: "What color are emeralds?",
        options: ["Red", "Blue", "Green", "Yellow"],
        correctAnswer: 2,
    },
    {
        difficulty: "Easy",
        multiplier: 2,
        question: "How many legs does a spider have?",
        options: ["6", "8", "10", "12"],
        correctAnswer: 1,
    },
    // Medium (3x multiplier)
    {
        difficulty: "Medium",
        multiplier: 3,
        question: "In what year did World War II end?",
        options: ["1943", "1944", "1945", "1946"],
        correctAnswer: 2,
    },
    {
        difficulty: "Medium",
        multiplier: 3,
        question: "What is the largest planet in our solar system?",
        options: ["Saturn", "Jupiter", "Neptune", "Uranus"],
        correctAnswer: 1,
    },
    {
        difficulty: "Medium",
        multiplier: 3,
        question: "Who painted the Mona Lisa?",
        options: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Donatello"],
        correctAnswer: 2,
    },
    {
        difficulty: "Medium",
        multiplier: 3,
        question: "What is the chemical symbol for gold?",
        options: ["Go", "Gd", "Au", "Ag"],
        correctAnswer: 2,
    },
    // Hard (5x multiplier)
    {
        difficulty: "Hard",
        multiplier: 5,
        question: "What is the smallest country in the world?",
        options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"],
        correctAnswer: 1,
    },
    {
        difficulty: "Hard",
        multiplier: 5,
        question: "In what year was the first iPhone released?",
        options: ["2005", "2006", "2007", "2008"],
        correctAnswer: 2,
    },
    {
        difficulty: "Hard",
        multiplier: 5,
        question: "What is the longest river in the world?",
        options: ["Amazon", "Nile", "Yangtze", "Mississippi"],
        correctAnswer: 1,
    },
    {
        difficulty: "Hard",
        multiplier: 5,
        question: "How many bones are in the adult human body?",
        options: ["196", "206", "216", "226"],
        correctAnswer: 1,
    },
];

function getRandomQuestion() {
    return triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
}

function createQuestionEmbed(game, config, guildName) {
    const question = game.question;

    const embed = new EmbedBuilder()
        .setColor(ECONOMY_EMBED_COLOR)
        .setTitle("🧠 Trivia Bet")
        .setDescription(
            `**Difficulty:** ${question.difficulty}\n` +
            `**Multiplier:** ${question.multiplier}x\n` +
            `**Bet Amount:** ${formatCoins(game.bet, config.currencyName)}\n` +
            `**Potential Win:** ${formatCoins(game.bet * question.multiplier, config.currencyName)}\n\n` +
            `**Question:**\n${question.question}`
        )
        .addFields({
            name: "⏱️ Time Limit",
            value: "30 seconds",
            inline: true,
        })
        .setFooter({ text: `Guild: ${guildName}` })
        .setTimestamp();

    return embed;
}

const data = new SlashCommandBuilder()
    .setName("triviabet")
    .setDescription("Bet on your trivia knowledge - higher difficulty, higher rewards!")
    .addIntegerOption(option =>
        option
            .setName("amount")
            .setDescription("Amount to bet")
            .setRequired(true)
            .setMinValue(1)
    )
    .addStringOption(option =>
        option
            .setName("difficulty")
            .setDescription("Question difficulty (affects multiplier)")
            .setRequired(false)
            .addChoices(
                { name: "Easy (2x payout)", value: "Easy" },
                { name: "Medium (3x payout)", value: "Medium" },
                { name: "Hard (5x payout)", value: "Hard" },
                { name: "Random", value: "Random" }
            )
    );

async function execute(interaction) {
    const betAmount = interaction.options.getInteger("amount");
    const difficultyChoice = interaction.options.getString("difficulty") || "Random";

    // Wait for games to load from disk
    await loadActiveGamesPromise;

    // Validate gambling command
    const config = await validateGamblingCommand(interaction, betAmount);
    if (!config) return;

    const gameId = `${interaction.guildId}-${interaction.user.id}`;

    // Check if user already has an active game
    if (activeGames.has(gameId)) {
        await interaction.reply({
            content: "You already have an active Trivia Bet game! Finish it first.",
            ephemeral: true,
        });
        return;
    }

    // Select question based on difficulty
    let question;
    if (difficultyChoice === "Random") {
        question = getRandomQuestion();
    } else {
        const filtered = triviaQuestions.filter(q => q.difficulty === difficultyChoice);
        // Handle empty filter by falling back to random question
        if (filtered.length === 0) {
            question = getRandomQuestion();
        } else {
            question = filtered[Math.floor(Math.random() * filtered.length)];
        }
    }

    try {
        // Deduct bet
        addBalance(interaction.guildId, interaction.user.id, -betAmount, {
            type: "triviabet",
            action: "bet_placed",
            bet: betAmount,
            difficulty: question.difficulty,
            reason: "Trivia Bet placed",
        });

        // Initialize game
        const game = {
            question: question,
            bet: betAmount,
            guildId: interaction.guildId,
            userId: interaction.user.id,
        };

        activeGames.set(gameId, game);
        saveActiveGames();

        // Create answer buttons
        const row = new ActionRowBuilder();
        for (let i = 0; i < game.question.options.length; i++) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`trivia_answer_${gameId}_${i}`)
                    .setLabel(game.question.options[i])
                    .setStyle(ButtonStyle.Primary)
            );
        }

        const embed = createQuestionEmbed(game, config, interaction.guild?.name || "Unknown");
        await interaction.reply({ embeds: [embed], components: [row] });

        // Set expiration timestamp and schedule timeout (30 seconds)
        game.expiresAt = Date.now() + 30000;
        game.interaction = interaction; // Store for timeout handler

        // Schedule timeout using helper function
        scheduleGameTimeout(gameId, game, 30000);
        saveActiveGames();
    } catch (error) {
        // Clean up partially created game
        if (activeGames.has(gameId)) {
            activeGames.delete(gameId);
            saveActiveGames();
        }

        // Refund bet on any error during game setup
        addBalance(interaction.guildId, interaction.user.id, betAmount, {
            type: "triviabet",
            action: "refund_on_error",
            bet: betAmount,
            reason: "Refund due to error during game initialization",
        });

        logger.error("Error initializing Trivia Bet game", {
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
async function handleTriviaBetButton(interaction) {
    if (!interaction.customId.startsWith("trivia_")) return false;

    const match = interaction.customId.match(/^trivia_answer_(.+)_(\d+)$/);

    if (!match) {
        logger.error("Invalid trivia customId format", {
            customId: interaction.customId,
            userId: interaction.user.id,
        });
        return false;
    }

    const gameId = match[1];
    const answerIndex = parseInt(match[2], 10);

    if (!activeGames.has(gameId)) {
        try {
            await interaction.update({
                content: "This trivia game has expired or already been completed.",
                components: [],
                embeds: [],
            });
        } catch (error) {
            logger.warn("Failed to update expired trivia game interaction", {
                gameId,
                error,
            });
        }
        return true;
    }

    const game = activeGames.get(gameId);

    // Verify it's the right player
    if (game.userId !== interaction.user.id) {
        try {
            await interaction.reply({
                content: "This isn't your trivia game!",
                ephemeral: true,
            });
        } catch (error) {
            logger.warn("Failed to send wrong player message", {
                gameId,
                userId: interaction.user.id,
                error,
            });
        }
        return true;
    }

    await initEconomy();
    const config = getEconomyConfig(game.guildId);

    const correct = answerIndex === game.question.correctAnswer;

    if (correct) {
        // Correct answer - award winnings
        const winnings = game.bet * game.question.multiplier;

        addBalance(game.guildId, game.userId, winnings, {
            type: "triviabet",
            action: "won",
            bet: game.bet,
            multiplier: game.question.multiplier,
            difficulty: game.question.difficulty,
            winnings,
            reason: "Trivia Bet - correct answer",
        });

        const newBalance = getBalance(game.guildId, game.userId);

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("✅ Correct!")
            .setDescription(
                `You answered correctly!\n\n` +
                `**Question:** ${game.question.question}\n` +
                `**Your Answer:** ${game.question.options[answerIndex]} ✓\n\n` +
                `**Difficulty:** ${game.question.difficulty}\n` +
                `**Multiplier:** ${game.question.multiplier}x\n` +
                `**Winnings:** ${formatCoins(winnings, config.currencyName)}`
            )
            .addFields({ name: "New Balance", value: formatCoins(newBalance, config.currencyName) })
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        if (game.timeoutHandle) clearTimeout(game.timeoutHandle);
        activeGames.delete(gameId);
        saveActiveGames();

        try {
            await interaction.update({ embeds: [embed], components: [] });
        } catch (error) {
            logger.warn("Failed to update trivia game with correct answer", {
                gameId,
                error,
            });
        }
    } else {
        // Wrong answer - lose bet (bet already deducted at game start)
        const embed = new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle("❌ Incorrect!")
            .setDescription(
                `Sorry, that's not correct.\n\n` +
                `**Question:** ${game.question.question}\n` +
                `**Your Answer:** ${game.question.options[answerIndex]} ✗\n` +
                `**Correct Answer:** ${game.question.options[game.question.correctAnswer]} ✓\n\n` +
                `You lost ${formatCoins(game.bet, config.currencyName)}.`
            )
            .addFields({
                name: "New Balance",
                value: formatCoins(getBalance(game.guildId, game.userId), config.currencyName)
            })
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        if (game.timeoutHandle) clearTimeout(game.timeoutHandle);
        activeGames.delete(gameId);
        saveActiveGames();

        try {
            await interaction.update({ embeds: [embed], components: [] });
        } catch (error) {
            logger.warn("Failed to update trivia game with wrong answer", {
                gameId,
                error,
            });
        }
    }

    return true;
}

module.exports = {
    data,
    execute,
    handleTriviaBetButton,
};
