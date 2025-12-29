const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserAchievements } = require('../../utils/achievements');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View anti-achievements for this server')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('User to check (defaults to you)')
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'Achievements are only available in servers.',
        ephemeral: true,
      });
      return;
    }

    const target = interaction.options.getUser('user') || interaction.user;
    const data = getUserAchievements(interaction.guildId, target.id, target.username);

    const embed = new EmbedBuilder()
      .setColor('#6b7280')
      .setTitle(`Anti-Achievements: ${target.username}`)
      .setDescription(
        `Progress: ${data.progress}\n` +
        `Commands used: ${data.stats.commandsUsed || 0}\n` +
        `Member since: <t:${Math.floor(new Date(data.stats.firstSeen).getTime() / 1000)}:R>`
      );

    // Show unlocked achievements
    if (data.unlocked.length > 0) {
      const unlockedText = data.unlocked
        .map(a => `${a.emoji} **${a.name}** - ${a.description}`)
        .join('\n');

      embed.addFields({
        name: `Unlocked (${data.unlocked.length})`,
        value: unlockedText || 'None yet.',
        inline: false,
      });
    }

    // Show next few locked achievements
    if (data.locked.length > 0) {
      const lockedText = data.locked
        .slice(0, 5)
        .map(a => `🔒 **${a.name}** - ${a.description}`)
        .join('\n');

      embed.addFields({
        name: `Locked (${data.locked.length} remaining)`,
        value: lockedText,
        inline: false,
      });
    }

    embed.setFooter({ text: 'Achievements unlock automatically. Unfortunately.' });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
