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

// Active trivia games storage (in-memory, resets on bot restart)
const activeGames = new Map();

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
        question = filtered[Math.floor(Math.random() * filtered.length)];
    }

    // Deduct bet immediately
    addBalance(interaction.guildId, interaction.user.id, -betAmount, {
        type: "triviabet",
        action: "bet_placed",
        bet: betAmount,
        difficulty: question.difficulty,
        reason: "Trivia Bet placed",
    });

    try {
        // Initialize game
        const game = {
            question: question,
            bet: betAmount,
            guildId: interaction.guildId,
            userId: interaction.user.id,
        };

        activeGames.set(gameId, game);

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

        // Set timeout for unanswered question (30 seconds)
        const timeoutId = setTimeout(async () => {
            if (activeGames.has(gameId)) {
                const expiredGame = activeGames.get(gameId);
                activeGames.delete(gameId);

                // Log loss (bet already deducted)
                logTransaction(expiredGame.guildId, {
                    userId: expiredGame.userId,
                    amount: -expiredGame.bet,
                    balanceAfter: getBalance(expiredGame.guildId, expiredGame.userId),
                    type: "triviabet",
                    action: "timeout",
                    reason: "Trivia Bet - timeout",
                    metadata: { bet: expiredGame.bet },
                });

                try {
                    const embed = new EmbedBuilder()
                        .setColor("#e67e22")
                        .setTitle("⏱️ Time's Up!")
                        .setDescription(
                            `You didn't answer in time!\n\n` +
                            `**Correct Answer:** ${expiredGame.question.options[expiredGame.question.correctAnswer]}\n\n` +
                            `You lost ${formatCoins(expiredGame.bet, config.currencyName)}.`
                        )
                        .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed], components: [] });
                } catch (error) {
                    logger.warn("Failed to send trivia timeout notification", {
                        gameId,
                        error,
                    });
                }
            }
        }, 30000);

        game.timeoutId = timeoutId;
    } catch (error) {
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
    const answerIndex = parseInt(match[2]);

    if (!activeGames.has(gameId)) {
        await interaction.update({
            content: "This trivia game has expired or already been completed.",
            components: [],
            embeds: [],
        });
        return true;
    }

    const game = activeGames.get(gameId);

    // Verify it's the right player
    if (game.userId !== interaction.user.id) {
        await interaction.reply({
            content: "This isn't your trivia game!",
            ephemeral: true,
        });
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

        if (game.timeoutId) clearTimeout(game.timeoutId);
        activeGames.delete(gameId);
        await interaction.update({ embeds: [embed], components: [] });
    } else {
        // Wrong answer - lose bet
        logTransaction(game.guildId, {
            userId: game.userId,
            amount: -game.bet,
            balanceAfter: getBalance(game.guildId, game.userId),
            type: "triviabet",
            action: "lost",
            reason: "Trivia Bet - wrong answer",
            metadata: {
                bet: game.bet,
                difficulty: game.question.difficulty,
            },
        });

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

        if (game.timeoutId) clearTimeout(game.timeoutId);
        activeGames.delete(gameId);
        await interaction.update({ embeds: [embed], components: [] });
    }

    return true;
}

module.exports = {
    data,
    execute,
    handleTriviaBetButton,
};
