const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");
const { checkCooldown, setCooldown } = require("../../utils/cooldowns");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("insult")
        .setDescription("Get gud Noob")
        .addUserOption((option) =>
            option.setName("user").setDescription("Let's insult somebody...")
        ),
    async execute(interaction) {
        const cooldown = checkCooldown(interaction.user.id, "insult", 5000);
        if (cooldown.onCooldown) {
            await interaction.reply({
                content: `Wait ${cooldown.remainingTime}s.`,
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();

        try {
            const response = await request('https://evilinsult.com/generate_insult.php?lang=en&type=json', {
                signal: AbortSignal.timeout(5000)
            });
            const data = await response.body.json();
            const { insult } = data;

            const message = await interaction.editReply(
                `${
                    interaction.options.getUser("user") ?? interaction.user
                } ${insult}`
            );
            message.react("🔥");
            setCooldown(interaction.user.id, "insult", 5000);
        } catch (error) {
            console.error('Error fetching insult:', error);
            await interaction.editReply("Failed to fetch insult.");
        }
    },
};
