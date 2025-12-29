const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getCasesByUser } = require('../../utils/moderation');
const { formatActionLabel } = require('../../utils/formatting');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cases')
    .setDescription('View moderation cases for a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to view cases for')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('user');
    const cases = getCasesByUser(interaction.guildId, user.id);

    if (cases.length === 0) {
      await interaction.editReply(`${user.tag} has no cases.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('#5865f2')
      .setTitle(`Cases for ${user.tag}`)
      .setDescription(`Total cases: ${cases.length}`)
      .setTimestamp();

    const displayCases = cases.slice(0, 10);
    for (const caseEntry of displayCases) {
      const timestamp = caseEntry.timestamp
        ? `<t:${Math.floor(new Date(caseEntry.timestamp).getTime() / 1000)}:f>`
        : 'Unknown date';

      const moderator = caseEntry.moderatorId ? `<@${caseEntry.moderatorId}>` : 'Unknown';
      const reason = caseEntry.reason || 'No reason provided';

      embed.addFields({
        name: `#${caseEntry.caseId} • ${formatActionLabel(caseEntry)}`,
        value: `**Moderator:** ${moderator}\n**Reason:** ${reason}\n**Date:** ${timestamp}`,
      });
    }

    if (cases.length > displayCases.length) {
      embed.setFooter({ text: `Showing ${displayCases.length} of ${cases.length} cases` });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
