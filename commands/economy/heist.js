const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
    getBalance,
    addBalance,
    getEconomyConfig,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    initEconomy,
} = require("../../utils/economy");
const logger = require("../../utils/logger");

// Active heists storage (in-memory, resets on bot restart)
const activeHeists = new Map();

const data = new SlashCommandBuilder()
    .setName("heist")
    .setDescription("Start or join a group heist - succeed together or fail together!")
    .addIntegerOption(option =>
        option
            .setName("amount")
            .setDescription("Amount to contribute to the heist")
            .setRequired(true)
            .setMinValue(1)
    );

async function execute(interaction) {
    if (!interaction.guildId) {
        await interaction.reply({
            content: "Heists are only available inside servers.",
            ephemeral: true,
        });
        return;
    }

    await initEconomy();
    const config = getEconomyConfig(interaction.guildId);

    if (!config.enabled) {
        await interaction.reply({
            content: "The economy system is disabled in this server.",
            ephemeral: true,
        });
        return;
    }

    const betAmount = interaction.options.getInteger("amount");
    const userId = interaction.user.id;
    const heistId = `${interaction.guildId}-heist`;

    // Check if user has enough balance
    const userBalance = getBalance(interaction.guildId, userId);
    if (userBalance < betAmount) {
        await interaction.reply({
            content: `You don't have enough ${config.currencyName}! You need ${formatCoins(betAmount, config.currencyName)} but only have ${formatCoins(userBalance, config.currencyName)}.`,
            ephemeral: true,
        });
        return;
    }

    // Check if there's an active heist
    if (activeHeists.has(heistId)) {
        const heist = activeHeists.get(heistId);

        // Check if user already joined
        if (heist.participants.some(p => p.userId === userId)) {
            await interaction.reply({
                content: "You've already joined this heist!",
                ephemeral: true,
            });
            return;
        }

        // Join existing heist
        heist.participants.push({
            userId: userId,
            username: interaction.user.username,
            bet: betAmount,
        });

        heist.totalPot += betAmount;

        // Deduct bet from user
        addBalance(interaction.guildId, userId, -betAmount, {
            type: "heist",
            action: "joined",
            bet: betAmount,
            reason: "Joined heist",
        });

        // Update the original message
        try {
            const updatedEmbed = createHeistEmbed(heist, config, interaction.guild?.name || "Unknown", false);
            const row = createHeistButtons(heistId);
            await interaction.channel.messages.fetch(heist.messageId).then(msg => {
                msg.edit({ embeds: [updatedEmbed], components: [row] });
            });
        } catch (error) {
            logger.warn("Failed to update heist message", { heistId, error });
        }

        await interaction.reply({
            content: `You've joined the heist with ${formatCoins(betAmount, config.currencyName)}! Total participants: **${heist.participants.length}**`,
            ephemeral: true,
        });
        return;
    }

    // Create new heist
    const heist = {
        organizerId: userId,
        organizerUsername: interaction.user.username,
        participants: [{
            userId: userId,
            username: interaction.user.username,
            bet: betAmount,
        }],
        totalPot: betAmount,
        guildId: interaction.guildId,
        startedAt: Date.now(),
    };

    // Deduct bet from organizer
    addBalance(interaction.guildId, userId, -betAmount, {
        type: "heist",
        action: "started",
        bet: betAmount,
        reason: "Started heist",
    });

    activeHeists.set(heistId, heist);

    const embed = createHeistEmbed(heist, config, interaction.guild?.name || "Unknown", false);
    const row = createHeistButtons(heistId);

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    heist.messageId = message.id;

    // Auto-start heist after 30 seconds
    heist.timeoutId = setTimeout(async () => {
        if (activeHeists.has(heistId)) {
            await executeHeist(heistId, interaction);
        }
    }, 30000);
}

function createHeistEmbed(heist, config, guildName, completed, success = false) {
    if (!completed) {
        const participantList = heist.participants
            .map(p => `• ${p.username}: ${formatCoins(p.bet, config.currencyName)}`)
            .join('\n');

        return new EmbedBuilder()
            .setColor("#e67e22")
            .setTitle("🏦 Heist in Progress!")
            .setDescription(
                `**Organizer:** ${heist.organizerUsername}\n\n` +
                `A heist is being planned! Join now or start the heist!\n\n` +
                `**Participants (${heist.participants.length}):**\n${participantList}\n\n` +
                `**Total Pot:** ${formatCoins(heist.totalPot, config.currencyName)}\n` +
                `**Potential Payout:** ${formatCoins(Math.floor(heist.totalPot * 2.5), config.currencyName)}`
            )
            .setFooter({ text: `Guild: ${guildName} | Auto-starts in 30s` })
            .setTimestamp();
    }

    // Completed heist
    if (success) {
        const payout = Math.floor(heist.totalPot * 2.5);
        const perPersonPayout = Math.floor(payout / heist.participants.length);

        return new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("🎉 Heist Successful!")
            .setDescription(
                `The crew pulled off the heist!\n\n` +
                `**Total Pot:** ${formatCoins(heist.totalPot, config.currencyName)}\n` +
                `**Total Payout:** ${formatCoins(payout, config.currencyName)}\n` +
                `**Per Person:** ${formatCoins(perPersonPayout, config.currencyName)}\n\n` +
                `**${heist.participants.length} participants** walked away with the loot!`
            )
            .setFooter({ text: `Guild: ${guildName}` })
            .setTimestamp();
    }

    // Failed heist
    return new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("💥 Heist Failed!")
        .setDescription(
            `The crew got caught!\n\n` +
            `**Total Lost:** ${formatCoins(heist.totalPot, config.currencyName)}\n\n` +
            `All **${heist.participants.length} participants** lost their contributions.`
        )
        .setFooter({ text: `Guild: ${guildName}` })
        .setTimestamp();
}

function createHeistButtons(heistId) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`heist_start_${heistId}`)
                .setLabel("🚀 Start Heist Now")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`heist_cancel_${heistId}`)
                .setLabel("❌ Cancel")
                .setStyle(ButtonStyle.Secondary)
        );
}

async function executeHeist(heistId, interaction) {
    if (!activeHeists.has(heistId)) return;

    const heist = activeHeists.get(heistId);
    await initEconomy();
    const config = getEconomyConfig(heist.guildId);

    // Calculate success chance based on number of participants
    // More participants = higher chance (up to 80%)
    const baseChance = 0.40; // 40% base
    const bonusPerPerson = 0.08; // +8% per additional person
    const maxChance = 0.80; // Cap at 80%
    const successChance = Math.min(maxChance, baseChance + (heist.participants.length - 1) * bonusPerPerson);

    const success = Math.random() < successChance;

    if (success) {
        // Heist succeeded - distribute winnings
        const totalPayout = Math.floor(heist.totalPot * 2.5);
        const perPersonPayout = Math.floor(totalPayout / heist.participants.length);

        for (const participant of heist.participants) {
            addBalance(heist.guildId, participant.userId, perPersonPayout, {
                type: "heist",
                action: "success",
                bet: participant.bet,
                winnings: perPersonPayout,
                participants: heist.participants.length,
                reason: "Heist successful",
            });
        }

        const embed = createHeistEmbed(heist, config, interaction.guild?.name || "Unknown", true, true);

        try {
            if (heist.messageId) {
                await interaction.channel.messages.fetch(heist.messageId).then(msg => {
                    msg.edit({ embeds: [embed], components: [] });
                });
            }
        } catch (error) {
            logger.warn("Failed to update heist completion", { heistId, error });
        }
    } else {
        // Heist failed - everyone loses their bet
        const embed = createHeistEmbed(heist, config, interaction.guild?.name || "Unknown", true, false);

        try {
            if (heist.messageId) {
                await interaction.channel.messages.fetch(heist.messageId).then(msg => {
                    msg.edit({ embeds: [embed], components: [] });
                });
            }
        } catch (error) {
            logger.warn("Failed to update heist failure", { heistId, error });
        }
    }

    // Clear timeout and remove heist
    if (heist.timeoutId) clearTimeout(heist.timeoutId);
    activeHeists.delete(heistId);
}

// Handle button interactions
async function handleHeistButton(interaction) {
    if (!interaction.customId.startsWith("heist_")) return false;

    const match = interaction.customId.match(/^heist_(start|cancel)_(.+)$/);

    if (!match) {
        logger.error("Invalid heist customId format", {
            customId: interaction.customId,
            userId: interaction.user.id,
        });
        return false;
    }

    const action = match[1];
    const heistId = match[2];

    if (!activeHeists.has(heistId)) {
        await interaction.update({
            content: "This heist has already been completed or cancelled.",
            components: [],
            embeds: [],
        });
        return true;
    }

    const heist = activeHeists.get(heistId);

    // Only organizer can start or cancel
    if (heist.organizerId !== interaction.user.id) {
        await interaction.reply({
            content: "Only the heist organizer can start or cancel the heist!",
            ephemeral: true,
        });
        return true;
    }

    if (action === "cancel") {
        // Refund all participants
        await initEconomy();
        for (const participant of heist.participants) {
            addBalance(heist.guildId, participant.userId, participant.bet, {
                type: "heist",
                action: "cancelled_refund",
                bet: participant.bet,
                reason: "Heist cancelled - refunded",
            });
        }

        const config = getEconomyConfig(heist.guildId);
        const embed = new EmbedBuilder()
            .setColor("#95a5a6")
            .setTitle("❌ Heist Cancelled")
            .setDescription(`The heist was cancelled. All ${formatCoins(heist.totalPot, config.currencyName)} has been refunded to participants.`)
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        if (heist.timeoutId) clearTimeout(heist.timeoutId);
        activeHeists.delete(heistId);

        await interaction.update({ embeds: [embed], components: [] });
        return true;
    }

    if (action === "start") {
        // Start the heist immediately
        if (heist.timeoutId) clearTimeout(heist.timeoutId);
        await interaction.deferUpdate();
        await executeHeist(heistId, interaction);
        return true;
    }

    return true;
}

module.exports = {
    data,
    execute,
    handleHeistButton,
};
