const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const {
  getUserData,
  getUserRank,
  getXpForNextLevel,
  initXP,
} = require('../../utils/xp');
const { generateRankCard } = require('../../utils/rankCard');
const logger = require('../../utils/logger');

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

    await interaction.deferReply();

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

    try {
      // Generate rank card image
      const cardBuffer = await generateRankCard({
        username: targetUser.username,
        avatarURL: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
        level: userData.level,
        rank: rank || 0,
        currentXP: xpInCurrentLevel,
        requiredXP: xpNeededForLevel,
        totalXP: userData.totalXp,
        accentColor: '#5865F2',
      });

      const attachment = new AttachmentBuilder(cardBuffer, { name: 'rank-card.png' });

      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      logger.error('Error generating rank card', {
        guildId: interaction.guildId,
        userId: targetUser.id,
        error,
      });

      // Fallback to text-based response if image generation fails
      await interaction.editReply({
        content: `**${targetUser.username}'s Rank**\n` +
                 `Level: **${userData.level}**\n` +
                 `Rank: ${rank ? `#${rank}` : 'Unranked'}\n` +
                 `Total XP: ${userData.totalXp.toLocaleString()}\n` +
                 `Progress: ${xpInCurrentLevel.toLocaleString()} / ${xpNeededForLevel.toLocaleString()} XP`,
      });
    }
  },
};
