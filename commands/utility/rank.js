const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  getUserData,
  getUserRank,
  getXpForNextLevel,
  initXP,
} = require('../../utils/xp');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your XP and level')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('User to check (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    await initXP();

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const userData = getUserData(
      interaction.guildId,
      targetUser.id,
      targetUser.username
    );
    const rank = getUserRank(interaction.guildId, targetUser.id);

    // Calculate XP progress to next level
    const currentLevelXp = getXpForNextLevel(userData.level - 1);
    const nextLevelXp = getXpForNextLevel(userData.level);
    const xpInCurrentLevel = userData.totalXp - currentLevelXp;
    const xpNeededForLevel = nextLevelXp - currentLevelXp;
    const progressPercentage = Math.floor(
      (xpInCurrentLevel / xpNeededForLevel) * 100
    );

    // Create progress bar
    const barLength = 20;
    const filledBars = Math.floor((xpInCurrentLevel / xpNeededForLevel) * barLength);
    const emptyBars = barLength - filledBars;
    const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${targetUser.username}'s Rank`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: 'Level',
          value: `**${userData.level}**`,
          inline: true,
        },
        {
          name: 'Rank',
          value: rank ? `#${rank}` : 'Unranked',
          inline: true,
        },
        {
          name: 'Total XP',
          value: `${userData.totalXp.toLocaleString()}`,
          inline: true,
        },
        {
          name: 'Progress to Next Level',
          value: `${progressBar}\n${xpInCurrentLevel.toLocaleString()} / ${xpNeededForLevel.toLocaleString()} XP (${progressPercentage}%)`,
          inline: false,
        }
      )
      .setFooter({
        text: `${userData.messageCount || 0} messages sent`,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
