const { SlashCommandBuilder } = require("discord.js");
const { createReminder, scheduleReminder } = require("../../utils/reminders");

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
        const scheduledAt = new Date(Date.now() + minutes * 60000).toISOString();
        const unit = minutes === 1 ? "minute" : "minutes";

        const reminder = createReminder({
            userId: interaction.user.id,
            channelId: interaction.channelId,
            message,
            scheduledAt,
        });

        scheduleReminder(reminder, interaction.client);

        await interaction.reply({
            content: `Okay! I'll remind you in ${minutes} ${unit}. (ID: ${reminder.id})`,
            ephemeral: true,
        });
    }
};
