const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    claimBeg,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");

function formatRelativeTimestamp(isoString) {
    if (!isoString) {
        return "soon";
    }

    const timestamp = Math.floor(new Date(isoString).getTime() / 1000);
    if (Number.isNaN(timestamp)) {
        return "soon";
    }

    return `<t:${timestamp}:R>`;
}

const begMessages = [
    "asked for spare change and someone helped you out",
    "held up a sign at an intersection",
    "played music on the street and collected tips",
    "asked strangers for help with food money",
    "performed street magic for donations",
    "sold handmade crafts on the sidewalk",
    "washed car windows at a stoplight",
    "busked with a guitar case open",
    "asked for donations outside a store",
    "collected recyclable bottles and cans",
    "offered to carry groceries for tips",
    "drew portraits on the street for money",
    "juggled in the town square for coins",
    "stood on a corner with a cardboard sign",
    "sang songs in the subway for spare change",
];

function getRandomBegMessage() {
    return begMessages[Math.floor(Math.random() * begMessages.length)];
}

const data = new SlashCommandBuilder()
    .setName("beg")
    .setDescription("Beg for currency");

async function execute(interaction) {
    if (!interaction.guildId) {
        await interaction.reply({
            content: "Begging is only available inside servers.",
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

    const result = claimBeg(interaction.guildId, interaction.user.id, new Date());

    if (!result.ok) {
        const embed = new EmbedBuilder()
            .setColor(ECONOMY_EMBED_COLOR)
            .setTitle("Beg Cooldown")
            .setDescription("People need a break! Try again later.")
            .addFields({
                name: "Next beg available",
                value: formatRelativeTimestamp(result.nextBegAt),
                inline: true,
            })
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const begMessage = getRandomBegMessage();

    const embed = new EmbedBuilder()
        .setColor(ECONOMY_EMBED_COLOR)
        .setTitle("🙏 Begging Successful!")
        .setDescription(`You ${begMessage} and received **${formatCoins(result.reward, config.currencyName)}**!`)
        .addFields(
            { name: "New balance", value: formatCoins(result.balance, config.currencyName), inline: true },
            { name: "Next beg", value: formatRelativeTimestamp(result.nextBegAt), inline: true }
        )
        .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

module.exports = {
    data,
    execute,
};
