const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getWarnings } = require('../../utils/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a member')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to view warnings for')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Runtime permission check
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.editReply('You do not have permission to view warnings.');
      return;
    }

    const target = interaction.options.getUser('target');

    if (!target) {
      await interaction.editReply('User not found.');
      return;
    }

    const warnings = getWarnings(interaction.guildId, target.id);

    if (warnings.length === 0) {
      await interaction.editReply(`${target.tag} has no warnings.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle(`⚠️ Warnings for ${target.tag}`)
      .setDescription(`Total warnings: ${warnings.length}`)
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    // Add warnings (limit to last 10)
    const recentWarnings = warnings.slice(-10).reverse();
    for (const warning of recentWarnings) {
      const moderator = await interaction.client.users.fetch(warning.moderatorId).catch(() => null);
      const date = new Date(warning.timestamp).toLocaleString();

      embed.addFields({
        name: `Warning #${warnings.indexOf(warning) + 1} - ${date}`,
        value: `**Reason:** ${warning.reason}\n**Moderator:** ${moderator ? moderator.tag : 'Unknown'}`,
      });
    }

    if (warnings.length > 10) {
      embed.setFooter({ text: `Showing last 10 of ${warnings.length} warnings` });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
