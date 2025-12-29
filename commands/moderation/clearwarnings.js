const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { clearWarnings, getWarnings, addLog } = require('../../utils/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Clear all warnings for a member')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to clear warnings for')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for clearing warnings')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Runtime permission check
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.editReply('You do not have permission to clear warnings.');
      return;
    }

    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) {
      await interaction.editReply('User not found.');
      return;
    }

    const warnings = getWarnings(interaction.guildId, target.id);
    const warningCount = warnings.length;

    if (warningCount === 0) {
      await interaction.editReply(`${target.tag} has no warnings to clear.`);
      return;
    }

    try {
      // Clear warnings
      await clearWarnings(interaction.guildId, target.id);
    } catch (error) {
      console.error('Error clearing warnings:', error);
      await interaction.editReply('Failed to clear warnings. The changes may not have been saved.');
      return;
    }

    // Log the action (non-blocking)
    addLog(interaction.guildId, {
      type: 'clearwarnings',
      action: 'Warnings Cleared',
      targetId: target.id,
      targetTag: target.tag,
      moderatorId: interaction.user.id,
      moderatorTag: interaction.user.tag,
      clearedCount: warningCount,
      reason,
    });

    await interaction.editReply(`Successfully cleared ${warningCount} warning(s) for ${target.tag}\nReason: ${reason}`);
  },
};
