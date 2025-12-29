const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserStreak, getTodayDateString } = require('../../utils/quests');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('streak')
    .setDescription('Check your quest streak stats')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to check (defaults to you)')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Streaks are only available in servers.',
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser('user') || interaction.user;
    const streakData = getUserStreak(interaction.guildId, target.id);
    const today = getTodayDateString();
    const hasQuestToday = streakData.lastQuestDate === today;

    let statusMsg;
    if (streakData.totalQuests === 0) {
      statusMsg = "hasn't done a quest yet. Shocking.";
    } else if (hasQuestToday) {
      statusMsg = 'completed today\'s quest. Predictable.';
    } else {
      statusMsg = 'hasn\'t completed today\'s quest yet.';
    }

    const embed = new EmbedBuilder()
      .setColor('#6b7280')
      .setTitle('Quest Streak')
      .setDescription(`**${target.username}** ${statusMsg}`)
      .addFields(
        { name: 'Current Streak', value: `${streakData.currentStreak} day${streakData.currentStreak === 1 ? '' : 's'}`, inline: true },
        { name: 'Best Streak', value: `${streakData.bestStreak} day${streakData.bestStreak === 1 ? '' : 's'}`, inline: true },
        { name: 'Total Quests', value: `${streakData.totalQuests}`, inline: true }
      )
      .setFooter({ text: 'Use /quest to continue your streak' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
