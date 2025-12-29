const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getCase, updateCaseReason, deleteCase } = require('../../utils/moderation');

function formatDuration(duration) {
  if (duration === null || duration === undefined) {
    return null;
  }

  if (typeof duration === 'string') {
    return duration;
  }

  const totalSeconds = Math.floor(duration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function formatActionLabel(caseEntry) {
  if (caseEntry.action) {
    return caseEntry.action;
  }

  if (!caseEntry.actionType) {
    return 'Case';
  }

  return caseEntry.actionType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildCaseEmbed(caseEntry) {
  const embed = new EmbedBuilder()
    .setColor('#5865f2')
    .setTitle(`Case #${caseEntry.caseId}`)
    .addFields({ name: 'Action', value: formatActionLabel(caseEntry), inline: true });

  embed.addFields({
    name: 'Moderator',
    value: caseEntry.moderatorId ? `<@${caseEntry.moderatorId}>` : 'Unknown',
    inline: true,
  });

  embed.addFields({
    name: 'User',
    value: caseEntry.targetUserId ? `<@${caseEntry.targetUserId}>` : 'Unknown',
    inline: true,
  });

  embed.addFields({
    name: 'Reason',
    value: caseEntry.reason || 'No reason provided',
  });

  const duration = formatDuration(caseEntry.duration);
  if (duration) {
    embed.addFields({ name: 'Duration', value: duration, inline: true });
  }

  if (caseEntry.timestamp) {
    embed.setTimestamp(new Date(caseEntry.timestamp));
  }

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('Manage moderation cases')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View a moderation case')
        .addIntegerOption(option =>
          option
            .setName('caseid')
            .setDescription('The case ID to view')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit the reason for a case')
        .addIntegerOption(option =>
          option
            .setName('caseid')
            .setDescription('The case ID to edit')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('The new reason for this case')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('delete')
        .setDescription('Delete a case')
        .addIntegerOption(option =>
          option
            .setName('caseid')
            .setDescription('The case ID to delete')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    const caseId = interaction.options.getInteger('caseid');

    if (subcommand === 'view') {
      const caseEntry = getCase(interaction.guildId, caseId);
      if (!caseEntry) {
        await interaction.editReply(`No case found with ID ${caseId}.`);
        return;
      }

      await interaction.editReply({ embeds: [buildCaseEmbed(caseEntry)] });
      return;
    }

    if (subcommand === 'edit') {
      const reason = interaction.options.getString('reason');
      const updatedCase = updateCaseReason(interaction.guildId, caseId, reason);

      if (!updatedCase) {
        await interaction.editReply(`No case found with ID ${caseId}.`);
        return;
      }

      await interaction.editReply({
        content: `Updated case #${caseId}.`,
        embeds: [buildCaseEmbed(updatedCase)],
      });
      return;
    }

    if (subcommand === 'delete') {
      const deleted = deleteCase(interaction.guildId, caseId);
      if (!deleted) {
        await interaction.editReply(`No case found with ID ${caseId}.`);
        return;
      }

      await interaction.editReply(`Case #${caseId} has been deleted.`);
    }
  },
};
