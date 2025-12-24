const { SlashCommandBuilder } = require("discord.js");
const wait = require("node:timers/promises").setTimeout;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("reminder")
        .setDescription("Set a reminder for yourself")
        .addIntegerOption((option) =>
            option
                .setName("minutes")
                .setRequired(true)
                .setDescription("Minutes from now to send the reminder")
                .setMinValue(1)
                .setMaxValue(10080)
        )
        .addStringOption((option) =>
            option
                .setName("message")
                .setRequired(true)
                .setDescription("What you want to be reminded about")
        ),
    async execute(interaction) {
        const minutes = interaction.options.getInteger("minutes");
        const message = interaction.options.getString("message");
        const delayMs = minutes * 60000;
        const channelId = interaction.channelId;
        const user = interaction.user;

        await interaction.reply({
            content: `Okay! I'll remind you in ${minutes} minute(s).`,
            ephemeral: true,
        });

        await wait(delayMs);

        const reminderText = `⏰ Reminder: ${message}`;

        try {
            await user.send(reminderText);
        } catch (error) {
            try {
                const channel = await interaction.client.channels.fetch(channelId);
                if (channel) {
                    await channel.send({ content: `${user} ${reminderText}` });
                }
            } catch (channelError) {
                console.warn("Failed to send reminder", {
                    error: channelError,
                    userId: user.id,
                    channelId,
                });
            }
        }
    }
};
